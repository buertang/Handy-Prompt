import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function Settings() {
  const { system, updateSystem, appearance, updateAppearance } = useSettings()
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>设置</h1>
        <p className="text-muted-foreground text-sm">
          管理扩展程序的通用偏好设置。
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>自定义界面显示风格。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>主题模式</Label>
              <p className="text-sm text-muted-foreground">
                选择您喜欢的界面主题。
              </p>
            </div>
            <Select value={appearance.theme || 'system'} onValueChange={(val: any) => setTheme(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择主题" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" /> 浅色模式
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" /> 深色模式
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> 跟随系统
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通用</CardTitle>
          <CardDescription>常规功能选项。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>禁止快捷键提醒</Label>
              <p className="text-sm text-muted-foreground">
                如果未设置快捷键，不再显示警告提示。
              </p>
            </div>
            <Switch 
              checked={system.suppressShortcutWarning}
              onCheckedChange={(checked) => updateSystem({ suppressShortcutWarning: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
