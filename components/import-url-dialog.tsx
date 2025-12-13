import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, Info, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (url: string) => Promise<void>
}

export function ImportUrlDialog({
  open,
  onOpenChange,
  onImport
}: ImportUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return

    setLoading(true)
    try {
      await onImport(url)
      onOpenChange(false)
      setUrl('')
    } catch (error) {
      // Error handling is done in parent component via toast
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            <DialogTitle>从 URL 导入</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* 说明框 - 莫兰迪色风格 (Slate/Blue mix) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3 text-sm text-slate-600">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-slate-700">导入说明</p>
              <p className="leading-relaxed opacity-90">
                输入包含有效提示词 JSON 数据的 URL 链接，系统将自动获取并导入数据。
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">远程 URL</Label>
            <div className="relative">
              <Link className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/prompts.json"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!url.trim() || loading} className="min-w-[100px]">
            {loading ? (
              '导入中...'
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> 开始导入
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
