import { createClient, type WebDAVClient } from 'webdav'
import { db, type Prompt, type Category, type Tag } from '@/lib/db'

export interface WebDavConfig {
  url: string
  username: string
  password: string
  enabled: boolean
  maxBackups: number
}

const WEB_DAV_BACKUP_PREFIX = 'HandyPromptBackup-'
const WEB_DAV_BACKUP_SUFFIX = '.json'
const WEB_DAV_INDEX_FILE = 'HandyPromptBackupIndex.json'
const WEB_DAV_APP_DIR = '/HandyPrompt'

export const formatBackupTimestamp = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}${m}${d}-${h}${mi}${s}`
}

export const getWebDavClient = (config: WebDavConfig) => {
  return createClient(config.url.trim(), {
    username: config.username,
    password: config.password
  })
}

const getFilePath = (filename: string) => {
  return `${WEB_DAV_APP_DIR}/${filename}`
}

export const loadWebDavIndex = async (client: WebDAVClient): Promise<string[]> => {
  try {
    const indexPath = getFilePath(WEB_DAV_INDEX_FILE)
    if ((await client.exists(indexPath)) === false) {
      return []
    }
    const content = await client.getFileContents(indexPath, { format: 'text' })
    const json = JSON.parse(content as string)
    return Array.isArray(json) ? json : []
  } catch (e) {
    console.error('load index error', e)
    return []
  }
}

type RestorableNamedItem = {
  id: string
  name: string
  isDefault?: boolean
}

const mergeNamedItemsForRestore = <T extends RestorableNamedItem>(
  backupItems: T[],
  localDefault?: T
) => {
  const idMap = new Map<string, string>()
  const mergedByName = new Map<string, T>()

  const addOrMergeByName = (item: T, originalId: string) => {
    const existing = mergedByName.get(item.name)

    if (existing) {
      idMap.set(originalId, existing.id)
      mergedByName.set(item.name, {
        ...existing,
        ...item,
        id: existing.id,
        name: existing.name,
        isDefault: Boolean(existing.isDefault || item.isDefault),
      } as T)
      return
    }

    idMap.set(originalId, item.id)
    mergedByName.set(item.name, item)
  }

  for (const item of backupItems) {
    if (localDefault && (item.isDefault || item.name === localDefault.name)) {
      addOrMergeByName({
        ...localDefault,
        ...item,
        id: localDefault.id,
        name: localDefault.name,
        isDefault: true,
      } as T, item.id)
      continue
    }

    addOrMergeByName(item, item.id)
  }

  return {
    items: Array.from(mergedByName.values()),
    idMap,
  }
}

const saveWebDavIndex = async (client: WebDAVClient, files: string[]) => {
  const indexPath = getFilePath(WEB_DAV_INDEX_FILE)
  await client.putFileContents(indexPath, JSON.stringify(files))
}

export const backupToWebDav = async (config: WebDavConfig) => {
  const client = getWebDavClient(config)

  if (await client.exists(WEB_DAV_APP_DIR) === false) {
    await client.createDirectory(WEB_DAV_APP_DIR)
  }

  const [prompts, categories, tags] = await Promise.all([
    db.prompts.toArray(),
    db.categories.toArray(),
    db.tags.toArray(),
  ])
  const now = new Date()

  const payload = {
    meta: {
      version: '1.0',
      type: 'full-backup',
      exportedAt: now.toISOString(),
      app: 'Handy Prompt',
      counts: {
        prompts: prompts.length,
        categories: categories.length,
        tags: tags.length,
      },
    },
    data: {
      prompts,
      categories,
      tags,
    },
  }

  const timestamp = formatBackupTimestamp(now)
  const fileName = `${WEB_DAV_BACKUP_PREFIX}${timestamp}${WEB_DAV_BACKUP_SUFFIX}`
  const filePath = getFilePath(fileName)

  await client.putFileContents(filePath, JSON.stringify(payload, null, 2))

  // Rotate backups
  const maxBackups = Math.max(1, config.maxBackups || 30)
  try {
    const currentIndex = await loadWebDavIndex(client)
    const merged = [fileName, ...currentIndex.filter((name) => name !== fileName)]
    const nextIndex = merged.slice(0, maxBackups)

    const toDelete = currentIndex.filter((name) => !nextIndex.includes(name))
    for (const oldFile of toDelete) {
      const oldFilePath = getFilePath(oldFile)
      await client.deleteFile(oldFilePath).catch((error) => {
        console.error('delete old backup failed', error)
      })
    }

    await saveWebDavIndex(client, nextIndex)
    return { fileName, nextIndex }
  } catch (error) {
    console.error('update index failed', error)
    // Even if index update fails, backup itself succeeded
    return { fileName, nextIndex: [fileName] }
  }
}

export const restoreFromWebDav = async (config: WebDavConfig, fileName: string) => {
  const client = getWebDavClient(config)
  const filePath = getFilePath(fileName)
  
  const content = await client.getFileContents(filePath, { format: 'text' })
  const json = JSON.parse(content as string)

  if (
    !json ||
    !json.data ||
    !Array.isArray(json.data.prompts) ||
    !Array.isArray(json.data.categories) ||
    !Array.isArray(json.data.tags)
  ) {
    throw new Error('备份数据格式不正确')
  }

  const prompts = json.data.prompts as Prompt[]
  const categories = json.data.categories as Category[]
  const tags = json.data.tags as Tag[]

  await db.transaction('rw', db.prompts, db.categories, db.tags, async () => {
    const [localDefaultCategory, localDefaultTag] = await Promise.all([
      db.categories.filter(c => c.isDefault).first(),
      db.tags.filter(t => Boolean(t.isDefault)).first(),
    ])
    const { items: categoriesToRestore, idMap: categoryIdMap } = mergeNamedItemsForRestore(
      categories,
      localDefaultCategory
    )
    const { items: tagsToRestore } = mergeNamedItemsForRestore(tags, localDefaultTag)

    // Clear prompts - no hooks to worry about
    await db.prompts.clear()
    
    // For categories: delete only non-default items, then upsert from backup
    await db.categories.filter(c => !c.isDefault).delete()
    if (categoriesToRestore.length) {
      await db.categories.bulkPut(categoriesToRestore)
    }
    
    // For tags: delete only non-default items, then upsert from backup
    await db.tags.filter(t => !t.isDefault).delete()
    if (tagsToRestore.length) {
      await db.tags.bulkPut(tagsToRestore)
    }
    
    // Add prompts
    if (prompts.length) {
      const promptsToRestore = prompts.map(prompt => ({
        ...prompt,
        categoryId: categoryIdMap.get(prompt.categoryId) ?? prompt.categoryId,
      }))
      await db.prompts.bulkAdd(promptsToRestore)
    }
  })

  return {
    promptsCount: prompts.length,
    categoriesCount: categories.length,
    tagsCount: tags.length
  }
}

export const getBackupDisplayName = (fileName: string) => {
  return fileName
}
