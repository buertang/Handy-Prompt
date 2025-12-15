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
  Pin,
  PinOff,
  Clock,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CategoryDialog } from '@/components/category-dialog'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type Tag } from '@/lib/db'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportData } from '@/lib/export'
import { importFromUrl, handleFileSelect } from '@/lib/import'
import { ImportUrlDialog } from '@/components/import-url-dialog'
import { useRef } from 'react'
import { useI18n } from '@/components/i18n-provider'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function CategoryManager() {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name' | 'promptCount' | 'createTime' | 'lastModified'>('createTime')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move')

  // Import Dialog State
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      color: cat.color || 'bg-gray-500',
      isPinned: cat.isDefault ? true : (cat.isPinned || false)
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
      // 0. Default category always on top
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;

      // First sort by pinned status
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);

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

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const handleTogglePinned = async (category: Category) => {
    await db.categories.update(category.id, { isPinned: !category.isPinned })
    toast.success(category.isPinned ? t('common.unpin') : t('common.pin'))
  }

  const handleToggleEnabled = async (category: Category) => {
    if (category.isDefault) {
      return
    }
    const newEnabled = !category.enabled

    await db.transaction('rw', db.categories, db.prompts, db.tags, async () => {
      // 1. Update category
      await db.categories.update(category.id, { enabled: newEnabled })

      if (!newEnabled) {
        // 2. Disable all prompts in this category
        await db.prompts.where('categoryId').equals(category.id).modify({ enabled: false })
      } else {
        // 3. Enable prompts in this category IF their tags are also enabled
        const prompts = await db.prompts.where('categoryId').equals(category.id).toArray()
        const allTags = await db.tags.toArray()
        const tagMap = allTags.reduce((acc, t) => ({ ...acc, [t.name]: t }), {} as Record<string, Tag>)

        for (const prompt of prompts) {
          // Check if all tags of this prompt are enabled
          let tagsEnabled = true
          if (prompt.tags && prompt.tags.length > 0) {
            tagsEnabled = prompt.tags.every(tagName => {
              const tag = tagMap[tagName]
              return tag && tag.enabled !== false
            })
          }

          if (tagsEnabled) {
            await db.prompts.update(prompt.id, { enabled: true })
          }
        }
      }
    })

    const action = newEnabled ? t('common.enable') : t('common.disable')
    const effect = newEnabled ? t('common.enable') : t('common.disable')
    toast.success(t('category.toggleSuccess').replace('$1', action).replace('$2', effect))
  }

  // Bulk Actions
  const handleBulkEnable = async () => {
    // Enable all categories
    // For each category enabled, also try to enable its prompts
    await db.transaction('rw', db.categories, db.prompts, db.tags, async () => {
      await db.categories.filter(c => c.enabled === false && c.isDefault !== true).modify({ enabled: true })


      // Re-evaluate all prompts to see if they can be enabled
      // A prompt can be enabled if its category is enabled AND its tags are enabled
      const allPrompts = await db.prompts.toArray()
      const allCategories = await db.categories.toArray()
      const allTags = await db.tags.toArray()

      const categoryMap = allCategories.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Category>)
      const tagMap = allTags.reduce((acc, t) => ({ ...acc, [t.name]: t }), {} as Record<string, Tag>)

      for (const prompt of allPrompts) {
        if (!prompt.enabled) {
          const category = categoryMap[prompt.categoryId]
          // We just enabled all categories, so category.enabled should be true (or we use the updated state logic)
          // Actually, we modified DB but categoryMap might be stale if we fetched before modify? 
          // Dexie modify waits. So fetched categories should be updated? No, we fetched separate array.
          // Since we enabled ALL categories, we can assume category is enabled.

          let tagsEnabled = true
          if (prompt.tags && prompt.tags.length > 0) {
            tagsEnabled = prompt.tags.every(tagName => {
              const tag = tagMap[tagName]
              return tag && tag.enabled !== false
            })
          }

          if (tagsEnabled) {
            await db.prompts.update(prompt.id, { enabled: true })
          }
        }
      }
    })
    toast.success(t('category.bulkEnableSuccess'))
  }

  const handleBulkDisable = async () => {
    await db.transaction('rw', db.categories, db.prompts, async () => {
      await db.categories.filter(c => c.enabled === true && c.isDefault !== true).modify({ enabled: false })
      // Disable ALL prompts because if category is disabled, prompt must be disabled
      // Wait, user said "停用分类时，停用关联提示词". 
      // If we disable ALL categories, effectively ALL prompts should be disabled?
      // Yes, prompts depend on category.
      await db.prompts.toCollection().modify({ enabled: false })
    })
    toast.success(t('category.bulkDisableSuccess'))
  }

  const handleSave = async (categoryData: Category) => {
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
        isPinned: categoryData.isPinned,
        createTime,
        lastModified: now
      }

      if (editingCategory) {
        await db.categories.put(categoryToSave)
        toast.success(t('category.updateSuccess'))
      } else {
        await db.categories.add(categoryToSave)
        toast.success(t('category.createSuccess'))
      }
      setIsDialogOpen(false)
      setEditingCategory(null)
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        toast.error(t('category.nameExists'))
      } else {
        console.error('Failed to save category:', error)
        toast.error(t('common.error'))
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
          const defaultCat = await db.categories.filter(c => !!c.isDefault).first()

          let targetCategoryId = defaultCat?.id

          if (!targetCategoryId) {
            // If no default category found, fallback to the first available one
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

      toast.success(t('category.deleteSuccess'))
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <h1 className="text-2xl font-bold">{t('category.title')}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkEnable}>{t('common.bulkEnable')}</Button>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkDisable}>{t('common.bulkDisable')}</Button>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">{t('category.totalCount').replace('$1', totalCategories.toString())}</Badge>
            <Badge variant="outline" className="bg-[#AFC2DB]/20 text-[#6B85A8] border-[#AFC2DB]/40">{t('category.enabledCount').replace('$1', enabledCategories.toString())}</Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('category.subtitle')}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex gap-2 flex-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <div className="relative min-w-[160px] sm:w-[200px] lg:w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('category.searchPlaceholder')}
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 xl:w-[90px] p-0 xl:px-3 justify-center xl:justify-between shrink-0">
                <span className="flex items-center justify-center">
                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                  <span className="hidden xl:inline ml-1.5">{t('common.sort')}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption('name')}>
                {t('common.name')} {sortOption === 'name' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('promptCount')}>
                {t('common.promptCount')} {sortOption === 'promptCount' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('createTime')}>
                {t('common.createTime')} {sortOption === 'createTime' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('lastModified')}>
                {t('common.lastModified')} {sortOption === 'lastModified' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json,.xlsx,.xls,.csv"
            onChange={(e) => handleFileSelect(e, 'categories')}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
                <Download className="h-4 w-4 xl:mr-1.5" />
                <span className="hidden xl:inline text-xs">{t('common.import')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                {t('common.localImport')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportUrlDialogOpen(true)}>
                {t('common.urlImport')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
                <Upload className="h-4 w-4 xl:mr-1.5" />
                <span className="hidden xl:inline text-xs">{t('common.export')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportData(categories, 'categories', 'json')}>
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData(categories, 'categories', 'xlsx')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData(categories, 'categories', 'csv')}>
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={handleAdd} className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
            <Plus className="h-4 w-4 xl:mr-1.5" />
            <span className="hidden xl:inline text-xs">{t('common.new')}</span>
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
                      {t('common.default')}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-6 w-6 -mt-1 -mr-1", category.isPinned ? "text-primary" : "text-muted-foreground transition-opacity", category.isDefault && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-primary")}
                  onClick={() => !category.isDefault && handleTogglePinned(category)}
                  disabled={category.isDefault}
                  title={category.isDefault ? t('category.defaultCategory') : (category.isPinned ? t('common.unpin') : t('common.pin'))}
                >
                  {category.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <p
                    className="text-sm text-muted-foreground line-clamp-1 mb-6 leading-relaxed cursor-help"
                  >
                    {category.description || t('category.noDescription')}
                  </p>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-0 overflow-hidden">
                  <ScrollArea className="max-h-[200px] w-full">
                    <div className="space-y-1 p-4">
                      <p className="text-sm text-muted-foreground break-words break-all whitespace-pre-wrap">
                        {category.description || t('category.noDescription')}
                      </p>
                    </div>
                  </ScrollArea>
                </HoverCardContent>
              </HoverCard>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-md">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{category.promptCount} {t('common.promptCount')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {category.isDefault ? (
                    <div className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                      <Switch
                        checked={category.enabled}
                        disabled={true}
                        className="data-[state=checked]:bg-primary scale-90 origin-right"
                      />
                      <span className="text-xs font-medium text-muted-foreground min-w-[36px]">
                        {t('common.enabled')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={() => handleToggleEnabled(category)}
                        className="data-[state=checked]:bg-primary scale-90 origin-right"
                      />
                      <span className="text-xs font-medium text-muted-foreground min-w-[36px]">
                        {category.enabled ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className='flex flex-col gap-1 text-xs text-muted-foreground mb-3'>
                <div className='flex items-center gap-1.5'>
                  <Calendar className="h-3" />
                  <span>{t('common.createTime')}: {category.createTime}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Clock className="h-3" />
                  <span>{t('common.lastModified')}: {category.lastModified}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3 pb-4 flex justify-end gap-2 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10", category.isDefault && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground")}
                onClick={() => !category.isDefault && handleEdit(category)}
                disabled={category.isDefault}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> {t('common.edit')}
              </Button>
              {!category.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => initiateDelete(category)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('common.delete')}
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
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('category.deleteDialog.title').replace('$1', categoryToDelete?.name || '')}
        description={t('category.deleteDialog.description').replace('$1', (categoriesWithStats.find(c => c.id === categoryToDelete?.id)?.promptCount || 0).toString())}
        onConfirm={confirmDelete}
      >
        <RadioGroup value={deleteOption} onValueChange={(v) => setDeleteOption(v as 'move' | 'delete')}>
          <div className="flex items-center space-x-2 mb-4">
            <RadioGroupItem value="move" id="move" />
            <Label htmlFor="move" className="cursor-pointer">
              <span className="font-bold block">{t('category.deleteDialog.moveOption')}</span>
              <span className="text-xs text-muted-foreground">{t('category.deleteDialog.moveDesc')}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="delete" id="delete" />
            <Label htmlFor="delete" className="cursor-pointer">
              <span className="font-bold block text-destructive">{t('category.deleteDialog.deleteOption')}</span>
              <span className="text-xs text-muted-foreground">{t('category.deleteDialog.deleteDesc')}</span>
            </Label>
          </div>
        </RadioGroup>
      </DeleteConfirmDialog>

      <ImportUrlDialog
        open={importUrlDialogOpen}
        onOpenChange={setImportUrlDialogOpen}
        onImport={(data) => importFromUrl(data, 'categories')}
      />
    </div>
  )
}
