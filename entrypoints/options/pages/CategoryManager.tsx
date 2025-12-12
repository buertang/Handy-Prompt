import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  FileText,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { CategoryDialog, type Category as DialogCategory } from '@/components/category-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category } from '@/lib/db'
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

export default function CategoryManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name' | 'promptCount' | 'createTime' | 'lastModified'>('createTime')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DialogCategory | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move')

  // Live Query for real-time data
  const categories = useLiveQuery(() => db.categories.toArray()) || []
  const prompts = useLiveQuery(() => db.prompts.toArray()) || []

  // Derived state with prompt counts
  const categoriesWithStats = useMemo(() => {
    const stats: Record<string, number> = {}
    prompts.forEach(p => {
      if (p.categoryId) {
        stats[p.categoryId] = (stats[p.categoryId] || 0) + 1
      }
    })

    return categories.map(cat => ({
      ...cat,
      promptCount: stats[cat.id] || 0,
      // Ensure optional fields have defaults for UI
      description: cat.description || '',
      enabled: cat.enabled ?? true,
      color: cat.color || 'bg-gray-500'
    }))
  }, [categories, prompts])

  // Statistics
  const totalCategories = categories.length
  const enabledCategories = categoriesWithStats.filter(c => c.enabled).length
  const totalPrompts = prompts.length

  // Filter and Sort categories
  const filteredCategories = useMemo(() => {
    const filtered = categoriesWithStats.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [categoriesWithStats, searchQuery, sortOption])

  const handleEdit = (category: DialogCategory) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const handleSave = async (categoryData: DialogCategory) => {
    try {
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

      let createTime = now;
      if (editingCategory) {
        const existing = await db.categories.get(categoryData.id);
        if (existing && existing.createTime) {
          createTime = existing.createTime;
        }
      }

      const categoryToSave: Category = {
        id: categoryData.id,
        name: categoryData.name,
        isDefault: categoryData.isDefault,
        description: categoryData.description,
        enabled: categoryData.enabled,
        color: categoryData.color,
        createTime,
        lastModified: now
      }

      if (editingCategory) {
        await db.categories.put(categoryToSave)
      } else {
        await db.categories.add(categoryToSave)
      }
      setIsDialogOpen(false)
      setEditingCategory(null)
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        alert('分类名称已存在，请使用其他名称。')
      } else {
        console.error('Failed to save category:', error)
        alert('保存失败，请重试。')
      }
    }
  }

  const initiateDelete = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteOption('move') // Default option
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      await db.transaction('rw', db.prompts, db.categories, async () => {
        if (deleteOption === 'move') {
          // Find default category
          const defaultCat = await db.categories.where('isDefault').equals(true as any).first() // Cast to any due to dexie boolean indexing quirks if not indexed, but here we just filter
          // Actually isDefault is not indexed in db.ts, so we should find it from array or add index.
          // Since we have categories loaded in memory via useLiveQuery, we can find it there, but inside transaction better to query or assume we have it.
          // Let's iterate or use the one we know.
          let targetCategoryId = defaultCat?.id

          if (!targetCategoryId) {
            // If no default category found, fallback to keeping them (or maybe error?)
            // Let's find any other category if default is missing, or create one?
            // For now, assume default exists.
            const allCats = await db.categories.toArray()
            const def = allCats.find(c => c.isDefault) || allCats[0]
            targetCategoryId = def?.id
          }

          if (targetCategoryId) {
            // Move prompts
            await db.prompts.where('categoryId').equals(categoryToDelete.id).modify({ categoryId: targetCategoryId })
          }
        } else {
          // Delete prompts
          await db.prompts.where('categoryId').equals(categoryToDelete.id).delete()
        }

        // Delete the category
        await db.categories.delete(categoryToDelete.id)
      })

      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">分类管理</h1>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">总计 {totalCategories} 个分类</Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">启用 {enabledCategories} 个</Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">提示词总数 {totalPrompts}</Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          在这里，您可以管理您的分类，包括添加、编辑、删除和启用/停用分类。
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索分类名称或描述..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" /> 导出
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> 本地导入
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> 远程导入
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> 新增分类
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredCategories.map(category => (
          <Card key={category.id} className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 overflow-hidden border-muted/60">
            <div className={cn("h-1 w-full", category.color)} />
            <CardHeader className="pb-3 pt-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full ring-4 ring-opacity-20", category.color, category.color.replace('bg-', 'ring-'))} />
                  <CardTitle className="text-lg font-bold">{category.name}</CardTitle>
                  {category.isDefault && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-secondary text-secondary-foreground border-border">
                      默认
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-6 leading-relaxed">
                {category.description || '暂无描述'}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-md">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{category.promptCount} 个提示词</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.enabled}
                    onCheckedChange={() => { /* Toggle enabled in DB */
                      db.categories.update(category.id, { enabled: !category.enabled })
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground min-w-[36px]">
                    {category.enabled ? '已启用' : '已停用'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3 pb-4 flex justify-end gap-2 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => handleEdit(category)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> 编辑
              </Button>
              {!category.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => initiateDelete(category)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 删除
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit/Add Dialog */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除分类: {categoryToDelete?.name}</DialogTitle>
            <DialogDescription>
              您正在删除一个分类，该分类下包含 {categoriesWithStats.find(c => c.id === categoryToDelete?.id)?.promptCount || 0} 个提示词。请选择如何处理这些提示词。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={deleteOption} onValueChange={(v) => setDeleteOption(v as 'move' | 'delete')}>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="move" id="move" />
                <Label htmlFor="move" className="cursor-pointer">
                  <span className="font-bold block">移动到默认分类 (推荐)</span>
                  <span className="text-xs text-muted-foreground">将该分类下的所有提示词移动到"默认"分类中，保留数据。</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete" className="cursor-pointer">
                  <span className="font-bold block text-destructive">删除所有提示词</span>
                  <span className="text-xs text-muted-foreground">永久删除该分类下的所有提示词，无法恢复。</span>
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
