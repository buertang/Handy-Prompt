import { useState, useEffect } from 'react'
import {
  Pencil,
  Plus,
  Calendar,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  lastModified: ''
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
        </div>

        <DialogFooter>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {isEditMode && formData.createTime && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>创建: {formData.createTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>修改: {formData.lastModified || formData.createTime}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button onClick={handleSave}>{isEditMode ? '更新标签' : '创建标签'}</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
