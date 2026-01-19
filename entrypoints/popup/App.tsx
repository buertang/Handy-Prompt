import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, incrementUsage } from '@/lib/db';
import {
  FolderIcon,
  Clock,
  Copy,
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
import { useI18n } from '@/components/i18n-provider';

function App() {
  const { t } = useI18n();

  const prompts = useLiveQuery(async () => {
    try {
      // Fallback to simpler query to avoid TS/Index issues
      const all = await db.prompts.toArray();
      const enabled = all.filter(p => p.enabled);

      return enabled;
    } catch (error) {
      console.error("Failed to query prompts:", error);
      return [];
    }
  }) || [];

  const recentPrompts = useLiveQuery(async () => {
    try {
      const all = await db.prompts.toArray();
      return all
        .filter(p => p.enabled && p.lastUsedTime)
        .sort((a, b) => (b.lastUsedTime || '').localeCompare(a.lastUsedTime || ''))
        .slice(0, 3);
    } catch (error) {
      console.error("Failed to query recent prompts:", error);
      return [];
    }
  }) || [];

  const frequentPrompts = useLiveQuery(async () => {
    try {
      const all = await db.prompts.toArray();
      return all
        .filter(p => p.enabled && (p.usageCount || 0) > 0)
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 3);
    } catch (error) {
      console.error("Failed to query frequent prompts:", error);
      return [];
    }
  }) || [];

  const promptCount = prompts.length;
  const { system, updateSystem, appearance, updateAppearance } = useSettings();
  const [hasShortcut, setHasShortcut] = useState(true);
  const [usageMode, setUsageMode] = useState<'recent' | 'frequent'>('recent');

  // Load saved usage mode preference
  useEffect(() => {
    browser.storage.local.get('usageMode').then((result) => {
      if (result.usageMode === 'recent' || result.usageMode === 'frequent') {
        setUsageMode(result.usageMode);
      }
    }).catch(err => console.error('Failed to load usage mode:', err));
  }, []);

  // Save usage mode preference when it changes
  const handleUsageModeChange = (mode: 'recent' | 'frequent') => {
    setUsageMode(mode);
    browser.storage.local.set({ usageMode: mode }).catch(err =>
      console.error('Failed to save usage mode:', err)
    );
  };

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

      <main className="flex-1 p-3 space-y-2.5">
        {/* Prompt Library Card */}
        <Card className="bg-card/50 shadow-sm border-border/50 gap-2 py-2">
          <CardHeader className="p-2.5 pb-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderIcon className="w-4 h-4" />
                <CardTitle className="text-sm font-medium">{t('popup.library')}</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                <span className="font-bold text-primary">{promptCount}</span>
                <span>{t('popup.enabledCountSuffix')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2.5 pt-1.5">
            <Button
              className="w-full font-medium shadow-sm transition-none"
              size="default"
              onClick={handleManagePrompts}
            >
              {t('contextManagePrompts')}
            </Button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 transition-none"
                onClick={() => openOptionsPage('#category')}
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                {t('contextManageCategories')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 transition-none"
                onClick={() => openOptionsPage('#tag')}
              >
                <Tags className="w-3.5 h-3.5 mr-1.5" />
                {t('contextManageTags')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent/Frequent Prompts Card */}
        {(recentPrompts.length > 0 || frequentPrompts.length > 0) && (
          <Card className="bg-card/50 shadow-sm border-border/50 gap-0.5 py-2">
            <CardHeader className="p-2.5 pb-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <CardTitle className="text-sm font-medium">
                    {usageMode === 'recent' ? t('popup.recentUsed') : '常用'}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-md">
                  <button
                    onClick={() => handleUsageModeChange('recent')}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${usageMode === 'recent'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    最近
                  </button>
                  <button
                    onClick={() => handleUsageModeChange('frequent')}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${usageMode === 'frequent'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    常用
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2.5 pt-0 pb-0">
              <div className="space-y-0.5">
                {(usageMode === 'recent' ? recentPrompts : frequentPrompts).map(prompt => (
                  <div
                    key={prompt.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(prompt.content);
                      toast.success(t('content.copySuccess') || 'Copied to clipboard');
                      incrementUsage(prompt.id);
                    }}
                    title={prompt.content}
                  >
                    <div className="flex flex-col min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{prompt.title}</span>
                        {usageMode === 'frequent' && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full shrink-0">
                            {prompt.usageCount || 0}次
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate opacity-70">{prompt.content}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Instructions Card */}
        <Card className="bg-card/50 shadow-sm border-border/50 gap-0.5 py-2">
          <CardHeader className="p-2.5 pb-0.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('popup.instructions')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 pb-1 space-y-2.5 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md mt-0.5">
                <CommandIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('popup.quickInput')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t('popup.quickInputDesc').split('<0>').map((part, i) => {
                    if (i === 1) {
                      const [content, rest] = part.split('</0>');
                      return (
                        <span key={i}>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{content}</span>
                          {rest}
                        </span>
                      );
                    }
                    return part;
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md mt-0.5">
                <MousePointerClickIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('popup.contextSave')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t('popup.contextSaveDesc')}
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
                  {t('popup.shortcutWarning')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfigureShortcuts}
                    className="text-[11px] font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2"
                  >
                    {t('popup.configureShortcuts')}
                  </button>
                  <button
                    onClick={handleDismissWarning}
                    className="text-[11px] font-medium text-amber-700/70 hover:text-amber-800 dark:text-amber-400/70 dark:hover:text-amber-300"
                  >
                    {t('popup.dismissWarning')}
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
