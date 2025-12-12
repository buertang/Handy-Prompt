import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RefreshCw, CheckCircle2, AlertCircle, Upload, Download } from 'lucide-react'
import { browser } from 'wxt/browser'

interface NotionConfig {
  apiKey: string
  databaseId: string
  enabled: boolean
}

interface WebDavConfig {
  url: string
  username: string
  password: string
  enabled: boolean
}

export default function SyncManager() {
  const [activeTab, setActiveTab] = useState('notion')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [notionConfig, setNotionConfig] = useState<NotionConfig>({
    apiKey: '',
    databaseId: '',
    enabled: false
  })

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>({
    url: '',
    username: '',
    password: '',
    enabled: false
  })

  useEffect(() => {
    // Load saved configs
    browser.storage.sync.get(['notionConfig', 'webDavConfig']).then((result) => {
      if (result.notionConfig) setNotionConfig(result.notionConfig)
      if (result.webDavConfig) setWebDavConfig(result.webDavConfig)
    })
  }, [])

  const handleSaveNotion = async () => {
    setLoading(true)
    try {
      await browser.storage.sync.set({ notionConfig })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWebDav = async () => {
    setLoading(true)
    try {
      await browser.storage.sync.set({ webDavConfig })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>同步管理</h1>
        <p className="text-muted-foreground text-sm">
          配置多端同步服务，保障数据安全与跨设备使用。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="notion">Notion 同步</TabsTrigger>
          <TabsTrigger value="webdav">WebDAV 备份</TabsTrigger>
        </TabsList>

        <TabsContent value="notion">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Notion 配置</CardTitle>
                  <CardDescription>将提示词同步到 Notion 数据库，支持双向同步。</CardDescription>
                </div>
                <Switch
                  checked={notionConfig.enabled}
                  onCheckedChange={(checked) => setNotionConfig({ ...notionConfig, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notion-key">Internal Integration Token</Label>
                <div className="relative">
                  <Input
                    id="notion-key"
                    type="password"
                    placeholder="secret_..."
                    value={notionConfig.apiKey}
                    onChange={(e) => setNotionConfig({ ...notionConfig, apiKey: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  在 <a href="https://www.notion.so/my-integrations" target="_blank" className="underline text-primary">Notion Integrations</a> 中创建并获取 Token。
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notion-db">Database ID</Label>
                <Input
                  id="notion-db"
                  placeholder="32位数据库ID"
                  value={notionConfig.databaseId}
                  onChange={(e) => setNotionConfig({ ...notionConfig, databaseId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  确保 Integration 已邀请到该数据库页面。
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <Button variant="outline" disabled={!notionConfig.enabled}>
                <RefreshCw className="mr-2 h-4 w-4" /> 立即同步
              </Button>
              <Button onClick={handleSaveNotion} disabled={loading}>
                {loading ? '保存中...' : (
                  saveStatus === 'success' ? <><CheckCircle2 className="mr-2 h-4 w-4" /> 已保存</> :
                    saveStatus === 'error' ? <><AlertCircle className="mr-2 h-4 w-4" /> 失败</> :
                      <><Save className="mr-2 h-4 w-4" /> 保存配置</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="webdav">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>WebDAV 配置</CardTitle>
                  <CardDescription>使用支持 WebDAV 协议的网盘（如坚果云、Nextcloud）进行备份。</CardDescription>
                </div>
                <Switch
                  checked={webDavConfig.enabled}
                  onCheckedChange={(checked) => setWebDavConfig({ ...webDavConfig, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webdav-url">服务器地址 (URL)</Label>
                <Input
                  id="webdav-url"
                  placeholder="https://dav.jianguoyun.com/dav/"
                  value={webDavConfig.url}
                  onChange={(e) => setWebDavConfig({ ...webDavConfig, url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webdav-user">用户名</Label>
                  <Input
                    id="webdav-user"
                    placeholder="User / Email"
                    value={webDavConfig.username}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webdav-pass">应用密码</Label>
                  <Input
                    id="webdav-pass"
                    type="password"
                    placeholder="Password"
                    value={webDavConfig.password}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, password: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <div className="flex gap-2">
                <Button variant="outline" disabled={!webDavConfig.enabled}>
                  <Upload className="mr-2 h-4 w-4" /> 备份
                </Button>
                <Button variant="outline" disabled={!webDavConfig.enabled}>
                  <Download className="mr-2 h-4 w-4" /> 恢复
                </Button>
              </div>
              <Button onClick={handleSaveWebDav} disabled={loading}>
                {loading ? '保存中...' : (
                  saveStatus === 'success' ? <><CheckCircle2 className="mr-2 h-4 w-4" /> 已保存</> :
                    saveStatus === 'error' ? <><AlertCircle className="mr-2 h-4 w-4" /> 失败</> :
                      <><Save className="mr-2 h-4 w-4" /> 保存配置</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
