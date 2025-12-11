import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SyncManager() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>同步管理</h1>
      <Card>
        <CardHeader>
          <CardTitle>Notion 同步</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>Notion 同步功能开发中...</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>WebDAV 同步</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>WebDAV 同步功能开发中...</p>
        </CardContent>
      </Card>
    </div>
  )
}
