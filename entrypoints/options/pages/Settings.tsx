import { useI18n } from '@/components/i18n-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun, Monitor, Keyboard, Languages, LayoutGrid, List, MousePointer2, LayoutTemplate } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { browser } from 'wxt/browser'
import { cn } from '@/lib/utils'
import type { NamedSortField, PromptSortField, SortDirection } from '@/lib/sort-settings'

export default function Settings() {
  const { t, language, setLanguage } = useI18n()
  const { system, updateSystem, appearance, updateAppearance, sorting, updateSorting } = useSettings()
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })
  const promptSortOptions: { value: PromptSortField; label: string }[] = [
    { value: 'title', label: t('content.sortByTitle') },
    { value: 'createTime', label: t('common.createTime') },
    { value: 'lastModified', label: t('common.lastModified') },
    { value: 'category', label: t('content.category') },
    { value: 'usage', label: t('content.sortByUsage') },
  ]
  const namedSortOptions: { value: NamedSortField; label: string }[] = [
    { value: 'name', label: t('common.name') },
    { value: 'promptCount', label: t('common.promptCount') },
    { value: 'createTime', label: t('common.createTime') },
    { value: 'lastModified', label: t('common.lastModified') },
  ]
  const directionOptions: { value: SortDirection; label: string }[] = [
    { value: 'asc', label: t('common.ascending') },
    { value: 'desc', label: t('common.descending') },
  ]

  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>{t('settingsPage.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('settingsPage.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.appearance.title')}</CardTitle>
          <CardDescription>{t('settingsPage.appearance.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.appearance.themeMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.appearance.themeDesc')}
              </p>
            </div>
            <Select value={appearance.theme || 'system'} onValueChange={(val: any) => setTheme(val)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('settingsPage.appearance.selectTheme')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" /> {t('settingsPage.appearance.light')}
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" /> {t('settingsPage.appearance.dark')}
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> {t('settingsPage.appearance.system')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.appearance.viewMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.appearance.viewModeDesc')}
              </p>
            </div>
            <div className="flex items-center p-1 bg-muted rounded-lg border shadow-inner">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 md:flex-none h-8 px-4 rounded-md transition-all duration-200",
                  appearance.viewMode === 'card'
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                onClick={() => updateAppearance({ viewMode: 'card' })}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('settingsPage.appearance.cardView')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 md:flex-none h-8 px-4 rounded-md transition-all duration-200",
                  appearance.viewMode === 'list'
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                onClick={() => updateAppearance({ viewMode: 'list' })}
              >
                <List className="h-4 w-4 mr-2" />
                {t('settingsPage.appearance.listView')}
              </Button>
            </div>
          </div>

          {/* Popup Position */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.appearance.popupPosition')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.appearance.popupPositionDesc')}
              </p>
            </div>
            <div className="flex items-center p-1 bg-muted rounded-lg border shadow-inner">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 md:flex-none h-8 px-4 rounded-md transition-all duration-200",
                  appearance.popupMode === 'follow'
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                onClick={() => updateAppearance({ popupMode: 'follow' })}
              >
                <MousePointer2 className="h-4 w-4 mr-2" />
                {t('settingsPage.appearance.followCursor')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 md:flex-none h-8 px-4 rounded-md transition-all duration-200",
                  appearance.popupMode === 'center'
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                onClick={() => updateAppearance({ popupMode: 'center' })}
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                {t('settingsPage.appearance.centerScreen')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.sorting.title')}</CardTitle>
          <CardDescription>{t('settingsPage.sorting.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.sorting.prompts')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.sorting.promptsDesc')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-[320px]">
              <Select
                value={sorting.prompts.field}
                onValueChange={(field: PromptSortField) => updateSorting({ prompts: { ...sorting.prompts, field } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promptSortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sorting.prompts.direction}
                onValueChange={(direction: SortDirection) => updateSorting({ prompts: { ...sorting.prompts, direction } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.sorting.categories')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.sorting.categoriesDesc')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-[320px]">
              <Select
                value={sorting.categories.field}
                onValueChange={(field: NamedSortField) => updateSorting({ categories: { ...sorting.categories, field } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {namedSortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sorting.categories.direction}
                onValueChange={(direction: SortDirection) => updateSorting({ categories: { ...sorting.categories, direction } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settingsPage.sorting.tags')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.sorting.tagsDesc')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-[320px]">
              <Select
                value={sorting.tags.field}
                onValueChange={(field: NamedSortField) => updateSorting({ tags: { ...sorting.tags, field } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {namedSortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sorting.tags.direction}
                onValueChange={(direction: SortDirection) => updateSorting({ tags: { ...sorting.tags, direction } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.general.title')}</CardTitle>
          <CardDescription>{t('settingsPage.general.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settingsPage.general.language')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.general.languageDesc')}
              </p>
            </div>
            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('settingsPage.general.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh_CN">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" /> 中文 (简体)
                  </div>
                </SelectItem>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" /> English
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settingsPage.general.shortcutWarning')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.general.shortcutWarningDesc')}
              </p>
            </div>
            <Switch
              checked={system.suppressShortcutWarning}
              onCheckedChange={(checked) => updateSystem({ suppressShortcutWarning: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settingsPage.general.charity')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.general.charityDesc')}
              </p>
            </div>
            <Switch
              checked={system.showCharityDisplay}
              onCheckedChange={(checked) => updateSystem({ showCharityDisplay: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.shortcuts.title')}</CardTitle>
          <CardDescription>{t('settingsPage.shortcuts.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settingsPage.shortcuts.config')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.shortcuts.configDesc')}
              </p>
            </div>
            <Button variant="outline" onClick={() => browser.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
              <Keyboard className="mr-2 h-4 w-4" />
              {t('settingsPage.shortcuts.goToConfig')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
