import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Settings() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>设置</h1>
      <Card>
        <CardHeader>
          <CardTitle>通用设置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>设置功能开发中...</p>
        </CardContent>
      </Card>
    </div>
  )
}
