import Dexie, { type EntityTable } from 'dexie';

export interface Prompt {
  id: string;
  title: string;
  tags: string[];
  content: string;
  description: string;
  createTime: string;
  lastModified: string;
  enabled: boolean;
  categoryId: string; // Foreign key to Category
  author?: string;
  source?: string;
  isPinned?: boolean;
  usageCount?: number;
  lastUsedTime?: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  description?: string;
  enabled?: boolean;
  color?: string;
  createTime: string;
  lastModified: string;
  isPinned?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  createTime: string;
  lastModified: string;
  isPinned?: boolean;
  enabled?: boolean;
  isDefault?: boolean;
}

const db = new Dexie('HandyPromptDB') as Dexie & {
  prompts: EntityTable<Prompt, 'id'>;
  categories: EntityTable<Category, 'id'>;
  tags: EntityTable<Tag, 'id'>;
};

const getNowString = () => {
  const date = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};

// Schema definition
db.version(1).stores({
  prompts: '&id, &title, categoryId, *tags, createTime, lastModified, author, source, enabled, isPinned, usageCount, lastUsedTime', // *tags for multi-valued index
  categories: '&id, &name, createTime, lastModified, isPinned, enabled',
  tags: '&id, &name, createTime, lastModified, isPinned, enabled'
});

export const incrementUsage = async (id: string) => {
  const now = getNowString();
  await db.prompts.where('id').equals(id).modify(p => {
    p.usageCount = (p.usageCount || 0) + 1;
    p.lastUsedTime = now;
  });
};

const isChinese = () => {
  try {
    return navigator.language.toLowerCase().startsWith('zh');
  } catch {
    return true; // Default to Chinese if navigator is not available (fallback)
  }
};

const getDefaultName = () => isChinese() ? '默认' : 'Default';

db.prompts.hook('creating', (_primaryKey, obj) => {
  const now = getNowString();
  const author = (obj.author || '').trim();
  const source = (obj.source || '').trim();

  if (!author && !source) {
    obj.author = 'system';
    obj.source = 'system';
  }

  if (!obj.createTime || !obj.createTime.trim()) {
    obj.createTime = now;
  }

  if (!obj.lastModified || !obj.lastModified.trim()) {
    obj.lastModified = now;
  }

  // 默认标签处理：如果没有标签，添加"默认"
  if (!obj.tags || obj.tags.length === 0) {
    obj.tags = [getDefaultName()];
  }
});

db.prompts.hook('updating', (mods: any, _primaryKey, obj) => {
  const now = getNowString();

  const nextAuthor = (mods.author ?? obj.author) as string | undefined;
  const nextSource = (mods.source ?? obj.source) as string | undefined;
  const author = (nextAuthor || '').trim();
  const source = (nextSource || '').trim();

  if (!author && !source) {
    mods.author = 'system';
    mods.source = 'system';
  }

  const nextCreateTime = (mods.createTime ?? obj.createTime) as string | undefined;
  if (!nextCreateTime || !nextCreateTime.trim()) {
    mods.createTime = obj.createTime || now;
  }

  const nextLastModified = (mods.lastModified ?? obj.lastModified) as string | undefined;
  if (!nextLastModified || !nextLastModified.trim()) {
    mods.lastModified = now;
  }

  return mods;
});

db.categories.hook('deleting', (primKey, obj) => {
  if (obj.isDefault) {
    throw new Error('无法删除默认分类');
  }
});

db.categories.hook('updating', (mods: Partial<Category>, primKey, obj) => {
  if (obj.isDefault) {
    if (mods.hasOwnProperty('isDefault') && !mods.isDefault) {
      throw new Error('无法取消默认分类状态');
    }
    if (mods.hasOwnProperty('name') && mods.name !== obj.name) {
      throw new Error('无法修改默认分类名称');
    }
  }
});

db.tags.hook('deleting', (primKey, obj) => {
  if (obj.isDefault) {
    throw new Error('无法删除默认标签');
  }
});

