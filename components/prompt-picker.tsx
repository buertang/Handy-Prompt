import { useState, useEffect, useRef } from 'react';
import { Search, Copy, X, GripHorizontal, Check } from 'lucide-react';
import { browser } from 'wxt/browser';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ClearableInput from '@/components/shadcn-studio/input-clear';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Prompt {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Tag {
  name: string;
  enabled: boolean;
}

interface PromptPickerProps {
  onSelect: (content: string) => void;
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

export function PromptPicker({ onSelect, onClose, onDragStart }: PromptPickerProps) {
  const [query, setQuery] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isInputReadOnly, setIsInputReadOnly] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [onClose]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Initial focus with readOnly to prevent IME bleed
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Unlock input after a short delay
        setTimeout(() => setIsInputReadOnly(false), 50);
      }
    }, 50);

    const handleClickOutside = (e: MouseEvent) => {
      // Handled by parent or specific logic if needed
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    searchPrompts(query, selectedCategory);
  }, [query, selectedCategory]);

  // Reset selected index when prompts change
  useEffect(() => {
    setSelectedIndex(0);
  }, [prompts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent conflicts with parent elements or Radix UI
    // especially for keys that might trigger the DropdownMenu (like ArrowDown)
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
      e.stopPropagation();
    }

    // Always handle these keys regardless of prompts
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        // Return focus is handled by parent (content.tsx) via onClose causing useEffect cleanup or toggle logic?
        // Actually onClose just sets pickerOpen(false). 
        // We need to ensure focus restoration happens there too.
        // But onClose is a prop. content.tsx handles the state change.
        return;
      case 'Tab':
        e.preventDefault();
        cycleCategory();
        return;
    }

    if (prompts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % prompts.length);
        scrollToSelected((selectedIndex + 1) % prompts.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + prompts.length) % prompts.length);
        scrollToSelected((selectedIndex - 1 + prompts.length) % prompts.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (prompts[selectedIndex]) {
          trackUsage(prompts[selectedIndex].id);
          onSelect(prompts[selectedIndex].content);
        }
        break;
      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation(); // Also stop propagation for Ctrl+C
          if (prompts[selectedIndex]) {
            navigator.clipboard.writeText(prompts[selectedIndex].content);
            toast.success('已复制到剪贴板');
            trackUsage(prompts[selectedIndex].id);
          }
        }
        break;
    }
  };

  const scrollToSelected = (index: number) => {
    if (!containerRef.current) return;
    const item = containerRef.current.querySelector(`[data-prompt-index="${index}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  const trackUsage = async (id: string) => {
    try {
      await browser.runtime.sendMessage({ type: 'INCREMENT_USAGE', id });
    } catch (e) {
      console.error('Failed to track usage:', e);
    }
  };

  const cycleCategory = () => {
    // Always include 'all' category
    const allCategories = [{ id: 'all', name: '所有分类' }, ...categories];

    // Find current index
    let currentIndex = allCategories.findIndex(c => c.id === selectedCategory);

    // If not found (shouldn't happen but safe guard), start from 0
    if (currentIndex === -1) currentIndex = 0;

    // Calculate next index with wrap around
    const nextIndex = (currentIndex + 1) % allCategories.length;

    // Set new category
    setSelectedCategory(allCategories[nextIndex].id);
  };

  const fetchData = async () => {
    try {
      // Get categories and tags first
      const res = await browser.runtime.sendMessage({ type: 'GET_CATEGORIES_AND_TAGS' });
      if (res && res.success) {
        setCategories(res.categories);
        setTags(res.tags);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const searchPrompts = async (q: string, catId: string = 'all') => {
    setLoading(true);
    try {
      const res = await browser.runtime.sendMessage({
        type: 'SEARCH_PROMPTS',
        query: q,
        categoryId: catId
      });

      if (res && res.success) {
        let results = res.prompts;

        // Client-side tag filtering
        if (selectedTags.length > 0) {
          results = results.filter((p: Prompt) =>
            selectedTags.every(t => p.tags.includes(t))
          );
        }

        setPrompts(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Re-run filter when tags change (without re-fetching if possible, but searchPrompts is cheap)
  useEffect(() => {
    searchPrompts(query, selectedCategory);
  }, [selectedTags]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const currentCategoryName = selectedCategory === 'all'
    ? '所有分类'
    : categories.find(c => c.id === selectedCategory)?.name || '未知分类';

  return (
    <div
      ref={containerRef}
      className="w-[500px] h-[450px] bg-background border border-border/50 rounded-xl shadow-2xl overflow-hidden flex flex-col text-sm animate-in fade-in zoom-in-95 duration-300"
      onKeyDown={handleKeyDown}
      tabIndex={-1} // Allow div to focus if needed, though input will mostly handle focus
    >
      {/* Drag Handle */}
      <div
        className="h-4 bg-muted/10 flex items-center justify-center cursor-move hover:bg-muted/20 transition-all duration-200 shrink-0 handle group"
        onMouseDown={onDragStart}
      >
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-muted-foreground/30 rounded-full group-hover:bg-muted-foreground/50 transition-colors" />
          <div className="w-1 h-1 bg-muted-foreground/30 rounded-full group-hover:bg-muted-foreground/50 transition-colors" />
          <div className="w-1 h-1 bg-muted-foreground/30 rounded-full group-hover:bg-muted-foreground/50 transition-colors" />
        </div>
      </div>

      <div className="p-3.5 pt-3 border-b border-border/50 flex flex-col gap-3 bg-muted/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-muted-foreground transition-colors" />
          <div className="flex-1 relative">
            <ClearableInput
              ref={inputRef}
              className="bg-transparent outline-none placeholder:text-muted-foreground text-foreground border-none shadow-none focus-visible:ring-0 px-0 pr-8 h-auto py-0"
              placeholder="输入关键词搜索提示..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              onKeyDown={handleKeyDown}
              readOnly={isInputReadOnly}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5 font-medium bg-background/80 hover:bg-background border-border/60 shadow-sm transition-all">
                {currentCategoryName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px]" usePortal={false}>
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                <div className="flex items-center justify-between w-full">
                  <span>所有分类</span>
                  {selectedCategory === 'all' && <Check className="h-3.5 w-3.5" />}
                </div>
              </DropdownMenuItem>
              {categories.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCategory(c.id)}>
                  <div className="flex items-center justify-between w-full">
                    <span>{c.name}</span>
                    {selectedCategory === c.id && <Check className="h-3.5 w-3.5" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={onClose} className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-all duration-150">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tag Filter Bar */}
        {tags.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap pb-1">
            <div className="flex gap-1.5 px-0.5">
              {tags.map(tag => (
                <Badge
                  key={tag.name}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-[10px] px-2.5 h-6 font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                    selectedTags.includes(tag.name)
                      ? "bg-primary text-primary-foreground shadow-sm dark:shadow-primary/20"
                      : "bg-background/80 hover:bg-muted border-border/60"
                  )}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">加载中...</div>
          ) : prompts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">未找到相关提示词</div>
          ) : (
            <div className="divide-y divide-border/50">
              {prompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  data-prompt-index={index}
                  className={cn(
                    "p-3.5 cursor-pointer group transition-all duration-200",
                    selectedIndex === index
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-muted/50 hover:shadow-sm"
                  )}
                  onClick={() => {
                    trackUsage(prompt.id);
                    onSelect(prompt.content);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">{prompt.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md font-medium shadow-sm transition-all",
                        selectedIndex === index
                          ? "bg-background/90 text-foreground shadow-md"
                          : "text-muted-foreground bg-muted/80 border border-border/30"
                      )}>
                        {categories.find(c => c.id === prompt.categoryId)?.name}
                      </span>
                      <div
                        className={cn(
                          "p-1.5 rounded-md hover:bg-background/70 transition-all duration-200 cursor-pointer active:scale-95",
                          selectedIndex === index
                            ? "opacity-100 text-accent-foreground"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(prompt.content);
                          toast.success('已复制到剪贴板');
                          trackUsage(prompt.id);
                        }}
                        title="复制内容"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs line-clamp-2 mb-2 leading-relaxed transition-colors",
                    selectedIndex === index
                      ? "text-accent-foreground/90"
                      : "text-muted-foreground"
                  )}>
                    {prompt.content}
                  </p>
                  {prompt.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {prompt.tags.map(tag => (
                        <span key={tag} className={cn(
                          "px-2 py-0.5 text-[10px] rounded-md font-medium transition-all",
                          selectedIndex === index
                            ? "bg-background/30 text-accent-foreground border border-background/20"
                            : "bg-muted/80 text-muted-foreground border border-border/30"
                        )}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="px-3 py-2.5 border-t border-border/50 bg-muted/10 text-[10px] text-muted-foreground flex justify-between items-center shrink-0 select-none">
        <span className="font-medium">共 {prompts.length} 个提示</span>
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1.5"><kbd className="bg-card px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono text-[9px] font-medium">Ctrl+C</kbd> 复制</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-card px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono text-[9px] font-medium">↑↓</kbd> 导航</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-card px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono text-[9px] font-medium">Tab</kbd> 切换分类</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-card px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono text-[9px] font-medium">Enter</kbd> 选择</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-card px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono text-[9px] font-medium">Esc</kbd> 退出</span>
        </div>
      </div>
    </div>
  );
}
