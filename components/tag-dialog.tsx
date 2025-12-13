import { useState, useEffect } from 'react'
import {
  Pencil,
  Plus,
  Calendar,
  Clock,
  Pin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tag } from '@/lib/db'

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag | null
  onSave: (tag: Tag) => void
}

const defaultTag: Tag = {
  id: '',
  name: '',
  createTime: '',
  lastModified: '',
  isPinned: false,
  enabled: true
}

export function TagDialog({
  open,
  onOpenChange,
  tag,
  onSave
}: TagDialogProps) {
  const [formData, setFormData] = useState<Tag>(defaultTag)

  useEffect(() => {
    if (open) {
      if (tag) {
        setFormData({ ...tag })
      } else {
        setFormData({ ...defaultTag, id: crypto.randomUUID() })
      }
    }
  }, [open, tag])

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  const isEditMode = !!tag && tag.id !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            <DialogTitle>{isEditMode ? '编辑标签' : '新增标签'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">标签名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入标签名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <Switch
                id="pinned"
                checked={formData.isPinned || false}
                onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="pinned" className="flex items-center gap-1">
                  置顶标签 <Pin className="w-3 h-3" />
                </Label>
                <span className="text-xs text-muted-foreground">置顶显示</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Switch
                id="enabled"
                checked={formData.enabled !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="enabled">启用状态</Label>
                <span className="text-xs text-muted-foreground">是否显示</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60 justify-center">
            {isEditMode && formData.createTime && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>创建: {formData.createTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>修改: {formData.lastModified || formData.createTime}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSave}>{isEditMode ? '更新标签' : '创建标签'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
