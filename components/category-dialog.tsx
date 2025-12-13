import { useState, useEffect } from 'react'
import {
  Pencil,
  Check,
  Plus,
  Calendar,
  Clock,
  Pin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { type Category } from '@/lib/db'

// 预定义颜色选项
const COLOR_OPTIONS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500'
]

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  onSave: (category: Category) => void
}

const defaultCategory: Category = {
  id: '',
  name: '',
  description: '',
  enabled: true,
  isDefault: false,
  color: 'bg-indigo-500',
  isPinned: false,
  createTime: '',
  lastModified: ''
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave
}: CategoryDialogProps) {
  const [formData, setFormData] = useState<Category>(defaultCategory)

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({ ...category })
      } else {
        // 新增模式，重置表单（id为空表示新增）
        setFormData({ ...defaultCategory, id: crypto.randomUUID() })
      }
    }
  }, [open, category])

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  const isEditMode = !!category && category.id !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            <DialogTitle>{isEditMode ? '编辑分类' : '新增分类'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">分类名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入分类名称"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述 (可选)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="resize-none"
              rows={3}
              placeholder="请输入分类描述"
            />
          </div>

          <div className="grid gap-3">
            <Label>分类颜色</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full transition-all flex items-center justify-center ring-offset-2 ring-offset-background",
                    color,
                    formData.color === color ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                  )}
                  onClick={() => setFormData({ ...formData, color })}
                >
                  {formData.color === color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Switch
              id="pinned"
              checked={formData.isPinned || false}
              onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="pinned" className="flex items-center gap-1">
                置顶分类 <Pin className="w-3 h-3" />
              </Label>
              <span className="text-xs text-muted-foreground">将此分类显示在列表顶部</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="enabled">已启用</Label>
              <span className="text-xs text-muted-foreground">停用后该分类下的提示词不会显示</span>
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
            <Button onClick={handleSave}>{isEditMode ? '更新分类' : '创建分类'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
