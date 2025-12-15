import { db, type Prompt, type Category, type Tag } from '@/lib/db'
import { toast } from 'sonner'
import { type ExportData, FIELD_MAPPINGS } from './export'
import * as XLSX from 'xlsx'

/**
 * 将中文表头转换为英文字段名
 */
function translateKeys(items: any[], type: string): any[] {
  const mapping = FIELD_MAPPINGS[type];
  if (!mapping) return items;

  const reverseMapping: Record<string, string> = {};
  Object.entries(mapping).forEach(([eng, cn]) => {
    reverseMapping[cn] = eng;
  });

  return items.map(item => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
      // 如果 key 是中文，映射回英文；如果是英文，保留原样
      const engKey = reverseMapping[key] || key;
      newItem[engKey] = item[key];
    });
    return newItem;
  });
}

/**
 * 解析并导入 JSON 数据
 * @param jsonData 解析后的 JSON 对象
 * @param targetType 期望导入的数据类型
 */
export async function importData(jsonData: any, targetType: 'library' | 'categories' | 'tags') {
  try {
    // 简单的格式校验
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('无效的数据格式')
    }

    // 兼容 ExportData 结构或直接数组结构
    let items: any[] = []

    // 如果是 ExportData 结构 (JSON)，进行严格校验
    if (!Array.isArray(jsonData) && jsonData.meta && jsonData.data) {
      // 1. 检查 meta.type 是否匹配
      if (jsonData.meta.type !== targetType) {
        throw new Error(`数据类型不匹配：当前正在导入 ${targetType}，但文件包含的是 ${jsonData.meta.type} 数据`)
      }
      items = jsonData.data
    } else if (Array.isArray(jsonData)) {
      // 2. 如果是纯数组 (Excel/CSV 或 纯 JSON 数组)，尝试通过字段特征检测类型
      items = jsonData

      // 尝试翻译字段名 (处理中文表头)
      items = translateKeys(items, targetType)

      if (items.length > 0) {
        const firstItem = items[0]
        if (targetType === 'library' && (!firstItem.title || !firstItem.content)) {
          // 可能是分类或标签数据
          if (firstItem.name && firstItem.color) throw new Error('检测到分类数据，请在分类管理页面导入')
          if (firstItem.name && !firstItem.color) throw new Error('检测到标签数据，请在标签管理页面导入')
          // 宽松一点，如果是 Excel 导入，可能只有 title content，没有 id 等
          if (!firstItem.title && !firstItem.content) throw new Error('无效的提示词数据格式，必须包含 title 和 content 字段')
        }
        if (targetType === 'categories' && (!firstItem.name)) {
          // Excel 导入可能只有 name
          if (firstItem.title) throw new Error('检测到提示词数据，请在提示词库页面导入')
          throw new Error('无效的分类数据格式，必须包含 name 字段')
        }
        if (targetType === 'tags' && (!firstItem.name)) {
          if (firstItem.title) throw new Error('检测到提示词数据，请在提示词库页面导入')
          throw new Error('无效的标签数据格式，必须包含 name 字段')
        }
      }
    } else {
      throw new Error('无法识别的数据格式')
    }

    // 再次确保 items 经过翻译 (针对 Case 1，虽然通常不需要，但为了保险)
    // 注意：Case 2 已经在上面翻译过了，这里会再次翻译吗？translateKeys 是幂等的吗？
    // translateKeys: reverseMapping[key] || key. 
    // 如果 key 已经是英文，reverseMapping[key] 是 undefined，返回 key。
    // 所以是幂等的 (只要中文和英文 key 不冲突)。
    items = translateKeys(items, targetType)

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('未找到有效的数据项')
    }

    // 获取默认分类 ID
    const defaultCategory = await db.categories.filter(c => !!c.isDefault).first()
    let defaultCategoryId = defaultCategory?.id

    // 如果没有默认分类，查找第一个分类作为默认
    if (!defaultCategoryId) {
      const firstCategory = await db.categories.toCollection().first()
      if (firstCategory) {
        defaultCategoryId = firstCategory.id
      } else {
        // 如果连一个分类都没有，创建一个默认分类
        defaultCategoryId = crypto.randomUUID()
        const timeStr = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        await db.categories.add({
          id: defaultCategoryId,
          name: '默认分类',
          isDefault: true,
          createTime: timeStr,
          lastModified: timeStr,
          color: 'bg-slate-500'
        })
      }
    }

    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    let count = 0

    await db.transaction('rw', db.prompts, db.categories, db.tags, async () => {
      if (targetType === 'library') {
        for (const item of items) {
          if (!item.title || !item.content) continue

          // 1. 检查是否存在同名提示词
          const existingByTitle = await db.prompts.where('title').equals(item.title).first()

          let finalId = item.id || crypto.randomUUID()

          if (existingByTitle) {
            // 如果存在同名提示词，使用现有 ID 以便覆盖（put 操作）
            finalId = existingByTitle.id
          } else {
            // 如果是新标题，检查 ID 是否被占用（被其他不同标题的提示词占用）
            if (item.id) {
              const existingById = await db.prompts.get(item.id)
              if (existingById) {
                // ID 冲突但标题不同 -> 生成新 ID 避免覆盖错误的记录
                finalId = crypto.randomUUID()
              }
            }
          }

          // 处理 Excel 导入可能缺失的字段
          // Excel 读出来的 tags 可能是逗号分隔的字符串
          let tags = item.tags
          if (typeof tags === 'string') {
            tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          } else if (!Array.isArray(tags)) {
            tags = []
          }

          // 2. 同步导入标签
          if (tags.length > 0) {
            for (const tagName of tags) {
              const existingTag = await db.tags.where('name').equals(tagName).first()
              if (!existingTag) {
                await db.tags.add({
                  id: crypto.randomUUID(),
                  name: tagName,
                  createTime: now,
                  lastModified: now,
                  isDefault: false
                })
              }
            }
          }

          // 3. 同步导入分类
          let categoryId = defaultCategoryId || ''

          if (item.categoryName) {
            const existingCategory = await db.categories.where('name').equals(item.categoryName).first()
            if (existingCategory) {
              categoryId = existingCategory.id
            } else {
              const newCategoryId = crypto.randomUUID()
              await db.categories.add({
                id: newCategoryId,
                name: item.categoryName,
                isDefault: false,
                createTime: now,
                lastModified: now,
                color: 'bg-slate-500' // 默认颜色
              })
              categoryId = newCategoryId
            }
          }

          const promptToSave: Prompt = {
            ...item,
            id: finalId,
            title: item.title,
            tags: tags,
            content: item.content,
            description: item.description || '',
            createTime: item.createTime || now,
            lastModified: now,
            categoryId: categoryId,
            enabled: item.enabled === undefined ? true : item.enabled === true || item.enabled === 'true',
          }

          await db.prompts.put(promptToSave)
          count++
        }
      } else if (targetType === 'categories') {
        for (const item of items) {
          if (!item.name) continue
          const existing = await db.categories.get(item.id || 'non-existent')
          const nameConflict = await db.categories.where('name').equals(item.name).first()

          if (nameConflict) {
            continue
          }

          const categoryToSave: Category = {
            ...item,
            id: existing ? crypto.randomUUID() : (item.id || crypto.randomUUID()),
            createTime: item.createTime || now,
            lastModified: now,
            isDefault: false
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
      const result = e.target?.result
      let jsonData: any

      if (file.name.toLowerCase().endsWith('.json')) {
        jsonData = JSON.parse(result as string)
      } else {
        // Excel / CSV
        // 假设是 ArrayBuffer
        const workbook = XLSX.read(result, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        // 将 worksheet 转换为 json 对象数组
        jsonData = XLSX.utils.sheet_to_json(worksheet)
      }

      await importData(jsonData, targetType)
    } catch (error) {
      // toast already handled in importData or here if parse error
      console.error(error)
      toast.error('解析文件失败', { description: '请检查文件格式是否正确' })
    } finally {
      // Reset input value to allow selecting same file again
      event.target.value = ''
    }
  }

  if (file.name.toLowerCase().endsWith('.json')) {
    reader.readAsText(file)
  } else {
    reader.readAsArrayBuffer(file)
  }
}
