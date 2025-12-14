import { db, type Prompt, type Category, type Tag } from '@/lib/db'

export interface NotionConfig {
  apiKey: string
  databaseId: string
}

export interface SyncResult {
  success: boolean
  message: string
  details?: {
    imported: number
    exported: number
    updated: number
  }
}

const NOTION_API_VERSION = '2022-06-28'
const NOTION_BASE_URL = 'https://api.notion.com/v1'

const normalizeDateString = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = '00'
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

const toNotionDateValue = (value: string) => {
  if (!value) return ''
  if (value.includes('T')) return value
  const normalized = normalizeDateString(value)
  const isoSource = normalized.replace(' ', 'T')
  const date = new Date(isoSource)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

/**
 * 格式化 Notion 的 Rich Text
 */
const formatRichText = (text: string) => {
  return [
    {
      text: {
        content: text || ''
      }
    }
  ]
}

/**
 * 解析 Notion 的 Rich Text
 */
const parseRichText = (richText: any[]) => {
  if (!richText || !Array.isArray(richText)) return ''
  return richText.map((t) => t.plain_text).join('')
}

/**
 * 解析 Notion 的 Multi-select
 */
const parseMultiSelect = (multiSelect: any[]) => {
  if (!multiSelect || !Array.isArray(multiSelect)) return []
  return multiSelect.map((t) => t.name)
}

/**
 * 验证 Notion 配置
 */
export const validateNotionConfig = (config: NotionConfig): boolean => {
  return (
    config.apiKey.trim().length > 0 &&
    config.databaseId.trim().length === 32
  )
}

/**
 * 获取 Notion 数据库内容
 */
export const fetchNotionDatabase = async (config: NotionConfig) => {
  const response = await fetch(`${NOTION_BASE_URL}/databases/${config.databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  if (!response.ok) {
    throw new Error(`Notion API Error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

type NotionPropertyRef = {
  key: string
  type: string
}

const promptToNotionProperties = (prompt: Prompt, categories: Category[], map: Record<string, NotionPropertyRef | undefined>) => {
  const category = categories.find(c => c.id === prompt.categoryId)

  const properties: any = {}

  if (map.title?.key) {
    properties[map.title.key] = {
      title: formatRichText(prompt.title)
    }
  }

  if (map.content?.key) {
    properties[map.content.key] = {
      rich_text: formatRichText(prompt.content)
    }
  }

  if (map.tags?.key) {
    properties[map.tags.key] = {
      multi_select: prompt.tags.map(tag => ({ name: tag }))
    }
  }

  if (map.category?.key) {
    properties[map.category.key] = {
      select: category ? { name: category.name } : null
    }
  }

  if (map.description?.key) {
    properties[map.description.key] = {
      rich_text: formatRichText(prompt.description)
    }
  }

  if (map.uuid?.key && map.uuid.type === 'rich_text') {
    properties[map.uuid.key] = {
      rich_text: formatRichText(prompt.id)
    }
  }

  if (map.createTime?.key) {
    let value = prompt.createTime || ''
    if (value === '无修改时间') {
      value = ''
    }
    if (map.createTime.type === 'date') {
      const start = toNotionDateValue(value)
      properties[map.createTime.key] = {
        date: start ? { start } : null
      }
    } else if (map.createTime.type === 'rich_text') {
      properties[map.createTime.key] = {
        rich_text: formatRichText(value)
      }
    }
  }

  if (map.lastModified?.key) {
    let value = prompt.lastModified || ''
    if (!value || value === '无修改时间') {
      value = prompt.createTime || ''
      if (value === '无修改时间') {
        value = ''
      }
    }
    if (map.lastModified.type === 'date') {
      const start = toNotionDateValue(value)
      properties[map.lastModified.key] = {
        date: start ? { start } : null
      }
    } else if (map.lastModified.type === 'rich_text') {
      properties[map.lastModified.key] = {
        rich_text: formatRichText(value)
      }
    }
  }

  if (map.author?.key && map.author.type === 'rich_text') {
    properties[map.author.key] = {
      rich_text: formatRichText(prompt.author || '')
    }
  }

  if (map.source?.key && map.source.type === 'rich_text') {
    properties[map.source.key] = {
      rich_text: formatRichText(prompt.source || '')
    }
  }

  if (map.isPinned?.key && map.isPinned.type === 'checkbox') {
    properties[map.isPinned.key] = {
      checkbox: !!prompt.isPinned
    }
  }

  if (map.enabled?.key && map.enabled.type === 'checkbox') {
    properties[map.enabled.key] = {
      checkbox: prompt.enabled !== false
    }
  }

  return properties
}

const notionPageToPrompt = (page: any, categories: Category[]): Partial<Prompt> & { categoryName?: string } => {
  const props = page.properties || {}

  const keys = Object.keys(props)

  const titleKey = keys.find(k => props[k].type === 'title')
  const contentKey = keys.find(k => props[k].type === 'rich_text' && k.toLowerCase() === 'content')
  const tagsKey = keys.find(k => props[k].type === 'multi_select' && k.toLowerCase() === 'tags')
  const categoryKey = keys.find(k => props[k].type === 'select' && k.toLowerCase() === 'category')
  const descriptionKey = keys.find(k => props[k].type === 'rich_text' && k.toLowerCase() === 'description')
  const uuidKey = keys.find(k => k.toLowerCase() === 'uuid')
  const createTimeDateKey = keys.find(k => props[k].type === 'date' && (k.toLowerCase().includes('create') || k.includes('创建')))
  const createTimeTextKey = keys.find(k => props[k].type === 'rich_text' && (k.toLowerCase() === 'createtime' || k.includes('创建时间')))
  const lastModifiedDateKey = keys.find(k => props[k].type === 'date' && (k.toLowerCase().includes('update') || k.includes('修改') || k.includes('更新')))
  const lastModifiedTextKey = keys.find(k => props[k].type === 'rich_text' && (k.toLowerCase() === 'lastmodified' || k.toLowerCase() === 'updatedat' || k.includes('修改时间') || k.includes('更新时间')))
  const isPinnedKey = keys.find(k => props[k].type === 'checkbox' && (k.toLowerCase() === 'ispinned' || k.toLowerCase() === 'pinned' || k.includes('置顶')))
  const enabledKey = keys.find(k => props[k].type === 'checkbox' && (k.toLowerCase() === 'enabled' || k.includes('启用')))
  const authorKey = keys.find(k => props[k].type === 'rich_text' && (k.toLowerCase() === 'author' || k.includes('作者')))
  const sourceKey = keys.find(k => props[k].type === 'rich_text' && (k.toLowerCase() === 'source' || k.includes('来源')))

  let title = titleKey ? parseRichText(props[titleKey]?.title) : ''
  const content = contentKey ? parseRichText(props[contentKey]?.rich_text) : ''
  const tags = tagsKey ? parseMultiSelect(props[tagsKey]?.multi_select) : []
  const categoryName = categoryKey ? props[categoryKey]?.select?.name : undefined
  const description = descriptionKey ? parseRichText(props[descriptionKey]?.rich_text) : ''
  const uuid = uuidKey ? parseRichText(props[uuidKey]?.rich_text) : ''

  const createTimeFromDate = createTimeDateKey ? props[createTimeDateKey]?.date?.start || '' : ''
  const createTimeFromText = createTimeTextKey ? parseRichText(props[createTimeTextKey]?.rich_text) : ''
  const lastModifiedFromDate = lastModifiedDateKey ? props[lastModifiedDateKey]?.date?.start || '' : ''
  const lastModifiedFromText = lastModifiedTextKey ? parseRichText(props[lastModifiedTextKey]?.rich_text) : ''

  const createTimeRaw = createTimeFromDate || createTimeFromText || page.created_time || ''
  const lastModifiedRaw = lastModifiedFromDate || lastModifiedFromText || page.last_edited_time || ''

  const createTimeText = normalizeDateString(createTimeRaw)
  const lastModifiedText = normalizeDateString(lastModifiedRaw)
  const isPinned = isPinnedKey ? !!props[isPinnedKey]?.checkbox : false
  const enabled = enabledKey ? props[enabledKey]?.checkbox !== false : true
  const author = authorKey ? parseRichText(props[authorKey]?.rich_text) : ''
  const source = sourceKey ? parseRichText(props[sourceKey]?.rich_text) : ''

  if (!title || !title.trim()) {
    title = '未命名提示词'
  }

  return {
    id: uuid || crypto.randomUUID(),
    title,
    content,
    tags,
    description,
    categoryName,
    createTime: createTimeText,
    lastModified: lastModifiedText,
    enabled,
    isPinned,
    author,
    source
  }
}

const fetchNotionDatabaseSchema = async (config: NotionConfig) => {
  const response = await fetch(`${NOTION_BASE_URL}/databases/${config.databaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Notion Schema API Error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

const ensureNotionProperties = async (config: NotionConfig, schema: any) => {
  const schemaProps = schema.properties || {}
  const schemaKeys = Object.keys(schemaProps)

  const propertiesToAdd: Record<string, any> = {}

  const hasProperty = (predicate: (key: string) => boolean) => {
    return schemaKeys.some(predicate)
  }

  const addIfMissing = (canonicalName: string, configObj: any, matcher: (key: string) => boolean) => {
    if (!hasProperty(matcher) && !schemaProps[canonicalName]) {
      propertiesToAdd[canonicalName] = configObj
    }
  }

  addIfMissing('Content', { rich_text: {} }, (k) => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'content' || k.includes('内容')))
  addIfMissing('Tags', { multi_select: {} }, (k) => schemaProps[k].type === 'multi_select' && (k.toLowerCase() === 'tags' || k.includes('标签')))
  addIfMissing('Category', { select: {} }, (k) => schemaProps[k].type === 'select' && (k.toLowerCase() === 'category' || k.includes('分类')))
  addIfMissing('Description', { rich_text: {} }, (k) => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'description' || k.includes('描述')))
  addIfMissing('UUID', { rich_text: {} }, (k) => k.toLowerCase() === 'uuid')
  addIfMissing(
    'CreateTime',
    { date: {} },
    (k) =>
      (schemaProps[k].type === 'date' || schemaProps[k].type === 'rich_text') &&
      (k.toLowerCase().includes('create') || k.includes('创建'))
  )
  addIfMissing(
    'LastModified',
    { date: {} },
    (k) =>
      (schemaProps[k].type === 'date' || schemaProps[k].type === 'rich_text') &&
      (k.toLowerCase().includes('update') || k.includes('修改') || k.includes('更新'))
  )
  addIfMissing(
    'Author',
    { rich_text: {} },
    (k) => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'author' || k.includes('作者'))
  )
  addIfMissing(
    'Source',
    { rich_text: {} },
    (k) => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'source' || k.includes('来源'))
  )
  addIfMissing(
    'IsPinned',
    { checkbox: {} },
    (k) =>
      schemaProps[k].type === 'checkbox' &&
      (k.toLowerCase() === 'ispinned' || k.toLowerCase() === 'pinned' || k.includes('置顶'))
  )
  addIfMissing(
    'Enabled',
    { checkbox: {} },
    (k) => schemaProps[k].type === 'checkbox' && (k.toLowerCase() === 'enabled' || k.includes('启用'))
  )

  const keysToAdd = Object.keys(propertiesToAdd)

  if (keysToAdd.length === 0) {
    return schema
  }

  const response = await fetch(`${NOTION_BASE_URL}/databases/${config.databaseId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: propertiesToAdd
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to update Notion database schema:', errorText)
    throw new Error(`Notion 数据库属性创建失败: ${response.status} ${response.statusText}`)
  }

  const updatedSchema = await fetchNotionDatabaseSchema(config)
  return updatedSchema
}

export const exportToNotion = async (config: NotionConfig): Promise<SyncResult> => {
  try {
    const [prompts, categories] = await Promise.all([
      db.prompts.toArray(),
      db.categories.toArray()
    ])

    let exportedCount = 0
    let updatedCount = 0

    let notionSchema = await fetchNotionDatabaseSchema(config)

    notionSchema = await ensureNotionProperties(config, notionSchema)

    const schemaProps = notionSchema.properties || {}
    const schemaKeys = Object.keys(schemaProps)

    const makeRef = (key?: string): NotionPropertyRef | undefined =>
      key ? { key, type: schemaProps[key].type } : undefined

    const findKey = (preferred: string, matcher: (key: string) => boolean) => {
      return schemaKeys.find(k => k === preferred) || schemaKeys.find(matcher)
    }

    const propertyMap: Record<string, NotionPropertyRef | undefined> = {
      title: undefined,
      content: undefined,
      tags: undefined,
      category: undefined,
      description: undefined,
      uuid: undefined,
      createTime: undefined,
      lastModified: undefined,
      isPinned: undefined,
      author: undefined,
      source: undefined,
      enabled: undefined
    }

    // 标题列（必须存在）
    propertyMap.title = makeRef(schemaKeys.find(k => schemaProps[k].type === 'title'))

    // 优先使用标准英文字段名（由 ensureNotionProperties 自动创建），找不到再回退到模糊匹配
    propertyMap.content = makeRef(
      findKey('Content', k => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'content' || k.includes('内容')))
    )

    propertyMap.tags = makeRef(
      findKey('Tags', k => schemaProps[k].type === 'multi_select' && (k.toLowerCase() === 'tags' || k.includes('标签')))
    )

    propertyMap.category = makeRef(
      findKey('Category', k => schemaProps[k].type === 'select' && (k.toLowerCase() === 'category' || k.includes('分类')))
    )

    propertyMap.description = makeRef(
      findKey(
        'Description',
        k => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'description' || k.includes('描述'))
      )
    )

    propertyMap.uuid = makeRef(
      findKey('UUID', k => k.toLowerCase() === 'uuid')
    )

    const createTimeDateKey = findKey(
      'CreateTime',
      k => schemaProps[k].type === 'date' && (k.toLowerCase().includes('create') || k.includes('创建'))
    )
    const createTimeTextKey = schemaKeys.find(
      k => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'createtime' || k.includes('创建时间'))
    )

    propertyMap.createTime = makeRef(createTimeDateKey || createTimeTextKey)

    const lastModifiedDateKey = findKey(
      'LastModified',
      k => schemaProps[k].type === 'date' && (k.toLowerCase().includes('update') || k.includes('修改') || k.includes('更新'))
    )
    const lastModifiedTextKey = schemaKeys.find(
      k =>
        schemaProps[k].type === 'rich_text' &&
        (k.toLowerCase() === 'lastmodified' ||
          k.toLowerCase() === 'updatedat' ||
          k.includes('修改时间') ||
          k.includes('更新时间'))
    )

    propertyMap.lastModified = makeRef(lastModifiedDateKey || lastModifiedTextKey)

    propertyMap.author = makeRef(
      findKey('Author', k => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'author' || k.includes('作者')))
    )

    propertyMap.source = makeRef(
      findKey('Source', k => schemaProps[k].type === 'rich_text' && (k.toLowerCase() === 'source' || k.includes('来源')))
    )

    propertyMap.isPinned = makeRef(
      findKey(
        'IsPinned',
        k =>
          schemaProps[k].type === 'checkbox' &&
          (k.toLowerCase() === 'ispinned' || k.toLowerCase() === 'pinned' || k.includes('置顶'))
      )
    )

    propertyMap.enabled = makeRef(
      findKey(
        'Enabled',
        k => schemaProps[k].type === 'checkbox' && (k.toLowerCase() === 'enabled' || k.includes('启用'))
      )
    )

    const titleKey = propertyMap.title?.key

    const notionData = await fetchNotionDatabase(config)
    const uuidMap = new Map<string, string>()
    const titleMap = new Map<string, string>()

    for (const page of notionData.results) {
      const props = page.properties
      const uuidKeyInPage = propertyMap.uuid?.key || Object.keys(props).find(k => k.toLowerCase() === 'uuid')
      const uuidInPage = uuidKeyInPage ? parseRichText(props[uuidKeyInPage]?.rich_text) : ''
      if (uuidInPage) {
        uuidMap.set(uuidInPage, page.id)
      }
      const titleKeyInPage = propertyMap.title?.key || Object.keys(props).find(k => props[k].type === 'title')
      if (titleKeyInPage) {
        const titleText = parseRichText(props[titleKeyInPage]?.title)
        if (titleText) {
          titleMap.set(titleText, page.id)
        }
      }
    }

    if (!titleKey) {
      throw new Error('Notion 数据库缺少标题属性')
    }

    for (const prompt of prompts) {
      const properties = promptToNotionProperties(prompt, categories, propertyMap)
      const existingPageId = uuidMap.get(prompt.id) || titleMap.get(prompt.title)

      if (existingPageId) {
        // 更新现有 Page
        await fetch(`${NOTION_BASE_URL}/pages/${existingPageId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Notion-Version': NOTION_API_VERSION,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ properties })
        }).then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text()
            console.error('Failed to update page:', errorText)
            throw new Error(`Failed to update page: ${res.status} ${res.statusText}`)
          }
        })
        updatedCount++
      } else {
        // 创建新 Page
        await fetch(`${NOTION_BASE_URL}/pages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Notion-Version': NOTION_API_VERSION,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: config.databaseId },
            properties
          })
        }).then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text()
            console.error('Failed to create page:', errorText)
            throw new Error(`Failed to create page: ${res.status} ${res.statusText}`)
          }
        })
        exportedCount++
      }
    }

    return {
      success: true,
      message: '导出成功',
      details: { imported: 0, exported: exportedCount, updated: updatedCount }
    }
  } catch (error: any) {
    console.error('Export to Notion failed:', error)
    return {
      success: false,
      message: error.message || '导出失败'
    }
  }
}

