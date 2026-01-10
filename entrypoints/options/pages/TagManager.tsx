import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Tag as TagIcon,
  ArrowUpDown,
  Download,
  Upload,
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
import { TagDialog } from '@/components/tag-dialog'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Tag, type Category } from '@/lib/db'
import { exportData } from '@/lib/export'
import { importFromUrl, handleFileSelect } from '@/lib/import'
import { ImportUrlDialog } from '@/components/import-url-dialog'
import { useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n } from '@/components/i18n-provider'

export default function TagManager() {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'name' | 'promptCount' | 'createTime' | 'lastModified'>('createTime')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move')

  // Import Dialog State
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      promptCount: stats[tag.name] || 0,
      isPinned: tag.isDefault ? true : (tag.isPinned || false),
      enabled: tag.enabled !== false
    }))
  }, [tags, prompts])

  // Filter and Sort tags
  const filteredTags = useMemo(() => {
    const filtered = tagsWithStats.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return filtered.sort((a, b) => {
      // 0. Default tag always on top
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
  }, [tagsWithStats, searchQuery, sortOption])

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingTag(null)
    setIsDialogOpen(true)
  }

  const handleTogglePinned = async (tag: Tag) => {
    await db.tags.update(tag.id, { isPinned: !tag.isPinned })
    toast.success(tag.isPinned ? t('common.unpin') : t('common.pin'))
  }

  const handleToggleEnabled = async (tag: Tag) => {
    if (tag.isDefault) {
      return
    }
    const newEnabled = !tag.enabled

    await db.transaction('rw', db.tags, db.prompts, db.categories, async () => {
      // 1. Update tag
      await db.tags.update(tag.id, { enabled: newEnabled })

      if (!newEnabled) {
        // 2. Disable all prompts that have this tag
        // Filter prompts that include this tag
        await db.prompts.filter(p => p.tags.includes(tag.name)).modify({ enabled: false })
      } else {
        // 3. Enable prompts that have this tag IF their category is enabled AND other tags are enabled
        const prompts = await db.prompts.filter(p => p.tags.includes(tag.name)).toArray()
        const allCategories = await db.categories.toArray()
        const allTags = await db.tags.toArray()

        const categoryMap = allCategories.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Category>)
        const tagMap = allTags.reduce((acc, t) => ({ ...acc, [t.name]: t }), {} as Record<string, Tag>)

        for (const prompt of prompts) {
          const category = categoryMap[prompt.categoryId]
          const categoryEnabled = category && category.enabled !== false

          // Check if all tags of this prompt are enabled
          let tagsEnabled = true
          if (prompt.tags && prompt.tags.length > 0) {
            tagsEnabled = prompt.tags.every(tagName => {
              // The current tag is already updated in DB or we consider it enabled because we are enabling it?
              // We updated it in step 1, so tagMap fetch should reflect it?
              // Dexie transaction snapshot? 
              // Actually we fetched allTags after update, so it should be fine.
              // BUT, since we are inside transaction, we might need to be careful.
              // tagMap comes from allTags, which we fetch.
              // Let's ensure we treat the current tag as enabled regardless.
              if (tagName === tag.name) return true

              const t = tagMap[tagName]
              return t && t.enabled !== false
            })
          }

          if (categoryEnabled && tagsEnabled) {
            await db.prompts.update(prompt.id, { enabled: true })
          }
        }
      }
    })

    const action = newEnabled ? t('common.enable') : t('common.disable')
    const effect = newEnabled ? t('common.enable') : t('common.disable')
    toast.success(t('tag.toggleSuccess').replace('$1', action).replace('$2', effect))
  }

  // Bulk Actions
  const handleBulkEnable = async () => {
    await db.transaction('rw', db.tags, db.prompts, db.categories, async () => {
      await db.tags.filter(t => t.enabled === false && t.isDefault !== true).modify({ enabled: true })

      const allPrompts = await db.prompts.toArray()
      const allCategories = await db.categories.toArray()
      const allTags = await db.tags.toArray() // All tags are enabled now?
      // Wait, we modify tags but then fetch. In Dexie transaction, subsequent reads see writes?
      // Generally yes for same transaction.

      const categoryMap = allCategories.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Category>)
      const tagMap = allTags.reduce((acc, t) => ({ ...acc, [t.name]: t }), {} as Record<string, Tag>)

      for (const prompt of allPrompts) {
        if (!prompt.enabled) {
          const category = categoryMap[prompt.categoryId]
          const categoryEnabled = category && category.enabled !== false

          let tagsEnabled = true
          if (prompt.tags && prompt.tags.length > 0) {
            tagsEnabled = prompt.tags.every(tagName => {
              const tag = tagMap[tagName]
              return tag && tag.enabled !== false
            })
          }

          if (categoryEnabled && tagsEnabled) {
            await db.prompts.update(prompt.id, { enabled: true })
          }
        }
      }
    })
    toast.success(t('tag.bulkEnableSuccess'))
  }

  const handleBulkDisable = async () => {
    await db.transaction('rw', db.tags, db.prompts, async () => {
      await db.tags.filter(t => t.enabled === true && t.isDefault !== true).modify({ enabled: false })
      // Disable ALL prompts because if any tag is disabled, prompt is disabled?
      // No, only prompts that HAVE tags. Prompts with NO tags are not affected by tag disable?
      // But we are disabling ALL tags.
      // If a prompt has ANY tag, that tag is now disabled -> prompt must be disabled.
      // If a prompt has NO tags, it is unaffected by tag logic.

      // So we should find all prompts that have at least one tag, and disable them.
      // OR simpler: iterate all prompts.
      const prompts = await db.prompts.toArray()
      for (const prompt of prompts) {
        if (prompt.tags && prompt.tags.length > 0) {
          await db.prompts.update(prompt.id, { enabled: false })
        }
      }
    })
    toast.success(t('tag.bulkDisableSuccess'))
  }

  const handleSave = async (tagData: Tag) => {
    try {
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

      // Ensure createTime is preserved if editing, or set if new
      // tagData comes from form, might lack createTime/lastModified or have stale ones
      const tagToSave: Tag = {
        ...tagData,
        createTime: editingTag ? editingTag.createTime : now,
        lastModified: now,
        isPinned: tagData.isPinned || false
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
        toast.success(t('tag.updateSuccess'))
      } else {
        await db.tags.add(tagToSave)
        toast.success(t('tag.createSuccess'))
      }
      setIsDialogOpen(false)
      setEditingTag(null)
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        toast.error(t('tag.nameExists'))
      } else {
        console.error('Failed to save tag:', error)
        toast.error(t('common.error'))
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
          let targetTagName: string

          // 1. Try to find existing default tag (by flag first)
          const systemDefaultTag = await db.tags.filter(t => !!t.isDefault).first()

          if (systemDefaultTag) {
            targetTagName = systemDefaultTag.name
          } else {
            // 2. If no system default tag, check if a tag with the localized default name exists
            const localizedDefaultName = t('tag.defaultTag')
            const existingByName = await db.tags.where('name').equals(localizedDefaultName).first()

            if (existingByName) {
              targetTagName = existingByName.name
            } else {
              // 3. Create new default tag
              targetTagName = localizedDefaultName
              const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
              await db.tags.add({
                id: crypto.randomUUID(),
                name: targetTagName,
                createTime: now,
                lastModified: now,
                isDefault: true, // Fix: Ensure it is marked as default
                isPinned: true,
                enabled: true
              })
            }
          }

          // Update prompts: replace deleted tag with default tag
          await db.prompts.where('tags').equals(tagToDelete.name).modify(prompt => {
            if (prompt.tags) {
              // Remove deleted tag
              const newTags = prompt.tags.filter(t => t !== tagToDelete.name)
              // Add default tag if not present
              if (!newTags.includes(targetTagName)) {
                newTags.push(targetTagName)
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

      toast.success(t('tag.deleteSuccess'))
      setDeleteDialogOpen(false)
      setTagToDelete(null)
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <h1 className="text-2xl font-bold">{t('tag.title')}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkEnable}>{t('common.bulkEnable')}</Button>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkDisable}>{t('common.bulkDisable')}</Button>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              {t('tag.totalCount').replace('$1', tags.length.toString())}
            </Badge>
            <Badge variant="outline" className="bg-[#AFC2DB]/20 text-[#6B85A8] border-[#AFC2DB]/40">
              {t('tag.enabledCount').replace('$1', tagsWithStats.filter(t => t.enabled).length.toString())}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('tag.subtitle')}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex gap-2 flex-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <div className="relative min-w-[160px] sm:w-[200px] lg:w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('tag.searchPlaceholder')}
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            onChange={(e) => handleFileSelect(e, 'tags')}
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
              <DropdownMenuItem onClick={() => exportData(tags, 'tags', 'json')}>
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData(tags, 'tags', 'xlsx')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData(tags, 'tags', 'csv')}>
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
        {filteredTags.map(tag => (
          <Card key={tag.id} className="group hover:shadow-md transition-all">
            <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-bold line-clamp-2 break-words leading-tight">{tag.name}</CardTitle>
                  {tag.isDefault && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-secondary text-secondary-foreground border-border">
                      {t('common.default')}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-6 w-6 -mt-1 -mr-1", tag.isPinned ? "text-primary" : "text-muted-foreground transition-opacity", tag.isDefault && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-primary")}
                  onClick={() => !tag.isDefault && handleTogglePinned(tag)}
                  disabled={tag.isDefault}
                  title={tag.isDefault ? t('tag.defaultTag') : (tag.isPinned ? t('common.unpin') : t('common.pin'))}
                >
                  {tag.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-md">
                  <span>{tag.promptCount} {t('common.promptCount')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {tag.isDefault ? (
                    <div className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                      <Switch
                        checked={tag.enabled}
                        disabled={true}
                        className="scale-90 origin-right data-[state=checked]:bg-primary"
                      />
                    </div>
                  ) : (
                    <Switch
                      checked={tag.enabled}
                      onCheckedChange={() => handleToggleEnabled(tag)}
                      className="scale-90 origin-right data-[state=checked]:bg-primary"
                    />
                  )}
                </div>
              </div>
              <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                <div className='flex items-center gap-1.5'>
                  <Calendar className="h-3" />
                  <span>{t('common.createTime')}: {tag.createTime}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Clock className="h-3" />
                  <span>{t('common.lastModified')}: {tag.lastModified}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-3 flex justify-end gap-2 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 text-muted-foreground hover:text-primary", tag.isDefault && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground")}
                onClick={() => !tag.isDefault && handleEdit(tag)}
                disabled={tag.isDefault}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> {t('common.edit')}
              </Button>
              {!tag.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => initiateDelete(tag)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('common.delete')}
                </Button>
              )}
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

      <ImportUrlDialog
        open={importUrlDialogOpen}
        onOpenChange={setImportUrlDialogOpen}
        onImport={(url) => importFromUrl(url, 'tags')}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('tag.deleteDialog.title').replace('$1', tagToDelete?.name || '')}
        description={t('tag.deleteDialog.description').replace('$1', (tagsWithStats.find(t => t.id === tagToDelete?.id)?.promptCount || 0).toString())}
        onConfirm={confirmDelete}
      >
        <RadioGroup value={deleteOption} onValueChange={(v) => setDeleteOption(v as 'move' | 'delete')}>
          <div className="flex items-center space-x-2 mb-4">
            <RadioGroupItem value="move" id="move" />
            <Label htmlFor="move" className="cursor-pointer">
              <span className="font-bold block">{t('tag.deleteDialog.moveOption')}</span>
              <span className="text-xs text-muted-foreground">{t('tag.deleteDialog.moveDesc')}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="delete" id="delete" />
            <Label htmlFor="delete" className="cursor-pointer">
              <span className="font-bold block text-destructive">{t('tag.deleteDialog.deleteOption')}</span>
              <span className="text-xs text-muted-foreground">{t('tag.deleteDialog.deleteDesc')}</span>
            </Label>
          </div>
        </RadioGroup>
      </DeleteConfirmDialog>
    </div>
  )
}
