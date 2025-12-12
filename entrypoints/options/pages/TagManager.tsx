import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Tag as TagIcon,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TagDialog } from '@/components/tag-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Tag } from '@/lib/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function TagManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name' | 'promptCount' | 'createTime' | 'lastModified'>('createTime')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move')

  // Live Query
  const tags = useLiveQuery(() => db.tags.toArray()) || []
  const prompts = useLiveQuery(() => db.prompts.toArray()) || []

  // Derived state with stats
  const tagsWithStats = useMemo(() => {
    const stats: Record<string, number> = {}
    prompts.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tagName => {
          stats[tagName] = (stats[tagName] || 0) + 1
        })
      }
    })

    return tags.map(tag => ({
      ...tag,
      promptCount: stats[tag.name] || 0
    }))
  }, [tags, prompts])

  // Filter and Sort tags
  const filteredTags = useMemo(() => {
    const filtered = tagsWithStats.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN')
        case 'promptCount':
          return b.promptCount - a.promptCount
        case 'createTime':
          return (b.createTime || '').localeCompare(a.createTime || '')
        case 'lastModified':
          return (b.lastModified || '').localeCompare(a.lastModified || '')
        default:
          return 0
      }
    })
  }, [tagsWithStats, searchQuery, sortOption])

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingTag(null)
    setIsDialogOpen(true)
  }

  const handleSave = async (tagData: Tag) => {
    try {
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

      // Ensure createTime is preserved if editing, or set if new
      // tagData comes from form, might lack createTime/lastModified or have stale ones
      const tagToSave: Tag = {
        ...tagData,
        createTime: editingTag ? editingTag.createTime : now,
        lastModified: now
      }

      if (editingTag) {
        // Handle Rename
        if (editingTag.name !== tagData.name) {
          await db.transaction('rw', db.tags, db.prompts, async () => {
            // 1. Update tag in db.tags
            await db.tags.put(tagToSave)

            // 2. Update all prompts using the old name
            await db.prompts.where('tags').equals(editingTag.name).modify(prompt => {
              if (prompt.tags) {
                prompt.tags = prompt.tags.map(t => t === editingTag.name ? tagData.name : t)
              }
            })
          })
        } else {
          // No name change
          await db.tags.put(tagToSave)
        }
      } else {
        await db.tags.add(tagToSave)
      }
      setIsDialogOpen(false)
      setEditingTag(null)
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        alert('标签名称已存在，请使用其他名称。')
      } else {
        console.error('Failed to save tag:', error)
        alert('保存失败，请重试。')
      }
    }
  }

  const initiateDelete = (tag: Tag) => {
    setTagToDelete(tag)
    setDeleteOption('move')
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!tagToDelete) return

    try {
      await db.transaction('rw', db.prompts, db.tags, async () => {
        if (deleteOption === 'move') {
          // Move to "Default" tag
          const defaultTagName = '默认'

          // Ensure "Default" tag exists
          const existingDefault = await db.tags.where('name').equals(defaultTagName).first()
          if (!existingDefault) {
            const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
            await db.tags.add({
              id: crypto.randomUUID(),
              name: defaultTagName,
              createTime: now,
              lastModified: now
            })
          }

          // Update prompts: replace deleted tag with default tag
          await db.prompts.where('tags').equals(tagToDelete.name).modify(prompt => {
            if (prompt.tags) {
              // Remove deleted tag
              const newTags = prompt.tags.filter(t => t !== tagToDelete.name)
              // Add default tag if not present
              if (!newTags.includes(defaultTagName)) {
                newTags.push(defaultTagName)
              }
              prompt.tags = newTags
            }
          })
        } else {
          // Delete prompts containing this tag
          // Note: This is destructive. It deletes the PROMPT, not just the tag from the prompt.
          // User requirement: "Tags are the same [as categories]" -> Delete prompts.
          await db.prompts.where('tags').equals(tagToDelete.name).delete()
        }

        // Delete the tag from db.tags
        await db.tags.delete(tagToDelete.id)
      })

      setDeleteDialogOpen(false)
      setTagToDelete(null)
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">标签管理</h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            总计 {tags.length} 个标签
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          管理您的提示词标签。修改标签名称会自动更新所有关联的提示词。
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索标签..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                排序
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption('name')}>
                名称 {sortOption === 'name' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('promptCount')}>
                提示词数量 {sortOption === 'promptCount' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('createTime')}>
                创建时间 {sortOption === 'createTime' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('lastModified')}>
                最近修改 {sortOption === 'lastModified' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> 新增标签
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTags.map(tag => (
          <Card key={tag.id} className="group hover:shadow-md transition-all">
            <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-bold">{tag.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-md w-fit">
                <span>{tag.promptCount} 个提示词</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-3 flex justify-end gap-2 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-primary"
                onClick={() => handleEdit(tag)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> 编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => initiateDelete(tag)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <TagDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tag={editingTag}
        onSave={handleSave}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除标签: {tagToDelete?.name}</DialogTitle>
            <DialogDescription>
              您正在删除一个标签，该标签被 {tagsWithStats.find(t => t.id === tagToDelete?.id)?.promptCount || 0} 个提示词使用。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={deleteOption} onValueChange={(v) => setDeleteOption(v as 'move' | 'delete')}>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="move" id="move" />
                <Label htmlFor="move" className="cursor-pointer">
                  <span className="font-bold block">替换为"默认"标签 (推荐)</span>
                  <span className="text-xs text-muted-foreground">将关联提示词中的该标签替换为"默认"，保留提示词。</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete" className="cursor-pointer">
                  <span className="font-bold block text-destructive">删除关联提示词</span>
                  <span className="text-xs text-muted-foreground">删除所有包含此标签的提示词（慎选）。</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
