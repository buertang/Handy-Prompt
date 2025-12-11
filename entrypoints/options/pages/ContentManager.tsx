import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  LayoutGrid,
  Rows3,
  Clock,
  ArrowUp
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

// Mock Data Types
type Prompt = {
  id: string
  title: string
  tags: string[]
  content: string
  description?: string
  lastModified: string
  enabled: boolean
  category: string
}

// Mock Data
const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: '吉卜力风格',
    tags: ['画图', '吉卜力'],
    content: '将图片转换为吉卜力风格...',
    description: '将图片转换为吉卜力风格',
    lastModified: '无修改时间',
    enabled: true,
    category: '风格化'
  },
  {
    id: '2',
    title: '代码解释',
    tags: ['编程'],
    content: '请解释以下代码的功能和工作原理：\n```\n...\n```',
    description: '请解释以下代码的功能和工作原理',
    lastModified: '无修改时间',
    enabled: true,
    category: '编程'
  },
  {
    id: '3',
    title: '开发角色',
    tags: ['编程', '变量'],
    content: '你现在是一个{{角色}}，有着{{年限}}年的开发经验，擅长{{技能}}。',
    description: '你现在是一个{{角色}}，有着{{年限}}年的开发经验，擅长{{技能}}。',
    lastModified: '无修改时间',
    enabled: true,
    category: '编程'
  },
  {
    id: '4',
    title: '周报生成器',
    tags: ['办公', '写作'],
    content: '请根据以下工作内容生成一份周报...',
    description: '快速生成高质量周报',
    lastModified: '2024-03-20',
    enabled: false,
    category: '办公'
  },
  {
    id: '5',
    title: '英语口语教练',
    tags: ['语言', '教育'],
    content: '你是一位专业的英语口语教练...',
    description: '练习英语口语对话',
    lastModified: '2024-03-21',
    enabled: true,
    category: '教育'
  }
]

export default function ContentManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [columns, setColumns] = useState(3)
  const [prompts, setPrompts] = useState(mockPrompts)

  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => {
      const matchesSearch =
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory, prompts])

  const categories = ['all', ...Array.from(new Set(prompts.map(p => p.category)))]

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
  }[columns]

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '风格化': 'bg-orange-400',
      '编程': 'bg-green-500',
      '办公': 'bg-blue-500',
      '教育': 'bg-purple-500'
    }
    return colors[category] || 'bg-gray-400'
  }

  return (
    <div className='flex flex-col gap-6 h-full'>
      {/* Header Stats */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <h1 className='text-2xl font-bold'>提示词库</h1>
          <div className='flex gap-2 text-sm'>
            <Badge variant="outline" className='bg-green-50 text-green-700 border-green-200'>总计 {prompts.length} 个提示词</Badge>
            <Badge variant="outline" className='bg-blue-50 text-blue-700 border-blue-200'>启用 {prompts.filter(p => p.enabled).length} 个</Badge>
          </div>
        </div>
        <p className='text-muted-foreground text-sm'>在网页输入框中通过指令快速插入预设的 Prompt 内容。</p>
      </div>

      {/* Toolbar */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border shadow-sm'>
        <div className='flex gap-2 flex-1 w-full sm:w-auto'>
          <div className='relative flex-1 sm:max-w-xs'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜索提示词...'
              className='pl-8'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='w-[120px] justify-between'>
                {selectedCategory === 'all' ? '所有分类' : selectedCategory}
                <Rows3 className='h-4 w-4 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>所有分类</DropdownMenuItem>
              <DropdownMenuSeparator />
              {categories.filter(c => c !== 'all').map(category => (
                <DropdownMenuItem key={category} onClick={() => setSelectedCategory(category)}>
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {/* Column Selector */}
          <div className="flex items-center border rounded-md p-1 bg-background mr-2">
            {[1, 2, 3, 4, 5].map(col => (
              <button
                key={col}
                onClick={() => setColumns(col)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors hover:bg-muted",
                  columns === col && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title={`${col}栏视图`}
              >
                {col}
              </button>
            ))}
          </div>

          <Button variant='outline' size='sm'>
            <Upload className='mr-2 h-4 w-4' />
            导出
          </Button>
          <Button variant='outline' size='sm'>
            <Download className='mr-2 h-4 w-4' />
            本地导入
          </Button>
          <Button variant='outline' size='sm'>
            <Download className='mr-2 h-4 w-4' />
            远程导入
          </Button>
          <Button size='sm'>
            <Plus className='mr-2 h-4 w-4' />
            新增提示词
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      <div className={cn('grid gap-4', gridColsClass)}>
        {filteredPrompts.map(prompt => (
          <Card key={prompt.id} className='flex flex-col shadow-sm hover:shadow-md transition-shadow'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <div className='flex justify-between items-start gap-2'>
                <div className='flex flex-col gap-2 flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <CardTitle className='text-lg font-bold truncate max-w-[120px]' title={prompt.title}>
                      {prompt.title}
                    </CardTitle>
                    <div className='flex flex-wrap gap-1 flex-1'>
                      {prompt.tags.map(tag => (
                        <Badge key={tag} variant='secondary' className='text-xs font-normal text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0 whitespace-nowrap'>
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='shrink-0'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border'>
                    <span className={cn('w-2 h-2 rounded-full', getCategoryColor(prompt.category))}></span>
                    {prompt.category}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='flex-1 pb-2 px-4'>
              <p className='text-sm text-muted-foreground line-clamp-1 mb-3'>
                {prompt.description || prompt.content}
              </p>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Clock className="h-3.5 w-3.5" />
                <span>最后修改时间: {prompt.lastModified}</span>
              </div>
            </CardContent>
            <CardFooter className='pt-2 pb-4 px-4 flex justify-between items-center mt-auto'>
              <div className="flex items-center gap-2">
                <Switch checked={prompt.enabled} onCheckedChange={() => { }} className="scale-90 origin-left" />
                <span className="text-xs text-muted-foreground">{prompt.enabled ? '已启用' : '已禁用'}</span>
              </div>
              <div className="flex gap-1.5">
                {/* Responsive Actions Logic */}
                {columns >= 3 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        操作 <MoreHorizontal className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><ArrowUp className="mr-2 h-4 w-4" /> 置顶</DropdownMenuItem>
                      <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> 复制</DropdownMenuItem>
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" /> 编辑</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> 删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1">
                      <ArrowUp className="h-3.5 w-3.5" /> 置顶
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> 复制
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center gap-1">
                      <Pencil className="h-3.5 w-3.5" /> 编辑
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> 删除
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
    </div>
  )
}
