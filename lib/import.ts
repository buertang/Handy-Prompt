import { db, type Prompt, type Category, type Tag } from '@/lib/db'
import { toast } from 'sonner'
import type { ExportData } from './export'

/**
 * 解析并导入 JSON 数据
 * @param jsonData 解析后的 JSON 对象
 * @param targetType 期望导入的数据类型
 */
export async function importData(jsonData: any, targetType: 'library' | 'categories' | 'tags') {
  try {
    // 简单的格式校验
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('无效的 JSON 数据')
    }

    // 兼容 ExportData 结构或直接数组结构
    let items: any[] = []
    
    // 如果是 ExportData 结构，进行严格校验
    if (!Array.isArray(jsonData) && jsonData.meta && jsonData.data) {
      // 1. 检查 meta.type 是否匹配
      if (jsonData.meta.type !== targetType) {
        throw new Error(`数据类型不匹配：当前正在导入 ${targetType}，但文件包含的是 ${jsonData.meta.type} 数据`)
      }
      items = jsonData.data
    } else if (Array.isArray(jsonData)) {
      // 2. 如果是纯数组，尝试通过字段特征检测类型
      items = jsonData
      if (items.length > 0) {
        const firstItem = items[0]
        if (targetType === 'library' && (!firstItem.title || !firstItem.content)) {
           // 可能是分类或标签数据
           if (firstItem.name && firstItem.color) throw new Error('检测到分类数据，请在分类管理页面导入')
           if (firstItem.name && !firstItem.color) throw new Error('检测到标签数据，请在标签管理页面导入')
           throw new Error('无效的提示词数据格式')
        }
        if (targetType === 'categories' && (!firstItem.name || !firstItem.color)) {
           if (firstItem.title) throw new Error('检测到提示词数据，请在提示词库页面导入')
           throw new Error('无效的分类数据格式')
        }
        if (targetType === 'tags' && (!firstItem.name || firstItem.color)) { // Tags usually don't have color, categories do
           if (firstItem.title) throw new Error('检测到提示词数据，请在提示词库页面导入')
           if (firstItem.color) throw new Error('检测到分类数据，请在分类管理页面导入')
        }
      }
    } else {
       throw new Error('无法识别的数据格式')
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('未找到有效的数据项')
    }

    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    let count = 0

    await db.transaction('rw', db.prompts, db.categories, db.tags, async () => {
      if (targetType === 'library') {
        for (const item of items) {
          // 确保必要字段存在
          if (!item.title || !item.content) continue
          
          // 如果 ID 冲突，生成新 ID (或者可以选择覆盖，这里选择作为新条目导入以防覆盖)
          // 考虑到用户可能想恢复备份，如果 ID 相同应该覆盖？
          // 策略：如果 ID 存在则更新，不存在则添加。但为了避免意外覆盖他人数据，
          // 这里采用：如果 ID 存在，提示跳过或覆盖？
          // 简化策略：使用 put 操作，存在即更新，不存在即创建。
          // 但为了安全，如果导入的是外部数据，最好重置 ID。
          // 假设是恢复备份 -> 保留 ID。假设是导入分享 -> 重置 ID。
          // 这里简化为：保留 ID (如果是备份恢复)，如果 ID 冲突则覆盖。
          
          // 修正：为了避免覆盖现有不相关数据，如果 ID 已存在，询问用户太复杂。
          // 策略：始终作为新数据导入 (重置 ID)，除非完全一致。
          // 实际上，为了方便，我们检查 ID 是否存在，存在则生成新 ID。
          const existing = await db.prompts.get(item.id || 'non-existent')
          const promptToSave: Prompt = {
            ...item,
            id: existing ? crypto.randomUUID() : (item.id || crypto.randomUUID()),
            createTime: item.createTime || now,
            lastModified: now,
            // 确保关联的分类 ID 有效，如果无效则设为默认分类？
            // 暂时保留原 ID，如果分类不存在，UI 会显示未知分类或需要处理
          }
          await db.prompts.add(promptToSave)
          count++
        }
      } else if (targetType === 'categories') {
        for (const item of items) {
          if (!item.name) continue
          const existing = await db.categories.get(item.id || 'non-existent')
          // 检查名称是否重复
          const nameConflict = await db.categories.where('name').equals(item.name).first()
          
          if (nameConflict) {
            // 名称冲突，跳过
            continue
          }

          const categoryToSave: Category = {
            ...item,
            id: existing ? crypto.randomUUID() : (item.id || crypto.randomUUID()),
            createTime: item.createTime || now,
            lastModified: now,
            isDefault: false // 导入的分类不应抢占默认状态
          }
          await db.categories.add(categoryToSave)
          count++
        }
      } else if (targetType === 'tags') {
        for (const item of items) {
          if (!item.name) continue
          const existing = await db.tags.get(item.id || 'non-existent')
          const nameConflict = await db.tags.where('name').equals(item.name).first()
          
          if (nameConflict) continue

          const tagToSave: Tag = {
            ...item,
            id: existing ? crypto.randomUUID() : (item.id || crypto.randomUUID()),
            createTime: item.createTime || now,
            lastModified: now,
            isDefault: false
          }
          await db.tags.add(tagToSave)
          count++
        }
      }
    })

    toast.success(`成功导入 ${count} 条数据`)
  } catch (error: any) {
    console.error('Import failed:', error)
    toast.error('导入失败', {
      description: error.message || '数据格式错误或网络问题'
    })
    throw error
  }
}

/**
 * 从 URL 导入
 */
export async function importFromUrl(url: string, targetType: 'library' | 'categories' | 'tags') {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    await importData(data, targetType)
  } catch (error: any) {
    throw error
  }
}

/**
 * 处理文件选择和读取
 */
export function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>, targetType: 'library' | 'categories' | 'tags') {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string
      const data = JSON.parse(content)
      await importData(data, targetType)
    } catch (error) {
      // toast already handled in importData
    } finally {
      // Reset input value to allow selecting same file again
      event.target.value = ''
    }
  }
  reader.readAsText(file)
}