/**
 * 从 Notion 导入 (Notion -> Local)
 */
export const importFromNotion = async (config: NotionConfig): Promise<SyncResult> => {
  try {
    const notionData = await fetchNotionDatabase(config)
    const categories = await db.categories.toArray()

    const existingPrompts = await db.prompts.toArray()
    const usedTitles = new Set(existingPrompts.map(p => p.title))
    const promptsById = new Map(existingPrompts.map(p => [p.id, p]))
    const promptsByTitle = new Map(existingPrompts.map(p => [p.title, p]))

    let importedCount = 0

    await db.transaction('rw', db.prompts, db.categories, db.tags, async () => {
      for (const page of notionData.results) {
        const { categoryName, ...promptData } = notionPageToPrompt(page, categories)

        // 处理分类
        let categoryId = 'default'
        if (categoryName) {
          const existingCategory = categories.find(c => c.name === categoryName)
          if (existingCategory) {
            categoryId = existingCategory.id
          } else {
            // 创建新分类
            const newCategory: Category = {
              id: crypto.randomUUID(),
              name: categoryName,
              isDefault: false,
              createTime: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              enabled: true,
              color: 'bg-slate-400'
            }
            await db.categories.add(newCategory)
            categories.push(newCategory) // 更新缓存
            categoryId = newCategory.id
          }
        }

        const basePrompt = promptData as Prompt

        const prompt: Prompt = {
          ...basePrompt,
          categoryId,
          author: basePrompt.author || 'Notion Sync',
          source: basePrompt.source || 'Notion'
        }

        let baseTitle = (prompt.title || '').trim()
        if (!baseTitle) {
          baseTitle = '未命名提示词'
        }

        let target = promptsById.get(prompt.id)
        if (!target && baseTitle) {
          target = promptsByTitle.get(baseTitle)
        }

        let finalId = prompt.id
        let finalTitle = baseTitle

        if (target) {
          finalId = target.id

          if (target.title !== baseTitle && usedTitles.has(baseTitle)) {
            let suffix = 1
            let candidate = `${baseTitle} (${suffix})`
            while (usedTitles.has(candidate)) {
              suffix++
              candidate = `${baseTitle} (${suffix})`
            }
            finalTitle = candidate
          }

          const updated: Prompt = {
            ...target,
            ...prompt,
            id: finalId,
            title: finalTitle,
            categoryId
          }

          await db.prompts.put(updated)

          usedTitles.add(finalTitle)
          promptsById.set(finalId, updated)
          promptsByTitle.delete(target.title)
          promptsByTitle.set(finalTitle, updated)
        } else {
          let suffix = 1
          let candidate = finalTitle
          while (usedTitles.has(candidate)) {
            candidate = `${baseTitle} (${suffix})`
            suffix++
          }
          finalTitle = candidate

          const created: Prompt = {
            ...prompt,
            id: prompt.id,
            title: finalTitle
          }

          await db.prompts.put(created)

          usedTitles.add(finalTitle)
          promptsById.set(created.id, created)
          promptsByTitle.set(finalTitle, created)
        }

        importedCount++
      }
    })

    return {
      success: true,
      message: '导入成功',
      details: { imported: importedCount, exported: 0, updated: 0 }
    }
  } catch (error: any) {
    console.error('Import from Notion failed:', error)
    return {
      success: false,
      message: error.message || '导入失败'
    }
  }
}

/**
 * 双向同步 (Merge)
 * 简单策略：以 ID 为准，Notion 有本地没有则导入，本地有 Notion 没有则导出，都有则以 Notion 为准更新本地
 */
export const syncWithNotion = async (config: NotionConfig): Promise<SyncResult> => {
  try {
    // 先导出（确保本地新数据上去）
    const exportRes = await exportToNotion(config)
    if (!exportRes.success) throw new Error(exportRes.message)

    // 再导入（获取远端新数据）
    const importRes = await importFromNotion(config)
    if (!importRes.success) throw new Error(importRes.message)

    return {
      success: true,
      message: '同步完成',
      details: {
        imported: importRes.details?.imported || 0,
        exported: exportRes.details?.exported || 0,
        updated: exportRes.details?.updated || 0
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '同步失败'
    }
  }
}
