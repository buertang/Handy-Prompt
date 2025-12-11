import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CategoryManager() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>分类管理</h1>
      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>分类管理功能开发中...</p>
        </CardContent>
      </Card>
    </div>
  )
}
