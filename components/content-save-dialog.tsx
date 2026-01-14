import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { toast } from 'sonner';
import {
  X,
  Save,
  Loader2,
  Plus,
  Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ClearableInput from '@/components/shadcn-studio/input-clear';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultipleSelector, { Option } from '@/components/ui/select-multi';
import { CategoryDialog } from './category-dialog';
import type { Category } from '@/lib/db';

interface ContentSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
}

export function ContentSaveDialog({ open, onOpenChange, initialContent }: ContentSaveDialogProps) {
  // Use same state structure as PromptDialog for consistency
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    tags: [] as string[],
    content: '',
    description: '',
    createTime: '',
    lastModified: '',
    enabled: true,
    categoryId: '',
    isPinned: false,
    author: '',
    source: ''
  });

  const [selectedTags, setSelectedTags] = useState<Option[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      setFormData(prev => ({
        ...prev,
        id: crypto.randomUUID(),
        title: initialContent.slice(0, 20) + (initialContent.length > 20 ? '...' : ''),
        content: initialContent,
        createTime: now,
        lastModified: now
      }));
      fetchData();
    }
  }, [open, initialContent]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await browser.runtime.sendMessage({ type: 'GET_CATEGORIES_AND_TAGS' });
      if (res && res.success) {
        setCategories(res.categories);
        setAllTags(res.tags);

        // Set default category
        const defaultCat = res.categories.find((c: any) => c.isDefault) || res.categories[0];
        if (defaultCat) {
          setFormData(prev => ({ ...prev, categoryId: defaultCat.id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryId) return;

    setSaving(true);
    try {
      const tags = selectedTags.map(t => t.value);
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

      const author = formData.author.trim();
      const source = formData.source.trim();
      const finalAuthor = !author && !source ? 'system' : formData.author;
      const finalSource = !author && !source ? 'system' : formData.source;

      const newPrompt = {
        ...formData,
        tags,
        author: finalAuthor,
        source: finalSource,
        lastModified: now
      };

      const res = await browser.runtime.sendMessage({
        type: 'SAVE_PROMPT',
        data: newPrompt
      });

      if (res && res.success) {
        toast.success('保存成功');
        onOpenChange(false);
      } else {
        toast.error('保存失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const tagOptions: Option[] = allTags.map(t => ({ label: t.name, value: t.name }));
  const isValid = formData.title.trim().length > 0 && formData.content.trim().length > 0 && formData.categoryId !== '';

  if (!open) return null;

  // Manual Modal Implementation to avoid Portal issues in Shadow DOM
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[600px] bg-background text-foreground rounded-xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border/50 shrink-0 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-primary dark:text-primary" />
            <h2 className="text-lg font-semibold text-foreground">新增提示词</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-all duration-150">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Matching PromptDialog layout */}
        <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="title">标题</Label>
                  <ClearableInput
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    onClear={() => setFormData({ ...formData, title: '' })}
                    placeholder="输入提示词标题"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">分类</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger id="category" className='w-full'>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <div
                        className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground border-b mb-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCategoryDialogOpen(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="font-medium">新建分类...</span>
                      </div>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <ClearableInput
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onClear={() => setFormData({ ...formData, description: '' })}
                  placeholder="简短描述提示词的作用"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="author">作者</Label>
                  <ClearableInput
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    onClear={() => setFormData({ ...formData, author: '' })}
                    placeholder="(可选)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source">来源</Label>
                  <ClearableInput
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    onClear={() => setFormData({ ...formData, source: '' })}
                    placeholder="(可选)"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">内容</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="输入提示词内容..."
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label>标签</Label>
                <MultipleSelector
                  value={selectedTags}
                  onChange={setSelectedTags}
                  defaultOptions={tagOptions}
                  placeholder="选择或输入标签..."
                  creatable
                  emptyIndicator={
                    <p className="text-center text-sm text-muted-foreground">
                      没有找到标签，按回车创建
                    </p>
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="pinned" className="flex items-center gap-1.5 text-foreground">
                      置顶 <Pin className="w-3.5 h-3.5" />
                    </Label>
                    <div className="text-xs text-muted-foreground">固定在顶部</div>
                  </div>
                  <Switch
                    id="pinned"
                    checked={formData.isPinned}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled" className="text-foreground">启用状态</Label>
                    <div className="text-xs text-muted-foreground">是否启用该提示词</div>
                  </div>
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 shrink-0 flex justify-end gap-2.5 bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || loading || !isValid}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            保存
          </Button>
        </div>
      </div>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSave={async (newCategory) => {
          const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
          const categoryToSave = {
            ...newCategory,
            createTime: now,
            lastModified: now
          }

          try {
            // Save to backend
            const res = await browser.runtime.sendMessage({
              type: 'SAVE_CATEGORY',
              data: categoryToSave
            })

            if (res && res.success) {
              // Update local categories list
              setCategories(prev => [...prev, categoryToSave])
              // Auto-select the newly created category
              setFormData({ ...formData, categoryId: categoryToSave.id })
              toast.success('分类创建成功')
            } else {
              toast.error('分类创建失败')
            }
          } catch (e) {
            console.error(e)
            toast.error('分类创建失败')
          }
        }}
      />
    </div>
  );
}
