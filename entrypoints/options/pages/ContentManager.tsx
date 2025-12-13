import { useState, useMemo, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Prompt, type Category } from '@/lib/db'
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
  PinOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { PromptDialog } from '@/components/prompt-dialog'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'

export default function ContentManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortOption, setSortOption] = useState<'title' | 'createTime' | 'lastModified' | 'category'>('createTime')
  const [columns, setColumns] = useState(3)
  const [maxAvailableColumns, setMaxAvailableColumns] = useState(5)
  const [layoutMode, setLayoutMode] = useState<'dropdown' | 'icon' | 'full'>('full')

  const gridRef = useRef<HTMLDivElement>(null)

  // Calculate layout mode using ResizeObserver on the grid container
  // Also handles maxAvailableColumns logic
  useEffect(() => {
    if (!gridRef.current) return

    const calculateLayout = (containerWidth: number) => {
      const width = window.innerWidth

      // 1. Update max available columns based on window width
      let maxCols = 1
      if (width >= 1536) maxCols = 5 // 2xl
      else if (width >= 1280) maxCols = 4 // xl
      else if (width >= 1024) maxCols = 3 // lg
      else if (width >= 640) maxCols = 2 // sm

      setMaxAvailableColumns(maxCols)

      // 2. Determine actual columns being rendered
      // The logic matches Tailwind classes: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ...
      // actualColumns is the MIN of (user selected columns, max available columns for this width)
      const actualColumns = Math.min(columns, maxCols)

      // 3. Calculate card width
      const gap = 16
      const cardWidth = (containerWidth - (gap * (actualColumns - 1))) / actualColumns

      // 4. Set layout mode based on thresholds
      if (cardWidth < 280) {
        setLayoutMode('dropdown')
      } else if (cardWidth < 500) {
        setLayoutMode('icon')
      } else {
        setLayoutMode('full')
      }
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        calculateLayout(entry.contentRect.width)
      }
    })

    observer.observe(gridRef.current)

    // Initial calculation
    calculateLayout(gridRef.current.getBoundingClientRect().width)

    return () => observer.disconnect()
  }, [columns])

  // Auto-adjust columns if window shrinks
  useEffect(() => {
    if (columns > maxAvailableColumns) {
      setColumns(maxAvailableColumns)
    }
  }, [maxAvailableColumns, columns])

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

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null)

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
        default:
          return 0
      }
    })
  }, [searchTerm, selectedCategory, prompts, categoryMap, sortOption])

  const filterCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return a.name.localeCompare(b.name, 'zh-CN');
    });
    return [{ id: 'all', name: '所有分类' }, ...sorted]
  }, [categories])

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
  }[columns]

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      '风格化': 'bg-orange-400',
      '编程': 'bg-green-500',
      '办公': 'bg-blue-500',
      '教育': 'bg-purple-500'
    }
    return colors[categoryName] || 'bg-gray-400'
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // You might want to show a toast here, but for now we'll just copy
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
    } else {
      await db.prompts.add(prompt)
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
      setDeleteDialogOpen(false)
      setPromptToDelete(null)
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await db.prompts.update(id, { enabled })
  }

  const handleTogglePinned = async (prompt: Prompt) => {
    await db.prompts.update(prompt.id, { isPinned: !prompt.isPinned })
  }


  return (
    <div className='flex flex-col gap-6 h-full'>
      {/* Header Stats */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4'>
          <h1 className='text-2xl font-bold'>提示词库</h1>
          <div className='flex flex-wrap gap-2 text-sm'>
            <Badge variant="outline" className='bg-green-50 text-green-700 border-green-200'>总计 {prompts.length} 个提示词</Badge>
            <Badge variant="outline" className='bg-blue-50 text-blue-700 border-blue-200'>启用 {prompts.filter(p => p.enabled).length} 个</Badge>
          </div>
        </div>
        <p className='text-muted-foreground text-sm'>在网页输入框中通过指令快速插入预设的 Prompt 内容。</p>
      </div>

      {/* Toolbar */}
      <div className='flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between bg-card p-3 rounded-lg border shadow-sm'>
        <div className='flex gap-2 flex-1 w-full sm:w-auto overflow-x-auto no-scrollbar'>
          <div className='relative min-w-[160px] sm:w-[200px] lg:w-[240px]'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索...'
              className='pl-8 h-9'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-9 w-9 xl:w-[110px] p-0 xl:px-3 justify-center xl:justify-between shrink-0'>
                <span className="hidden xl:inline truncate max-w-[70px]">
                  {selectedCategory === 'all' ? '所有分类' : categoryMap[selectedCategory]?.name || '未知分类'}
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
                  <span className="hidden xl:inline ml-1.5">排序</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption('title')}>
                标题 {sortOption === 'title' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('createTime')}>
                创建时间 {sortOption === 'createTime' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('lastModified')}>
                最近修改 {sortOption === 'lastModified' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('category')}>
                分类 {sortOption === 'category' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='flex flex-wrap items-center gap-2 shrink-0'>
          {/* Column Selector */}
          {maxAvailableColumns > 1 && (
            <div className="flex items-center border rounded-md p-0.5 bg-background mr-1">
              {Array.from({ length: maxAvailableColumns }, (_, i) => i + 1).map(col => (
                <button
                  key={col}
                  onClick={() => setColumns(col)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded transition-colors hover:bg-muted min-w-[20px]",
                    columns === col && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  title={`${col}栏视图`}
                >
                  {col}
                </button>
              ))}
            </div>
          )}

          <Button variant='outline' size='sm' className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
            <Upload className='h-4 w-4 xl:mr-1.5' />
            <span className="hidden xl:inline text-xs">导出</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
                <Download className='h-4 w-4 xl:mr-1.5' />
                <span className="hidden xl:inline text-xs">导入</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>本地导入</DropdownMenuItem>
              <DropdownMenuItem>远程导入</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size='sm' onClick={handleAdd} className="h-9 w-9 xl:w-auto p-0 xl:px-3 shrink-0">
            <Plus className='h-4 w-4 xl:mr-1.5' />
            <span className="hidden xl:inline text-xs">新建</span>
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      <div ref={gridRef} className={cn('grid gap-4', gridColsClass)}>
        {filteredPrompts.map(prompt => (
          <Card key={prompt.id} className='flex flex-col shadow-sm hover:shadow-md transition-shadow group'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <div className='flex flex-col gap-2'>
                <div className='flex justify-between items-center gap-2'>
                  <CardTitle className='text-lg font-bold truncate flex-1 min-w-0' title={prompt.title}>
                    {prompt.title}
                  </CardTitle>
                  <div className='shrink-0'>
                    <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border'>
                      <span className={cn('w-2 h-2 rounded-full', getCategoryColor(categoryMap[prompt.categoryId]?.name || '默认'))}></span>
                      {categoryMap[prompt.categoryId]?.name || '未知'}
                    </div>
                  </div>
                </div>
                <div className='flex flex-wrap gap-1'>
                  {prompt.tags.map(tag => (
                    <Badge key={tag} variant='secondary' className='text-xs font-normal text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0 whitespace-nowrap'>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className='flex-1 pb-2 px-4'>
              <p className='text-sm text-muted-foreground line-clamp-1 mb-3'>
                {prompt.description || prompt.content}
              </p>
              <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                <div className='flex items-center gap-1.5'>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>创建于: {prompt.createTime}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Clock className="h-3.5 w-3.5" />
                  <span>修改于: {prompt.lastModified}</span>
                </div>
                {(prompt.author || prompt.source) && (
                  <div className='flex items-center gap-3 mt-1 pt-1 border-t border-dashed'>
                    {prompt.author && (
                      <div className='flex items-center gap-1.5' title="作者">
                        <User className="h-3.5 w-3.5" />
                        <span>{prompt.author}</span>
                      </div>
                    )}
                    {prompt.source && (
                      <div className='flex items-center gap-1.5' title="来源">
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">{prompt.enabled ? '已启用' : '已禁用'}</span>
              </div>
              <div className="flex gap-1.5 opacity-100 transition-opacity w-full justify-end">
                {layoutMode === 'dropdown' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        操作 <MoreHorizontal className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTogglePinned(prompt)}>
                        {prompt.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        {prompt.isPinned ? '取消置顶' : '置顶'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy(prompt.content)}><Copy className="mr-2 h-4 w-4" /> 复制</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(prompt)}><Pencil className="mr-2 h-4 w-4" /> 编辑</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(prompt.id)}><Trash2 className="mr-2 h-4 w-4" /> 删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-8 px-2 text-xs flex items-center gap-1", prompt.isPinned && "text-primary border-primary bg-primary/10")}
                      onClick={() => handleTogglePinned(prompt)}
                      title={prompt.isPinned ? "取消置顶" : "置顶"}
                    >
                      {prompt.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      {layoutMode === 'full' && (
                        <span>{prompt.isPinned ? "取消置顶" : "置顶"}</span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1" onClick={() => handleCopy(prompt.content)} title="复制">
                      <Copy className="h-3.5 w-3.5" />
                      {layoutMode === 'full' && (
                        <span>复制</span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1" onClick={() => handleEdit(prompt)} title="编辑">
                      <Pencil className="h-3.5 w-3.5" />
                      {layoutMode === 'full' && (
                        <span>编辑</span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive flex items-center gap-1" onClick={() => handleDelete(prompt.id)} title="删除">
                      <Trash2 className="h-3.5 w-3.5" />
                      {layoutMode === 'full' && (
                        <span>删除</span>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {filteredPrompts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          没有找到匹配的提示词
        </div>
      )}

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
        title="删除提示词"
        description="确定要删除这个提示词吗？此操作无法撤销。"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
