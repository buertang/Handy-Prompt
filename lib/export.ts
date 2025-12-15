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
      // 对于 Excel/CSV，我们只导出 data 数组，不包含 meta 信息（或者放在另一个 sheet，但通常不需要）
      // 确保 data 是扁平的对象数组
      const worksheet = XLSX.utils.json_to_sheet(data);
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


