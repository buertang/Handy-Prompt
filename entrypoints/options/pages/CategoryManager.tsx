import { useState } from 'react'
import {
  Search,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  FileText,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { CategoryDialog, type Category } from '@/components/category-dialog'

// 模拟数据
const mockCategories: Category[] = [
  {
    id: 'default',
    name: '默认',
    description: '系统默认分类，用于存放未分类的提示词',
    promptCount: 0,
    enabled: true,
    isDefault: true,
    color: 'bg-indigo-500'
  },
  {
    id: 'coding',
    name: '编程开发',
    description: '编程、代码相关的提示词，包含各种语言和框架的助手',
    promptCount: 2,
    enabled: true,
    isDefault: false,
    color: 'bg-emerald-500'
  },
  {
    id: 'drawing',
    name: '绘画',
    description: '绘画相关的提示词，包含Midjourney、Stable Diffusion等',
    promptCount: 1,
    enabled: true,
    isDefault: false,
    color: 'bg-amber-500'
  }
]

export default function CategoryManager() {
  const [categories, setCategories] = useState(mockCategories)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // 统计数据
  const totalCategories = categories.length
  const enabledCategories = categories.filter(c => c.enabled).length
  const totalPrompts = categories.reduce((acc, curr) => acc + curr.promptCount, 0)

  // 过滤分类
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const handleSave = (category: Category) => {
    if (editingCategory) {
      // 编辑模式
      setCategories(prev => prev.map(c => c.id === category.id ? category : c))
    } else {
      // 新增模式
      setCategories(prev => [...prev, category])
    }
    setIsDialogOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 头部区域 */}
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

      {/* 工具栏 */}
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

      {/* 分类列表网格 */}
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
                {category.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-md">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{category.promptCount} 个提示词</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.enabled}
                    onCheckedChange={() => { }}
                    className="data-[state=checked]:bg-primary"
                    disabled // 在列表页禁用，需进入编辑页修改
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
                <Button variant="ghost" size="sm" className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 删除
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 编辑/新增分类对话框 */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        onSave={handleSave}
      />
    </div>
  )
}
