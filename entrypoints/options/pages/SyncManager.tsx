import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RefreshCw, CheckCircle2, AlertCircle, Upload, Download } from 'lucide-react'
import { browser } from 'wxt/browser'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PasswordInput from '@/components/shadcn-studio/input-password'
import ClearableInput from '@/components/shadcn-studio/input-clear'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type NotionConfig, syncWithNotion, validateNotionConfig } from '@/lib/notion-sync'
import {
  type WebDavConfig,
  getWebDavClient,
  loadWebDavIndex,
  backupToWebDav,
  restoreFromWebDav,
  getBackupDisplayName
} from '@/lib/webdav-sync'

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
  const [activeTab, setActiveTab] = useState('webdav')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [configLoaded, setConfigLoaded] = useState(false)

  const [notionConfig, setNotionConfig] = useState<NotionConfig & { enabled: boolean }>({
    apiKey: '',
    databaseId: '',
    enabled: false
  })

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>({
    url: '',
    username: '',
    password: '',
    enabled: false,
    maxBackups: 30
  })

  const [backupFiles, setBackupFiles] = useState<string[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string>('')

  const notionDatabaseIdIsPureNumber = notionConfig.databaseId !== '' && isPureNumber(notionConfig.databaseId)

  const isNotionFormValid = validateNotionConfig(notionConfig)

  const webDavUrlInvalidFormat = webDavConfig.url !== '' && !isValidUrl(webDavConfig.url)

  const webDavUrlInvalid = webDavConfig.url.trim().length === 0 || webDavUrlInvalidFormat
  const webDavUsernameInvalid = webDavConfig.username.trim().length === 0
  const webDavPasswordInvalid = webDavConfig.password.trim().length === 0
  const isWebDavFormValid = !webDavUrlInvalid && !webDavUsernameInvalid && !webDavPasswordInvalid

  useEffect(() => {
    browser.storage.sync.get(['notionConfig', 'webDavConfig']).then((result) => {
      if (result.notionConfig) setNotionConfig(result.notionConfig)
      if (result.webDavConfig) {
        const cfg = result.webDavConfig as Partial<WebDavConfig>
        setWebDavConfig({
          url: cfg.url || '',
          username: cfg.username || '',
          password: cfg.password || '',
          enabled: !!cfg.enabled,
          maxBackups: cfg.maxBackups ?? 30
        })
      }
      setConfigLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (configLoaded && activeTab === 'webdav' && webDavConfig.enabled && isWebDavFormValid) {
      handleLoadWebDavBackups()
    }
  }, [activeTab, configLoaded])

  const handleLoadWebDavBackups = async () => {
    if (!webDavConfig.enabled || !isWebDavFormValid) return
    setLoading(true)
    try {
      const client = getWebDavClient(webDavConfig)
      const files = await loadWebDavIndex(client)
      if (!files.length) {
        toast.info('当前没有找到任何备份文件')
      }
      updateBackupListState(files)
    } catch (error: any) {
      console.error(error)
      toast.error('加载失败', {
        description: error.message || '网络或服务器错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNotion = async () => {
    setSyncing(true)
    try {
      // Auto save config
      await browser.storage.sync.set({ notionConfig })

      const result = await syncWithNotion(notionConfig)

      if (result.success) {
        toast.success(result.message, {
          description: `导出: ${result.details?.exported}, 导入: ${result.details?.imported}, 更新: ${result.details?.updated}`
        })
      } else {
        toast.error('同步失败', { description: result.message })
      }
    } catch (error: any) {
      console.error(error)
      toast.error(`同步失败: ${error.message}`)
    } finally {
      setSyncing(false)
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
      await saveWebDavConfigToStorage()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const updateBackupListState = (files: string[]) => {
    setBackupFiles(files)
    setSelectedBackup((prev) => {
      if (prev && files.includes(prev)) {
        return prev
      }
      if (files.length > 0) {
        return files[0]
      }
      return ''
    })
  }

  const saveWebDavConfigToStorage = async () => {
    await browser.storage.sync.set({ webDavConfig })
  }

  const handleWebDavBackup = async () => {
    if (!webDavConfig.enabled || !isWebDavFormValid) return
    setLoading(true)
    try {
      // Auto save config first
      await saveWebDavConfigToStorage()

      const result = await backupToWebDav(webDavConfig)

      toast.success('备份成功', {
        description: `已备份到 ${result.fileName}`,
      })

      updateBackupListState(result.nextIndex)
    } catch (error: any) {
      console.error(error)
      toast.error('备份失败', {
        description: error.message || '网络或服务器错误',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWebDavRestore = async () => {
    if (!webDavConfig.enabled || !isWebDavFormValid) return
    setLoading(true)
    try {
      // Auto save config first
      await saveWebDavConfigToStorage()

      const client = getWebDavClient(webDavConfig)
      let fileName = selectedBackup || ''

      let files: string[] = []
      try {
        files = await loadWebDavIndex(client)
        updateBackupListState(files)
      } catch (error) {
        console.error(error)
        toast.error('恢复失败', { description: '无法获取备份列表' })
        return
      }

      if (!files.length) {
        toast.error('恢复失败', { description: '没有找到任何备份文件' })
        return
      }

      if (!fileName) {
        fileName = files[0]
      }

      const result = await restoreFromWebDav(webDavConfig, fileName)

      toast.success('恢复成功', {
        description: `提示词 ${result.promptsCount} 条，分类 ${result.categoriesCount} 个，标签 ${result.tagsCount} 个`,
      })
    } catch (error: any) {
      console.error(error)
      toast.error('恢复失败', {
        description: error.message || '网络或服务器错误',
      })
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
          <TabsTrigger value="webdav">WebDAV 备份</TabsTrigger>
          <TabsTrigger value="notion">Notion 同步</TabsTrigger>
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
                <p className="text-xs text-muted-foreground">
                  注意：通过 Notion 双向同步的时间会被截断到分钟（秒固定为 00），本地操作和 WebDAV 备份仍会保留秒级精度。
                </p>
                {notionDatabaseIdIsPureNumber && (
                  <p className="text-xs text-destructive">
                    Database ID 不能为纯数字，请输入有效的 32 位 ID
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <Button variant="outline" disabled={!notionConfig.enabled || !isNotionFormValid || syncing} onClick={handleSyncNotion}>
                <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                {syncing ? '同步中...' : '立即同步'}
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
              <div className="space-y-2">
                <Label htmlFor="webdav-max">最多保留备份份数</Label>
                <Input
                  id="webdav-max"
                  type="number"
                  min={1}
                  max={999}
                  value={webDavConfig.maxBackups}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    const safe = Number.isNaN(value) ? 1 : Math.min(Math.max(value, 1), 999)
                    setWebDavConfig({ ...webDavConfig, maxBackups: safe })
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  超过此数量时，将自动删除最旧的备份，默认 30 份。
                </p>
              </div>
              <div className="space-y-2">
                <Label>云端备份列表</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择要恢复的备份..." />
                      </SelectTrigger>
                      <SelectContent>
                        {backupFiles.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">暂无备份文件</div>
                        ) : (
                          backupFiles.map(f => (
                            <SelectItem key={f} value={f}>
                              {getBackupDisplayName(f)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    disabled={!webDavConfig.enabled || !isWebDavFormValid || loading}
                    onClick={handleLoadWebDavBackups}
                    className="shrink-0"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  恢复时优先使用选中的备份，未选择时默认最新一份。
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!webDavConfig.enabled || !isWebDavFormValid || loading}
                  onClick={handleWebDavBackup}
                >
                  <Upload className="mr-2 h-4 w-4" /> 备份
                </Button>
                <Button
                  variant="outline"
                  disabled={!webDavConfig.enabled || !isWebDavFormValid || loading}
                  onClick={handleWebDavRestore}
                >
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
