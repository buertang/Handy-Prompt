import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  FolderIcon,
  CommandIcon,
  MousePointerClickIcon,
  AlertTriangleIcon,
  Sun,
  Moon,
  Monitor,
  Layers,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LogoSvg from '@/assets/logo.svg';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { browser } from 'wxt/browser';

function App() {
  const prompts = useLiveQuery(async () => {
    try {
      // Fallback to simpler query to avoid TS/Index issues
      const all = await db.prompts.toArray();
      const enabled = all.filter(p => p.enabled);

      console.log('DB Query Result:', {
        total: all.length,
        enabled: enabled.length
      });

      return enabled;
    } catch (error) {
      console.error("Failed to query prompts:", error);
      return [];
    }
  }) || [];
  const promptCount = prompts.length;
  const { system, updateSystem, appearance, updateAppearance } = useSettings();
  const [hasShortcut, setHasShortcut] = useState(true);

  useEffect(() => {
    browser.commands.getAll().then((commands) => {
      // Find the command that triggers the popup or main action
      // In MV3, it's typically _execute_action, in MV2 _execute_browser_action
      const actionCommand = commands.find(
        (cmd) => cmd.name === '_execute_action' || cmd.name === '_execute_browser_action'
      );

      // If the command exists and has a shortcut assigned
      if (actionCommand && actionCommand.shortcut) {
        setHasShortcut(true);
      } else {
        setHasShortcut(false);
      }
    }).catch(err => {
      console.error("Failed to get commands", err);
      // Fallback or ignore error
    });
  }, []);

  // Initialize theme handling
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  });

  const handleThemeClick = () => {
    const current = appearance.theme;
    if (current === 'light') {
      setTheme('dark');
    } else if (current === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const ThemeIcon = () => {
    switch (appearance.theme) {
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'system':
        return <Monitor className="h-5 w-5" />;
      case 'light':
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  const openOptionsPage = async (hash: string = '') => {
    const optionsUrl = browser.runtime.getURL('/options.html');
    const targetUrl = optionsUrl + hash;

    try {
      // 尝试查找已打开的 Options 页面
      // 注意：使用通配符匹配可能带有 hash 的现有页面
      const tabs = await browser.tabs.query({ url: optionsUrl + '*' });
      const existingTab = tabs.find(t => t.url?.startsWith(optionsUrl));

      if (existingTab && existingTab.id) {
        // 如果已存在，更新 URL（触发 hashchange）并激活
        await browser.tabs.update(existingTab.id, { active: true, url: targetUrl });
        if (existingTab.windowId) {
          await browser.windows.update(existingTab.windowId, { focused: true });
        }
      } else {
        // 如果不存在，创建新标签页
        await browser.tabs.create({ url: targetUrl });
      }
    } catch (error) {
      console.error('Failed to navigate to options page:', error);
      // 降级方案
      await browser.tabs.create({ url: targetUrl });
    }
  };

  const handleManagePrompts = () => {
    openOptionsPage();
  };

  const handleConfigureShortcuts = () => {
    browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  };

  const handleDismissWarning = () => {
    updateSystem({ suppressShortcutWarning: true });
  };

  return (
    <div className="w-[360px] h-full bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src={LogoSvg} alt="Handy Prompt" className="w-8 h-8 rounded-lg shadow-sm" />
          <h1 className="text-lg font-bold tracking-tight">Handy Prompt</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeClick}
          title={`Current theme: ${appearance.theme}`}
        >
          <ThemeIcon />
        </Button>
      </header>

      <main className="flex-1 p-3 space-y-3">
        {/* Prompt Library Card */}
        <Card className="bg-card/50 shadow-sm border-border/50 gap-3 py-3">
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderIcon className="w-4 h-4" />
                <CardTitle className="text-sm font-medium">提示词库</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                <span className="font-bold text-primary">{promptCount}</span>
                <span>个启用</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <Button
              className="w-full font-medium shadow-sm"
              size="default"
              onClick={handleManagePrompts}
            >
              管理提示词
            </Button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => openOptionsPage('#category')}
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                管理分类
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => openOptionsPage('#tag')}
              >
                <Tags className="w-3.5 h-3.5 mr-1.5" />
                管理标签
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions Card */}
        <Card className="bg-card/50 shadow-sm border-border/50 gap-3 py-3">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md mt-0.5">
                <CommandIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">快捷输入</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  任意输入框中输入 <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">/p</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md mt-0.5">
                <MousePointerClickIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">右键保存</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  选中文本后单击右键菜单选择"保存该提示词"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Card */}
        {(!hasShortcut && !system.suppressShortcutWarning) && (
          <div className="relative overflow-hidden rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5">
            <div className="flex gap-2.5">
              <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-tight">
                  未检测到快捷键配置，可能影响使用体验。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfigureShortcuts}
                    className="text-[11px] font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2"
                  >
                    前往设置快捷键
                  </button>
                  <button
                    onClick={handleDismissWarning}
                    className="text-[11px] font-medium text-amber-700/70 hover:text-amber-800 dark:text-amber-400/70 dark:hover:text-amber-300"
                  >
                    不再提醒
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default App;
