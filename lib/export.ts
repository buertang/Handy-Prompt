import { toast } from "sonner";
import * as XLSX from 'xlsx';

export interface ExportMeta {
  version: string;
  type: 'library' | 'categories' | 'tags';
  exportedAt: string;
  app: string;
  count: number;
}

export interface ExportData<T> {
  meta: ExportMeta;
  data: T[];
}

/**
 * 字段映射配置
 * key: 数据类型 (library, categories, tags)
 * value: 字段名映射 (英文 -> 中文)
 */
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  library: {
    id: 'ID',
    title: '标题',
    content: '内容',
    description: '描述',
    tags: '标签',
    categoryId: '分类ID',
    categoryName: '分类名称',
    createTime: '创建时间',
    lastModified: '修改时间',
    enabled: '启用',
  },
  categories: {
    id: 'ID',
    name: '名称',
    color: '颜色',
    createTime: '创建时间',
    lastModified: '修改时间',
    enabled: '启用',
    isDefault: '默认',
  },
  tags: {
    id: 'ID',
    name: '名称',
    isPinned: '置顶',
    createTime: '创建时间',
    lastModified: '修改时间',
    enabled: '启用',
    isDefault: '默认',
    promptCount: '提示词数量'
  }
};

/**
 * 格式化当前日期为 YYYYMMDD_HHMMSS 格式
 */
const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

export type ExportFormat = 'json' | 'xlsx' | 'csv';

/**
 * 导出数据
 * @param data 要导出的数据数组
 * @param type 导出类型
 * @param format 导出格式
 * @param filenamePrefix 文件名前缀（可选，默认 HandyPrompt）
 */
export function exportData<T>(
  data: T[],
  type: 'library' | 'categories' | 'tags',
  format: ExportFormat = 'json',
  filenamePrefix: string = 'HandyPrompt'
) {
  try {
    const now = new Date();
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    const dateStr = formatDateTime(now);
    const baseFilename = `${filenamePrefix}-${typeName}-${dateStr}`;

    if (format === 'json') {
      const exportContent: ExportData<T> = {
        meta: {
          version: '1.0',
          type,
          exportedAt: now.toISOString(),
          app: 'Handy Prompt',
          count: data.length
        },
        data
      };

      const filename = `${baseFilename}.json`;
      const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`成功导出 ${data.length} 条数据`, {
        description: `文件已保存为 ${filename}`
      });
    } else {
      // Excel / CSV Export
      // 1. 转换数据为中文表头
      const mapping = FIELD_MAPPINGS[type];
      const exportData = data.map((item: any) => {
        const newItem: Record<string, any> = {};

        // 遍历数据的每个字段
        Object.keys(item).forEach(key => {
          // 如果有对应的中文映射，使用中文 key，否则使用原 key
          const newKey = mapping && mapping[key] ? mapping[key] : key;

          let value = item[key];

          // 特殊处理数组 (如 tags)，转换为逗号分隔字符串
          if (Array.isArray(value)) {
            value = value.join(',');
          }

          newItem[newKey] = value;
        });

        return newItem;
      });

      // 2. 生成 Sheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      const filename = `${baseFilename}.${format}`;

      // 使用 xlsx 库的 writeFile 直接下载
      XLSX.writeFile(workbook, filename);

      toast.success(`成功导出 ${data.length} 条数据`, {
        description: `文件已保存为 ${filename}`
      });
    }
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('导出失败', {
      description: '生成文件时发生错误，请重试'
    });
  }
}
