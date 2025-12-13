import { toast } from "sonner";

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
 * 格式化当前日期为 YYYYMMDD 格式
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * 导出数据为 JSON 文件
 * @param data 要导出的数据数组
 * @param type 导出类型
 * @param filenamePrefix 文件名前缀（可选，默认 HandyPrompt）
 */
export function exportToJson<T>(
  data: T[], 
  type: 'library' | 'categories' | 'tags',
  filenamePrefix: string = 'HandyPrompt'
) {
  try {
    const now = new Date();
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

    // 文件名格式: HandyPrompt-Library-20240321.json
    // 首字母大写的类型名称
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    const dateStr = formatDate(now);
    const filename = `${filenamePrefix}-${typeName}-${dateStr}.json`;

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
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('导出失败', {
      description: '生成文件时发生错误，请重试'
    });
  }
}
