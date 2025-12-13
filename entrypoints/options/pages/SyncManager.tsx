import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RefreshCw, CheckCircle2, AlertCircle, Upload, Download } from 'lucide-react'
import { browser } from 'wxt/browser'
import { db } from '@/lib/db'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PasswordInput from '@/components/shadcn-studio/input-password'
import ClearableInput from '@/components/shadcn-studio/input-clear'

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

const filterChinese = (value: string) => value.replace(/[\u4e00-\u9fff]/g, '')
const isPureNumber = (value: string) => /^\d+$/.test(value)
const isValidUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
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

  const notionDatabaseIdIsPureNumber = notionConfig.databaseId !== '' && isPureNumber(notionConfig.databaseId)

  const notionApiKeyInvalid = notionConfig.apiKey.trim().length === 0
  const notionDatabaseIdInvalid = notionConfig.databaseId.trim().length === 0 || notionDatabaseIdIsPureNumber
  const isNotionFormValid = !notionApiKeyInvalid && !notionDatabaseIdInvalid

  const webDavUrlInvalidFormat = webDavConfig.url !== '' && !isValidUrl(webDavConfig.url)

  const webDavUrlInvalid = webDavConfig.url.trim().length === 0 || webDavUrlInvalidFormat
  const webDavUsernameInvalid = webDavConfig.username.trim().length === 0
  const webDavPasswordInvalid = webDavConfig.password.trim().length === 0
  const isWebDavFormValid = !webDavUrlInvalid && !webDavUsernameInvalid && !webDavPasswordInvalid

  useEffect(() => {
    // Load saved configs
    browser.storage.sync.get(['notionConfig', 'webDavConfig']).then((result) => {
      if (result.notionConfig) setNotionConfig(result.notionConfig)
      if (result.webDavConfig) setWebDavConfig(result.webDavConfig)
    })
  }, [])

  const handleSyncNotion = async () => {
    setLoading(true)
    try {
      // 1. Get local count
      const localPromptsCount = await db.prompts.count()

      // 2. Query Notion DB (mock for now, or actual if permissions)
      // Since we need to judge import vs export:
      // - If Local > 0 && Remote == 0 => Export
      // - If Local == 0 && Remote > 0 => Import
      // - Else => Show dialog or default to Export (user can overwrite)

      // To check remote count, we need to make a request
      const response = await fetch(`https://api.notion.com/v1/databases/${notionConfig.databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionConfig.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 1 })
      })

      if (!response.ok) {
        throw new Error(`Notion API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const remotePromptsCount = data.results.length > 0 ? 1 : 0 // Rough check: is it empty?

      if (localPromptsCount > 0 && remotePromptsCount === 0) {
        toast.info('检测到本地有数据而 Notion 为空，开始导出...')
        // await exportToNotion()
        toast.success('导出成功 (模拟)')
      } else if (localPromptsCount === 0 && remotePromptsCount > 0) {
        toast.info('检测到 Notion 有数据而本地为空，开始导入...')
        // await importFromNotion()
        toast.success('导入成功 (模拟)')
      } else {
        toast.info(`本地: ${localPromptsCount}, Notion: ${remotePromptsCount > 0 ? '有数据' : '空'}。执行默认同步策略...`)
        // Default sync logic (e.g., merge)
      }

    } catch (error: any) {
      console.error(error)
      toast.error(`同步失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

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
                <PasswordInput
                  id="notion-key"
                  placeholder="secret_..."
                  value={notionConfig.apiKey}
                  onChange={(e) => setNotionConfig({ ...notionConfig, apiKey: filterChinese(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  在 <a href="https://www.notion.so/my-integrations" target="_blank" className="underline text-primary">Notion Integrations</a> 中创建并获取 Token，确保 Notion Integrations 具有读写权限。
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notion-db">Database ID</Label>
                <ClearableInput
                  id="notion-db"
                  placeholder="32位数据库ID"
                  value={notionConfig.databaseId}
                  onChange={(e) => setNotionConfig({ ...notionConfig, databaseId: filterChinese(e.target.value) })}
                  onClear={() => setNotionConfig({ ...notionConfig, databaseId: '' })}
                />
                <p className="text-xs text-muted-foreground">
                  从 Notion 数据库页面 URL 中提取 ID
                </p>
                {notionDatabaseIdIsPureNumber && (
                  <p className="text-xs text-destructive">
                    Database ID 不能为纯数字，请输入有效的 32 位 ID
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <Button variant="outline" disabled={!notionConfig.enabled || !isNotionFormValid} onClick={handleSyncNotion}>
                <RefreshCw className="mr-2 h-4 w-4" /> 立即同步
              </Button>
              <Button onClick={handleSaveNotion} disabled={loading || !isNotionFormValid}>
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
                <ClearableInput
                  id="webdav-url"
                  placeholder="https://dav.jianguoyun.com/dav/"
                  value={webDavConfig.url}
                  onChange={(e) => setWebDavConfig({ ...webDavConfig, url: filterChinese(e.target.value) })}
                  onClear={() => setWebDavConfig({ ...webDavConfig, url: '' })}
                />
                {webDavUrlInvalidFormat && (
                  <p className="text-xs text-destructive">
                    请输入有效的 URL (以 http:// 或 https:// 开头)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webdav-user">用户名</Label>
                  <ClearableInput
                    id="webdav-user"
                    placeholder="User / Email"
                    value={webDavConfig.username}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, username: filterChinese(e.target.value) })}
                    onClear={() => setWebDavConfig({ ...webDavConfig, username: '' })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webdav-pass">应用密码</Label>
                  <PasswordInput
                    id="webdav-pass"
                    placeholder="Password"
                    value={webDavConfig.password}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, password: filterChinese(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <div className="flex gap-2">
                <Button variant="outline" disabled={!webDavConfig.enabled || !isWebDavFormValid}>
                  <Upload className="mr-2 h-4 w-4" /> 备份
                </Button>
                <Button variant="outline" disabled={!webDavConfig.enabled || !isWebDavFormValid}>
                  <Download className="mr-2 h-4 w-4" /> 恢复
                </Button>
              </div>
              <Button onClick={handleSaveWebDav} disabled={loading || !isWebDavFormValid}>
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