db.tags.hook('updating', (mods: Partial<Tag>, primKey, obj) => {
  if (obj.isDefault) {
    if (mods.hasOwnProperty('isDefault') && !mods.isDefault) {
      throw new Error('无法取消默认标签状态');
    }
    if (mods.hasOwnProperty('name') && mods.name !== obj.name) {
      throw new Error('无法修改默认标签名称');
    }
  }
});

// Seed data
db.on('populate', async () => {
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
  const defaultName = getDefaultName();

  const defaultCategory = {
    id: crypto.randomUUID(),
    name: defaultName,
    isDefault: true,
    description: '系统默认分类，用于存放未分类的提示词',
    enabled: true,
    color: 'bg-slate-400', // Slate (Default)
    createTime: now,
    lastModified: now,
    isPinned: true
  };
  const codeCategory = {
    id: crypto.randomUUID(),
    name: '编程',
    isDefault: false,
    description: '编程、代码相关的提示词，包含各种语言和框架的助手',
    enabled: true,
    color: 'bg-emerald-400', // Emerald (Code)
    createTime: now,
    lastModified: now,
    isPinned: false
  };
  const officeCategory = {
    id: crypto.randomUUID(),
    name: '办公',
    isDefault: false,
    description: '办公效率工具',
    enabled: true,
    color: 'bg-blue-400', // Blue (Office)
    createTime: now,
    lastModified: now,
    isPinned: false
  };

  await db.categories.bulkAdd([
    defaultCategory,
    codeCategory,
    officeCategory
  ]);

  // Initial Prompts
  await db.prompts.bulkAdd([
    {
      id: crypto.randomUUID(),
      title: '英文润色',
      tags: ['写作', '翻译'],
      content: '请将以下内容翻译成英文，并进行润色，使其更加专业、地道，符合母语人士的表达习惯：\n\n[在此输入中文内容]',
      description: '将中文翻译并润色为地道的英文',
      createTime: '2024-03-01 10:00:00',
      lastModified: '2024-03-01 10:00:00',
      enabled: true,
      categoryId: officeCategory.id,
      author: 'System',
      source: 'Built-in',
      isPinned: false
    },
    {
      id: crypto.randomUUID(),
      title: '代码优化专家',
      tags: ['编程', '优化'],
      content: '请帮我Review这段代码，解释其功能，并给出优化建议（包括性能、可读性、安全性等方面）：\n\n```\n[在此粘贴代码]\n```',
      description: '代码审查与优化建议',
      createTime: '2024-03-05 14:30:00',
      lastModified: '2024-03-05 14:30:00',
      enabled: true,
      categoryId: codeCategory.id,
      author: 'System',
      source: 'Built-in',
      isPinned: false
    },
    {
      id: crypto.randomUUID(),
      title: '会议纪要生成',
      tags: ['办公', '总结'],
      content: '请根据以下会议记录，整理出一份结构清晰的会议纪要。包含：会议主题、参会人员、主要议题、讨论重点、决议事项和后续行动计划（Action Items）。\n\n[在此粘贴会议记录]',
      description: '快速生成结构化会议纪要',
      createTime: '2024-03-10 09:15:00',
      lastModified: '2024-03-10 09:15:00',
      enabled: true,
      categoryId: officeCategory.id,
      author: 'System',
      source: 'Built-in',
      isPinned: false
    }
  ]);

  // Initial Tags (optional, can be inferred, but good to have a list)
  const defaultTag = {
    id: crypto.randomUUID(),
    name: defaultName,
    createTime: now,
    lastModified: now,
    isPinned: true,
    enabled: true,
    isDefault: true
  };

  const uniqueTags = new Set(['写作', '翻译', '编程', '优化', '办公', '总结']);
  const tagsToAdd = Array.from(uniqueTags).map(name => ({
    id: crypto.randomUUID(),
    name,
    createTime: now,
    lastModified: now,
    isPinned: false,
    enabled: true,
    isDefault: false
  }));

  await db.tags.bulkAdd([defaultTag, ...tagsToAdd]);
});

export { db };
