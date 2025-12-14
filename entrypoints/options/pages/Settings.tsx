import { useI18n } from '@/components/i18n-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun, Monitor, Keyboard, Languages } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { browser } from 'wxt/browser'

export default function Settings() {
  const { t, language, setLanguage } = useI18n()
  const { system, updateSystem, appearance, updateAppearance } = useSettings()
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settingsPage.appearance.themeMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.appearance.themeDesc')}
              </p>
            </div>
            <Select value={appearance.theme || 'system'} onValueChange={(val: any) => setTheme(val)}>
              <SelectTrigger className="w-[180px]">
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
