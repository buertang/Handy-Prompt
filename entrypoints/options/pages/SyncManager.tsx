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
import { useI18n } from '@/components/i18n-provider'

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
  const { t } = useI18n();
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
        toast.info(t('sync.webdav.noFilesFound'))
      }
      updateBackupListState(files)
    } catch (error: any) {
      console.error(error)
      toast.error(t('sync.webdav.loadFail'), {
        description: error.message || 'Network Error',
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
          description: `Exported: ${result.details?.exported}, Imported: ${result.details?.imported}, Updated: ${result.details?.updated}`
        })
      } else {
        toast.error(t('sync.notion.syncFail'), { description: result.message })
      }
    } catch (error: any) {
      console.error(error)
      toast.error(`${t('sync.notion.syncFail')}: ${error.message}`)
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

      toast.success(t('sync.webdav.backupSuccess'), {
        description: t('sync.webdav.backupSuccessDesc').replace('$1', result.fileName),
      })

      updateBackupListState(result.nextIndex)
    } catch (error: any) {
      console.error(error)
      toast.error(t('sync.webdav.backupFail'), {
        description: error.message || 'Network Error',
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
        toast.error(t('sync.webdav.restoreFail'), { description: t('sync.webdav.loadFail') })
        return
      }

      if (!files.length) {
        toast.error(t('sync.webdav.restoreFail'), { description: t('sync.webdav.noFilesFound') })
        return
      }

      if (!fileName) {
        fileName = files[0]
      }

      const result = await restoreFromWebDav(webDavConfig, fileName)

      toast.success(t('sync.webdav.restoreSuccess'), {
        description: t('sync.webdav.restoreSuccessDesc')
          .replace('$1', result.promptsCount.toString())
          .replace('$2', result.categoriesCount.toString())
          .replace('$3', result.tagsCount.toString()),
      })
    } catch (error: any) {
      console.error(error)
      toast.error(t('sync.webdav.restoreFail'), {
        description: error.message || 'Network Error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>{t('sync.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('sync.subtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="webdav">{t('sync.webdav.tab')}</TabsTrigger>
          <TabsTrigger value="notion">{t('sync.notion.tab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="notion">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>{t('sync.notion.title')}</CardTitle>
                  <CardDescription>{t('sync.notion.description')}</CardDescription>
                </div>
                <Switch
                  checked={notionConfig.enabled}
                  onCheckedChange={(checked) => setNotionConfig({ ...notionConfig, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notion-key">{t('sync.notion.token')}</Label>
                <PasswordInput
                  id="notion-key"
                  placeholder={t('sync.notion.tokenPlaceholder')}
                  value={notionConfig.apiKey}
                  onChange={(e) => setNotionConfig({ ...notionConfig, apiKey: filterChinese(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('sync.notion.tokenHelpPre')}
                  <a href="https://www.notion.so/my-integrations" target="_blank" className="underline text-primary">{t('sync.notion.tokenHelpLink')}</a>
                  {t('sync.notion.tokenHelpPost')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notion-db">{t('sync.notion.dbId')}</Label>
                <ClearableInput
                  id="notion-db"
                  placeholder={t('sync.notion.dbIdPlaceholder')}
                  value={notionConfig.databaseId}
                  onChange={(e) => setNotionConfig({ ...notionConfig, databaseId: filterChinese(e.target.value) })}
                  onClear={() => setNotionConfig({ ...notionConfig, databaseId: '' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('sync.notion.dbIdHelp1')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('sync.notion.dbIdHelp2')}
                </p>
                {notionDatabaseIdIsPureNumber && (
                  <p className="text-xs text-destructive">
                    {t('sync.notion.invalidDbId')}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
              <Button variant="outline" disabled={!notionConfig.enabled || !isNotionFormValid || syncing} onClick={handleSyncNotion}>
                <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                {syncing ? t('sync.notion.syncing') : t('sync.notion.sync')}
              </Button>
              <Button onClick={handleSaveNotion} disabled={loading || !isNotionFormValid}>
                {loading ? t('sync.webdav.saving') : (
                  saveStatus === 'success' ? <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('sync.webdav.saved')}</> :
                    saveStatus === 'error' ? <><AlertCircle className="mr-2 h-4 w-4" /> {t('sync.webdav.failed')}</> :
                      <><Save className="mr-2 h-4 w-4" /> {t('sync.webdav.saveConfig')}</>
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
                  <CardTitle>{t('sync.webdav.title')}</CardTitle>
                  <CardDescription>{t('sync.webdav.description')}</CardDescription>
                </div>
                <Switch
                  checked={webDavConfig.enabled}
                  onCheckedChange={(checked) => setWebDavConfig({ ...webDavConfig, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webdav-url">{t('sync.webdav.url')}</Label>
                <ClearableInput
                  id="webdav-url"
                  placeholder={t('sync.webdav.urlPlaceholder')}
                  value={webDavConfig.url}
                  onChange={(e) => setWebDavConfig({ ...webDavConfig, url: filterChinese(e.target.value) })}
                  onClear={() => setWebDavConfig({ ...webDavConfig, url: '' })}
                />
                {webDavUrlInvalidFormat && (
                  <p className="text-xs text-destructive">
                    {t('sync.webdav.invalidUrl')}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webdav-user">{t('sync.webdav.username')}</Label>
                  <ClearableInput
                    id="webdav-user"
                    placeholder={t('sync.webdav.usernamePlaceholder')}
                    value={webDavConfig.username}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, username: filterChinese(e.target.value) })}
                    onClear={() => setWebDavConfig({ ...webDavConfig, username: '' })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webdav-pass">{t('sync.webdav.password')}</Label>
                  <PasswordInput
                    id="webdav-pass"
                    placeholder={t('sync.webdav.passwordPlaceholder')}
                    value={webDavConfig.password}
                    onChange={(e) => setWebDavConfig({ ...webDavConfig, password: filterChinese(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webdav-max">{t('sync.webdav.maxBackups')}</Label>
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
                  {t('sync.webdav.maxBackupsDesc')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('sync.webdav.backupList')}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('sync.webdav.selectPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {backupFiles.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">{t('sync.webdav.noBackups')}</div>
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
                  {t('sync.webdav.restoreDesc')}
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
                  <Upload className="mr-2 h-4 w-4" /> {t('sync.webdav.backup')}
                </Button>
                <Button
                  variant="outline"
                  disabled={!webDavConfig.enabled || !isWebDavFormValid || loading}
                  onClick={handleWebDavRestore}
                >
                  <Download className="mr-2 h-4 w-4" /> {t('sync.webdav.restore')}
                </Button>
              </div>
              <Button onClick={handleSaveWebDav} disabled={loading || !isWebDavFormValid}>
                {loading ? t('sync.webdav.saving') : (
                  saveStatus === 'success' ? <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('sync.webdav.saved')}</> :
                    saveStatus === 'error' ? <><AlertCircle className="mr-2 h-4 w-4" /> {t('sync.webdav.failed')}</> :
                      <><Save className="mr-2 h-4 w-4" /> {t('sync.webdav.saveConfig')}</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
