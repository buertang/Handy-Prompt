import { useState, useMemo, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Prompt, type Category, type Tag, incrementUsage } from '@/lib/db'
import { toast } from 'sonner'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportData } from '@/lib/export'
import { importFromUrl, handleFileSelect } from '@/lib/import'
import { ImportUrlDialog } from '@/components/import-url-dialog'
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  Rows3,
  Clock,
  Calendar,
  ArrowUp,
  ArrowUpDown,
  User,
  Globe,
  Pin,
  PinOff,
  AlertCircle,
  BarChart2,
  LayoutGrid,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { PromptDialog } from '@/components/prompt-dialog'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { browser } from 'wxt/browser';
import { useSettings } from '@/hooks/use-settings'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from '@/components/i18n-provider'

export default function ContentManager() {
  const { t } = useI18n();
  const { appearance, updateAppearance, loading: settingsLoading } = useSettings();
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortOption, setSortOption] = useState<'title' | 'createTime' | 'lastModified' | 'category' | 'usage'>('createTime')
  const getInitialMaxCols = () => {
    if (typeof window === 'undefined') return 5
    if (window.matchMedia('(min-width: 1536px)').matches) return 5
    if (window.matchMedia('(min-width: 1280px)').matches) return 4
    if (window.matchMedia('(min-width: 1024px)').matches) return 3
    if (window.matchMedia('(min-width: 640px)').matches) return 2
    return 1
  }

  const [columns, setColumns] = useState(() => {
    const max = getInitialMaxCols()
    // Default preference could be stored in localStorage, but for now default to 3 or max
    return Math.min(3, max)
  })
  const [maxAvailableColumns, setMaxAvailableColumns] = useState(getInitialMaxCols)
  const [layoutMode, setLayoutMode] = useState<'dropdown' | 'icon' | 'full'>('full')

  const gridRef = useRef<HTMLDivElement>(null)

  // 1. Handle maxAvailableColumns based on window width
  useEffect(() => {
    const updateMaxCols = () => {
      let maxCols = 1
      if (window.matchMedia('(min-width: 1536px)').matches) maxCols = 5
      else if (window.matchMedia('(min-width: 1280px)').matches) maxCols = 4
      else if (window.matchMedia('(min-width: 1024px)').matches) maxCols = 3
      else if (window.matchMedia('(min-width: 640px)').matches) maxCols = 2

      setMaxAvailableColumns(maxCols)
    }

    // Initial calculation
    updateMaxCols()

    // Add listeners for all breakpoints
    const mqls = [
      window.matchMedia('(min-width: 1536px)'),
      window.matchMedia('(min-width: 1280px)'),
      window.matchMedia('(min-width: 1024px)'),
      window.matchMedia('(min-width: 640px)')
    ]

    mqls.forEach(mql => mql.addEventListener('change', updateMaxCols))

    return () => {
      mqls.forEach(mql => mql.removeEventListener('change', updateMaxCols))
    }
  }, [])

  // 2. Handle layoutMode based on grid container width and active columns
  useEffect(() => {
    if (!gridRef.current) return

    const calculateLayoutMode = () => {
      if (!gridRef.current) return

      const containerWidth = gridRef.current.clientWidth
      const actualColumns = Math.min(columns, maxAvailableColumns)

      const gap = 16
      // Avoid division by zero
      const cols = actualColumns < 1 ? 1 : actualColumns
      const cardWidth = (containerWidth - (gap * (cols - 1))) / cols

      if (cardWidth < 320) {
        setLayoutMode('dropdown')
      } else if (cardWidth < 600) {
        setLayoutMode('icon')
      } else {
        setLayoutMode('full')
      }
    }

    const observer = new ResizeObserver(() => {
      calculateLayoutMode()
    })

    observer.observe(gridRef.current)
    // Initial calculation
    calculateLayoutMode()

    return () => observer.disconnect()
  }, [columns, maxAvailableColumns, appearance.viewMode])

  // Auto-adjust columns if window shrinks logic removed to preserve user preference
  // CSS handles the actual layout responsiveness
  // Highlight logic handles the UI feedback

  // DB Queries
  const prompts = useLiveQuery(() => db.prompts.toArray()) || []
  const categories = useLiveQuery(() => db.categories.toArray()) || []
  const tags = useLiveQuery(() => db.tags.toArray()) || []

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat
      return acc
    }, {} as Record<string, Category>)
  }, [categories])

  const tagMap = useMemo(() => {
    return tags.reduce((acc, tag) => {
      acc[tag.name] = tag
      return acc
    }, {} as Record<string, Tag>)
  }, [tags])

  // Bulk Actions
  const handleBulkEnable = async () => {
    let updatedCount = 0
    await db.transaction('rw', db.prompts, async () => {
      for (const prompt of prompts) {
        if (!prompt.enabled) {
          // Check conditions
          const category = categoryMap[prompt.categoryId]
          const categoryDisabled = category && category.enabled === false

          let tagsDisabled = false
          if (prompt.tags && prompt.tags.length > 0) {
            tagsDisabled = prompt.tags.some(tagName => {
              const tag = tagMap[tagName]
              return tag && tag.enabled === false
            })
          }

          if (!categoryDisabled && !tagsDisabled) {
            await db.prompts.update(prompt.id, { enabled: true })
            updatedCount++
          }
        }
      }
    })
    toast.success(t('content.bulkEnableSuccess').replace('$1', updatedCount.toString()))
  }

  const handleBulkDisable = async () => {
    const count = await db.prompts.filter(p => p.enabled === true).modify({ enabled: false })
    toast.success(t('content.bulkDisableSuccess').replace('$1', count.toString()))
  }

  // Helper to check effective enabled status
  const getEffectiveStatus = (prompt: Prompt) => {
    // 1. Check prompt itself
    if (!prompt.enabled) return { enabled: false, reason: 'self' }

    // 2. Check category
    const category = categoryMap[prompt.categoryId]
    if (category && category.enabled === false) return { enabled: false, reason: 'category' }

    // 3. Check tags
    // Rule: If ANY tag is disabled, the prompt is effectively disabled
    if (prompt.tags && prompt.tags.length > 0) {
      const hasDisabledTag = prompt.tags.some(tagName => {
        const tag = tagMap[tagName]
        return tag && tag.enabled === false
      })
      if (hasDisabledTag) return { enabled: false, reason: 'tag' }
    }

    return { enabled: true }
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null)

  // Import Dialog State
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 监听来自 background 的消息或 storage 变化，以自动打开添加对话框
  useEffect(() => {
    const checkPendingPrompt = async () => {
      const data = await browser.storage.local.get('pendingPromptContent');
      if (data.pendingPromptContent) {
        setEditingPrompt(null); // Ensure it's create mode
        // 预填充内容 - 这里我们需要修改 PromptDialog 能够接受初始内容，或者在这里暂存
        // 实际上 PromptDialog 接受 prompt 对象，如果是 null 则为空
        // 所以我们需要构造一个临时的 partial prompt 或者通过其他方式传递
        // 简单起见，我们在 setIsDialogOpen(true) 之后，PromptDialog 内部并不容易直接获取这个值
        // 除非我们把 defaultPrompt 传进去，或者修改 editingPrompt 的类型允许 Partial
        // 让我们创建一个临时的“新”prompt对象作为初始值
        const newPrompt: any = {
          title: data.pendingPromptContent.slice(0, 20) + (data.pendingPromptContent.length > 20 ? '...' : ''),
          content: data.pendingPromptContent,
          description: '',
          tags: [],
          categoryId: 'default', // Assuming default exists, will be handled by dialog logic hopefully or user selects
          enabled: true,
          isPinned: false
        };
        setEditingPrompt(newPrompt);
        setIsDialogOpen(true);

        // 清除 storage
        await browser.storage.local.remove('pendingPromptContent');
      }
    };

    checkPendingPrompt();

    // 监听消息（针对页面已打开的情况）
    const handleMessage = (message: any) => {
      if (message.type === 'OPEN_ADD_PROMPT') {
        const content = message.content;
        const newPrompt: any = {
          title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
          content: content,
          description: '',
          tags: [],
          categoryId: 'default',
          enabled: true,
          isPinned: false
        };
        setEditingPrompt(newPrompt);
        setIsDialogOpen(true);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    // 监听 visibility change (针对页面在后台但被激活的情况)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkPendingPrompt();
      }
    });

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const filteredPrompts = useMemo(() => {
    const filtered = prompts.filter(prompt => {
      const matchesSearch =
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || categoryMap[prompt.categoryId]?.id === selectedCategory
      return matchesSearch && matchesCategory
    })

    return filtered.sort((a, b) => {
      // First sort by pinned status
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);

      switch (sortOption) {
        case 'title':
          return a.title.localeCompare(b.title, 'zh-CN')
        case 'createTime':
          return (b.createTime || '').localeCompare(a.createTime || '')
        case 'lastModified':
          return (b.lastModified || '').localeCompare(a.lastModified || '')
        case 'category':
          const catA = categoryMap[a.categoryId]?.name || ''
          const catB = categoryMap[b.categoryId]?.name || ''
          return catA.localeCompare(catB, 'zh-CN')
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0)
        default:
          return 0
      }
    })
  }, [searchTerm, selectedCategory, prompts, categoryMap, sortOption])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, sortOption])

  const paginatedPrompts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPrompts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPrompts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage)

  const filterCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return a.name.localeCompare(b.name, 'zh-CN');
    });
    return [{ id: 'all', name: t('content.allCategories') }, ...sorted]
  }, [categories, t])

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
  }[columns]

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.color || 'bg-slate-400'
  }

  const handleCopy = (prompt: Prompt) => {
    navigator.clipboard.writeText(prompt.content)
    toast.success(t('content.copySuccess'))
    incrementUsage(prompt.id)
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingPrompt(null)
    setIsDialogOpen(true)
  }

  const handleSave = async (prompt: Prompt) => {
    // Check for new tags and add them to db.tags
    if (prompt.tags && prompt.tags.length > 0) {
      const existingTagNames = new Set(tags.map(t => t.name));
      const newTags = prompt.tags.filter(t => !existingTagNames.has(t));

      if (newTags.length > 0) {
        const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
        await db.tags.bulkAdd(newTags.map(name => ({
          id: crypto.randomUUID(),
          name,
          createTime: now,
          lastModified: now
        })));
      }
    }

    if (editingPrompt) {
      await db.prompts.put(prompt)
      toast.success(t('content.updateSuccess'))
    } else {
      await db.prompts.add(prompt)
      toast.success(t('content.createSuccess'))
    }
    setIsDialogOpen(false)
    setEditingPrompt(null)
  }

  const handleDelete = (id: string) => {
    setPromptToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (promptToDelete) {
      await db.prompts.delete(promptToDelete)
      toast.success(t('content.deleteSuccess'))
      setDeleteDialogOpen(false)
      setPromptToDelete(null)
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    // 如果是开启操作，需要检查分类和标签的状态
    if (enabled) {
      const prompt = prompts.find(p => p.id === id)
      if (!prompt) return

      const category = categoryMap[prompt.categoryId]
      const categoryDisabled = category && category.enabled === false

      let tagsDisabled = false
      if (prompt.tags && prompt.tags.length > 0) {
        tagsDisabled = prompt.tags.some(tagName => {
          const tag = tagMap[tagName]
          return tag && tag.enabled === false
        })
      }

      if (categoryDisabled && tagsDisabled) {
        toast.error(t('content.categoryAndTagDisabled'))
        return
      }
      if (categoryDisabled) {
        toast.error(t('content.categoryDisabled'))
        return
      }
      if (tagsDisabled) {
        toast.error(t('content.tagDisabled'))
        return
      }
    }

    await db.prompts.update(id, { enabled })
    toast.success(enabled ? t('content.enableSuccess') : t('content.disableSuccess'))
  }

  const handleTogglePinned = async (prompt: Prompt) => {
    await db.prompts.update(prompt.id, { isPinned: !prompt.isPinned })
    toast.success(prompt.isPinned ? t('content.unpinSuccess') : t('content.pinSuccess'))
  }

  if (settingsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 h-full'>
      {/* Header Stats */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4'>
          <h1 className='text-2xl font-bold'>{t('content.title')}</h1>
          <div className='flex flex-wrap gap-2 text-sm'>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkEnable}>{t('common.bulkEnable')}</Button>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkDisable}>{t('common.bulkDisable')}</Button>
            <Badge variant="outline" className='bg-slate-100 text-slate-700 border-slate-200'>{t('content.totalPrompts').replace('$1', prompts.length.toString())}</Badge>
            <Badge variant="outline" className='bg-[#AFC2DB]/20 text-[#6B85A8] border-[#AFC2DB]/40'>{t('content.enabledCount').replace('$1', prompts.filter(p => p.enabled).length.toString())}</Badge>
          </div>
        </div>
        <p className='text-muted-foreground text-sm'>{t('content.subtitle')}</p>
      </div>

      {/* Toolbar */}
      <div className='flex flex-row gap-4 items-center justify-between bg-card p-3 rounded-lg border shadow-sm'>
        <div className='flex gap-2 flex-1 w-auto overflow-x-auto no-scrollbar'>
          <div className='relative min-w-[160px] sm:w-[200px] lg:w-[240px]'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('common.search')}
              className='pl-8 h-9'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-9 w-9 xl:w-[110px] p-0 xl:px-3 justify-center xl:justify-between shrink-0'>
                <span className="hidden xl:inline truncate max-w-[70px]">
                  {selectedCategory === 'all' ? t('content.allCategories') : categoryMap[selectedCategory]?.name || t('content.unknownCategory')}
                </span>
                <Rows3 className='h-4 w-4 opacity-50 xl:ml-1.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {filterCategories.map(category => (
                <DropdownMenuItem key={category.id} onClick={() => setSelectedCategory(category.id)}>
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size='sm' className="h-9 w-9 xl:w-[90px] p-0 xl:px-3 justify-center xl:justify-between shrink-0">
                <span className="flex items-center justify-center">
                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                  <span className="hidden xl:inline ml-1.5">{t('common.sort')}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption('title')}>
                {t('content.sortByTitle')} {sortOption === 'title' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('createTime')}>
                {t('common.createTime')} {sortOption === 'createTime' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('lastModified')}>
                {t('common.lastModified')} {sortOption === 'lastModified' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('category')}>
                {t('content.category')} {sortOption === 'category' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('usage')}>
                {t('content.sortByUsage')} {sortOption === 'usage' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='flex items-center gap-2 shrink-0 w-auto justify-end'>
          <div className="flex items-center gap-2">
            {/* Column Selector */}
            {!settingsLoading && appearance.viewMode === 'card' && (
              <div className={cn(
                "hidden sm:flex items-center border rounded-md p-0.5 bg-background shrink-0",
                maxAvailableColumns <= 1 && "hidden" // Double check just in case
              )}>
                {Array.from({ length: maxAvailableColumns }, (_, i) => i + 1).map(col => (
                  <button
                    key={col}
                    onClick={() => setColumns(col)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium rounded transition-colors hover:bg-muted min-w-[20px]",
                      Math.min(columns, maxAvailableColumns) === col && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    title={t('content.columns').replace('$1', col.toString())}
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center border rounded-md p-0.5 bg-background shrink-0">
              <button
                onClick={() => updateAppearance({ viewMode: 'card' })}
                className={cn(
                  "p-1 rounded transition-colors hover:bg-muted",
                  appearance.viewMode === 'card' && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title={t('common.cardView')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => updateAppearance({ viewMode: 'list' })}
                className={cn(
                  "p-1 rounded transition-colors hover:bg-muted",
                  appearance.viewMode === 'list' && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title={t('common.listView')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.xlsx,.xls,.csv"
              onChange={(e) => handleFileSelect(e, 'library')}
            />

            {/* Separate Buttons (Visible on LG screens and up) */}
            <div className="hidden lg:flex items-center gap-2">
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
                  <DropdownMenuItem onClick={() => exportData(prompts, 'library', 'json')}>
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData(prompts.map(p => ({
                    ...p,
                    categoryName: categoryMap[p.categoryId]?.name || ''
                  })), 'library', 'xlsx')}>
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData(prompts.map(p => ({
                    ...p,
                    categoryName: categoryMap[p.categoryId]?.name || ''
                  })), 'library', 'csv')}>
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size='sm' onClick={handleAdd} className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
                <Plus className='h-4 w-4 xl:mr-1.5' />
                <span className="hidden xl:inline text-xs">{t('common.new')}</span>
              </Button>
            </div>

            {/* Merged Actions Menu (Visible on smaller screens) */}
            <div className="flex lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">{t('common.actions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.new')}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download className="mr-2 h-4 w-4" />
                      {t('common.import')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        {t('common.localImport')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setImportUrlDialogOpen(true)}>
                        {t('common.urlImport')}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem onClick={() => exportData(prompts.map(p => ({
                    ...p,
                    categoryName: categoryMap[p.categoryId]?.name || ''
                  })), 'library')}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('common.export')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {appearance.viewMode === 'list' ? (
        <div className="rounded-md border bg-card">
          {/* List Header */}
          <div className="flex items-center px-4 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <div className="flex-1 min-w-[160px] max-w-[500px] px-2">
              {t('common.name')}
              <span className="hidden sm:inline"> / {t('common.description')}</span>
            </div>
            <div className="w-[120px] px-2 hidden md:block">{t('content.category')}</div>
            <div className="w-[120px] px-2 hidden lg:block">{t('tagManagement')}</div>
            <div className="w-[80px] px-2 hidden xl:block text-right">{t('content.sortByUsage')}</div>
            <div className="w-[140px] px-2 hidden xl:block text-right">{t('common.lastModified')}</div>
            <div className="w-[80px] px-2 text-center">{t('common.enable')}</div>
            <div className="w-[100px] px-2 text-right">{t('common.actions')}</div>
          </div>

          {/* List Rows */}
          <div className="divide-y">
            {paginatedPrompts.map(prompt => (
              <div key={prompt.id} className="flex items-center px-4 py-3 hover:bg-muted/50 transition-colors group">
                {/* Title & Description */}
                <div className="flex-1 min-w-[160px] max-w-[500px] px-2 flex flex-col gap-2 pr-4">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="cursor-help group/item">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold truncate text-foreground group-hover/item:text-primary transition-colors">{prompt.title}</span>
                          {prompt.isPinned && <Pin className="h-3.5 w-3.5 text-primary rotate-45 shrink-0" />}
                        </div>

                        {prompt.description && (
                          <p className="text-sm text-muted-foreground truncate leading-none mt-1">{prompt.description}</p>
                        )}

                        <div className="hidden sm:block text-xs text-muted-foreground/80 font-mono bg-muted/30 px-2 py-1.5 rounded border w-full truncate mt-1">
                          {prompt.content}
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 sm:w-96 p-0 overflow-hidden" align="start">
                      <ScrollArea className="max-h-[320px] w-full">
                        <div className="p-4 space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              {prompt.title}
                              {prompt.isPinned && <Pin className="h-3 w-3 text-primary rotate-45" />}
                            </h4>
                            {prompt.description && (
                              <p className="text-xs text-muted-foreground mt-1">{prompt.description}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('common.content' as any)}</span>
                            <div className="text-xs font-mono bg-muted/50 p-2.5 rounded border break-words break-all whitespace-pre-wrap">
                              {prompt.content}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2">
                            <span>{t('common.createdOn').replace('$1', prompt.createTime?.split(' ')[0] || '')}</span>
                            <span className="font-mono">ID: {prompt.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </ScrollArea>
                    </HoverCardContent>
                  </HoverCard>
                </div>

                {/* Category */}
                <div className="w-[120px] px-2 hidden md:block shrink-0">
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <span className={cn('w-2 h-2 rounded-full shrink-0', getCategoryColor(prompt.categoryId))}></span>
                    <span className="truncate">{categoryMap[prompt.categoryId]?.name || t('content.unknownCategory')}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="w-[120px] px-2 hidden lg:block shrink-0">
                  <div className='flex flex-wrap gap-1 max-h-[22px] overflow-hidden'>
                    {prompt.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant='secondary' className='text-[10px] font-normal px-1 py-0 h-5 whitespace-nowrap'>
                        #{tag}
                      </Badge>
                    ))}
                    {prompt.tags.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{prompt.tags.length - 2}</span>
                    )}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="w-[80px] px-2 hidden xl:block text-right shrink-0">
                  <div className="text-xs text-muted-foreground flex items-center justify-end gap-1" title={t('content.sortByUsage')}>
                    <BarChart2 className="h-3 w-3" />
                    {prompt.usageCount || 0}
                  </div>
                </div>

                {/* Last Modified */}
                <div className="w-[140px] px-2 hidden xl:block text-right shrink-0">
                  <div className="text-xs text-muted-foreground flex flex-col items-end">
                    <span>{prompt.lastModified?.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-70">{prompt.lastModified?.split(' ')[1]}</span>
                  </div>
                </div>

                {/* Enable Switch */}
                <div className="w-[80px] px-2 flex justify-center shrink-0">
                  <Switch
                    checked={prompt.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(prompt.id, checked)}
                    className="scale-75 origin-center"
                  />
                </div>

                {/* Actions */}
                <div className="w-[100px] px-2 flex justify-end gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(prompt)} title={t('common.copy')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(prompt)} title={t('common.edit')}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(prompt.id)} title={t('common.delete')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={gridRef} className={cn('grid gap-4', gridColsClass)}>
          {paginatedPrompts.map(prompt => (
            <Card key={prompt.id} className='flex flex-col shadow-sm hover:shadow-md transition-shadow group'>
              <CardHeader className='pb-2 pt-4 px-4'>
                <div className='flex flex-col gap-2'>
                  <div className='flex justify-between items-center gap-2'>
                    <CardTitle className='text-lg font-bold truncate flex-1 min-w-0' title={prompt.title}>
                      {prompt.title}
                    </CardTitle>
                    <div className='shrink-0'>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border'>
                        <span className={cn('w-2 h-2 rounded-full', getCategoryColor(prompt.categoryId))}></span>
                        {categoryMap[prompt.categoryId]?.name || t('content.unknownCategory')}
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {prompt.tags.map(tag => (
                      <Badge key={tag} variant='secondary' className='text-xs font-normal text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200 px-1.5 py-0 whitespace-nowrap border'>
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='flex-1 pb-2 px-4'>
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <p
                      className='text-sm text-muted-foreground line-clamp-1 mb-3 cursor-help'
                    >
                      {prompt.description || prompt.content}
                    </p>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-0 overflow-hidden">
                    <ScrollArea className="h-[200px] w-full">
                      <div className="space-y-1 p-4">
                        <p className="text-sm text-muted-foreground break-words break-all whitespace-pre-wrap">
                          {prompt.description || prompt.content}
                        </p>
                      </div>
                    </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
                <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                  <div className='flex items-center gap-1.5'>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t('common.createdOn').replace('$1', prompt.createTime || '')}</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t('common.modifiedOn').replace('$1', prompt.lastModified || '')}</span>
                  </div>
                  <div className='flex items-center gap-1.5' title={t('content.sortByUsage')}>
                    <BarChart2 className="h-3.5 w-3.5" />
                    <span>{prompt.usageCount || 0}</span>
                  </div>
                  {(prompt.author || prompt.source) && (
                    <div className='flex items-center gap-3 mt-1 pt-1 border-t border-dashed'>
                      {prompt.author && (
                        <div className='flex items-center gap-1.5' title={t('content.author')}>
                          <User className="h-3.5 w-3.5" />
                          <span>{prompt.author}</span>
                        </div>
                      )}
                      {prompt.source && (
                        <div className='flex items-center gap-1.5' title={t('content.source')}>
                          <Globe className="h-3.5 w-3.5" />
                          <span>{prompt.source}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className='pt-2 pb-4 px-4 flex justify-between items-center mt-auto gap-2'>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={prompt.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(prompt.id, checked)}
                    className="scale-90 origin-left shrink-0"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{prompt.enabled ? t('common.enabled') : t('common.disabled')}</span>
                </div>
                <div className="flex gap-1.5 opacity-100 transition-opacity w-full justify-end">
                  {layoutMode === 'dropdown' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                          {t('common.actions')} <MoreHorizontal className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTogglePinned(prompt)}>
                          {prompt.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                          {prompt.isPinned ? t('common.unpin') : t('common.pin')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(prompt)}><Copy className="mr-2 h-4 w-4" /> {t('common.copy')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(prompt)}><Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-muted-foreground hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10" onClick={() => handleDelete(prompt.id)}><Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-8 px-2 text-xs flex items-center gap-1", prompt.isPinned && "text-primary border-transparent bg-primary/10")}
                        onClick={() => handleTogglePinned(prompt)}
                        title={prompt.isPinned ? t('common.unpin') : t('common.pin')}
                      >
                        {prompt.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        {layoutMode === 'full' && (
                          <span>{prompt.isPinned ? t('common.unpin') : t('common.pin')}</span>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1" onClick={() => handleCopy(prompt)} title={t('common.copy')}>
                        <Copy className="h-3.5 w-3.5" />
                        {layoutMode === 'full' && (
                          <span>{t('common.copy')}</span>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1" onClick={() => handleEdit(prompt)} title={t('common.edit')}>
                        <Pencil className="h-3.5 w-3.5" />
                        {layoutMode === 'full' && (
                          <span>{t('common.edit')}</span>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 flex items-center gap-1" onClick={() => handleDelete(prompt.id)} title={t('common.delete')}>
                        <Trash2 className="h-3.5 w-3.5" />
                        {layoutMode === 'full' && (
                          <span>{t('common.delete')}</span>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      {filteredPrompts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          {t('content.noPromptsFound')}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredPrompts.length > 0 && (
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between py-4 gap-4">
          <div className="text-sm text-muted-foreground">
            {t('common.totalItems').replace('$1', filteredPrompts.length.toString())}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t('common.rowsPerPage')}</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap px-2">
                {t('common.page')} {currentPage} {t('common.pageOf')} {totalPages} {t('common.pageSuffix')}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <ImportUrlDialog
        open={importUrlDialogOpen}
        onOpenChange={setImportUrlDialogOpen}
        onImport={(url) => importFromUrl(url, 'library')}
      />

      <PromptDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        prompt={editingPrompt}
        categories={categories}
        tags={tags}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('content.deleteTitle')}
        description={t('content.deleteConfirm')}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
