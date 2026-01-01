import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import MultipleSelector, { Option } from '@/components/ui/select-multi'
import {
  Pencil,
  Plus,
  Clock,
  Calendar,
  Pin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ClearableInput from '@/components/shadcn-studio/input-clear'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Prompt, Category, Tag } from '@/lib/db'

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt?: Prompt | null
  categories: Category[]
  tags?: Tag[]
  onSave: (prompt: Prompt) => void
}

const defaultPrompt: Prompt = {
  id: '',
  title: '',
  tags: [],
  content: '',
  description: '',
  createTime: '',
  lastModified: '',
  enabled: true,
  categoryId: '',
  isPinned: false
}

export function PromptDialog({
  open,
  onOpenChange,
  prompt,
  categories,
  tags = [],
  onSave
}: PromptDialogProps) {
  const [formData, setFormData] = useState<Prompt>(defaultPrompt)
  const [selectedTags, setSelectedTags] = useState<Option[]>([])

  const isEditMode = !!prompt && prompt.id !== ''

  // Sort categories by isPinned descending, then createTime descending (newest first)
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    return (b.createTime || '').localeCompare(a.createTime || '')
  })

  useEffect(() => {
    if (open) {
      if (prompt) {
        setFormData({ ...prompt })
        setSelectedTags(prompt.tags.map(tag => ({ label: tag, value: tag })))
      } else {
        // New prompt
        const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        const defaultCategory = categories.find(c => c.isDefault) || categories[0]

        setFormData({
          ...defaultPrompt,
          id: crypto.randomUUID(),
          createTime: now,
          lastModified: now,
          categoryId: defaultCategory?.id || ''
        })
        setSelectedTags([])
      }
    }
  }, [open, prompt, categories])

  const tagOptions: Option[] = tags
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return a.name.localeCompare(b.name, 'zh-CN');
    })
    .map(t => ({ label: t.name, value: t.name }))

  const handleSave = () => {
    if (!formData.title.trim()) return

    // Process tags
    const tags = selectedTags.map(t => t.value)

    // Update modify time
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    onSave({
      ...formData,
      tags,
      lastModified: now
    })
    onOpenChange(false)
  }

  const isValid = formData.title.trim().length > 0 && formData.content.trim().length > 0 && formData.categoryId !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            <DialogTitle>{isEditMode ? '编辑提示词' : '新增提示词'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {isEditMode ? '修改当前提示词的详细信息' : '创建一个新的提示词以供使用'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="title">标题</Label>
              <ClearableInput
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onClear={() => setFormData({ ...formData, title: '' })}
                placeholder="输入提示词标题"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">分类</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger
                  id="category"
                  className='w-full focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:focus-visible:ring-indigo-500/40'
                >
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {sortedCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <ClearableInput
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onClear={() => setFormData({ ...formData, description: '' })}
              placeholder="简短描述提示词的作用"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="author">作者</Label>
              <ClearableInput
                id="author"
                value={formData.author || ''}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                onClear={() => setFormData({ ...formData, author: '' })}
                placeholder="(可选)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">来源</Label>
              <ClearableInput
                id="source"
                value={formData.source || ''}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                onClear={() => setFormData({ ...formData, source: '' })}
                placeholder="(可选)"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="输入提示词内容..."
              className="min-h-[150px] font-mono text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label>标签</Label>
            <MultipleSelector
              value={selectedTags}
              onChange={setSelectedTags}
              defaultOptions={tagOptions}
              placeholder="选择或输入标签..."
              creatable
              emptyIndicator={
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  没有找到标签，按回车创建
                </p>
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="pinned" className="flex items-center gap-1">
                  置顶 <Pin className="w-3.5 h-3.5" />
                </Label>
                <div className="text-xs text-muted-foreground">
                  固定在顶部
                </div>
              </div>
              <Switch
                id="pinned"
                checked={formData.isPinned || false}
                onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">启用状态</Label>
                <div className="text-xs text-muted-foreground">
                  是否启用该提示词
                </div>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60 w-full sm:w-auto items-end sm:items-start">
            {isEditMode && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-right sm:text-left">
                <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                  <Calendar className="w-3 h-3" />
                  <span>创建: {formData.createTime}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                  <Clock className="w-3 h-3" />
                  <span>修改: {formData.lastModified}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!isValid}>保存</Button>
          </div>
        </DialogFooter>
      </DialogContent >
    </Dialog >
  )
}
