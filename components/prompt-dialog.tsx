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
  Calendar
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type Prompt = {
  id: string
  title: string
  tags: string[]
  content: string
  description?: string
  createTime: string
  lastModified: string
  enabled: boolean
  category: string
}

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt?: Prompt | null
  categories: string[]
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
  category: '默认'
}

export function PromptDialog({
  open,
  onOpenChange,
  prompt,
  categories,
  onSave
}: PromptDialogProps) {
  const [formData, setFormData] = useState<Prompt>(defaultPrompt)
  const [selectedTags, setSelectedTags] = useState<Option[]>([])

  useEffect(() => {
    if (open) {
      if (prompt) {
        setFormData({ ...prompt })
        setSelectedTags(prompt.tags.map(tag => ({ label: tag, value: tag })))
      } else {
        // New prompt
        const now = new Date().toISOString().split('T')[0]
        setFormData({
          ...defaultPrompt,
          id: crypto.randomUUID(),
          createTime: now,
          lastModified: now,
          category: categories[0] || '默认'
        })
        setSelectedTags([])
      }
    }
  }, [open, prompt, categories])

  const handleSave = () => {
    // Process tags
    const tags = selectedTags.map(t => t.value)

    // Update modify time
    const now = new Date().toISOString().split('T')[0]

    onSave({
      ...formData,
      tags,
      lastModified: now
    })
    onOpenChange(false)
  }

  const isEditMode = !!prompt && prompt.id !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            <DialogTitle>{isEditMode ? '编辑提示词' : '新增提示词'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {isEditMode ? '修改当前提示词的详细信息' : '创建一个新的提示词以供使用'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 pb-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入提示词标题"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">分类</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger
                  id="category"
                  className='w-full focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:focus-visible:ring-indigo-500/40'
                >
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="简短描述提示词的作用"
            />
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
              placeholder="选择或输入标签..."
              creatable
              emptyIndicator={
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  没有找到标签，按回车创建
                </p>
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">启用状态</Label>
              <div className="text-xs text-muted-foreground">
                禁用后将不会在 popup 中显示
              </div>
            </div>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {isEditMode && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>创建: {formData.createTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>修改: {formData.lastModified}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
