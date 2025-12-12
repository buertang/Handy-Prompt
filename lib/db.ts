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
}

export interface Tag {
  id: string;
  name: string;
  createTime: string;
  lastModified: string;
}

const db = new Dexie('HandyPromptDB') as Dexie & {
  prompts: EntityTable<Prompt, 'id'>;
  categories: EntityTable<Category, 'id'>;
  tags: EntityTable<Tag, 'id'>;
};

// Schema definition
db.version(1).stores({
  prompts: 'id, &title, categoryId, *tags, createTime, lastModified, author, source, enabled', // *tags for multi-valued index
  categories: 'id, &name, createTime, lastModified',
  tags: 'id, &name, createTime, lastModified'
});

// Seed data
db.on('populate', async () => {
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

  const defaultCategory = {
    id: crypto.randomUUID(),
    name: '默认',
    isDefault: true,
    description: '系统默认分类，用于存放未分类的提示词',
    enabled: true,
    color: 'bg-indigo-500',
    createTime: now,
    lastModified: now
  };
  const styleCategory = {
    id: crypto.randomUUID(),
    name: '风格化',
    isDefault: false,
    description: '绘画相关的提示词，包含Midjourney、Stable Diffusion等',
    enabled: true,
    color: 'bg-amber-500',
    createTime: now,
    lastModified: now
  };
  const codeCategory = {
    id: crypto.randomUUID(),
    name: '编程',
    isDefault: false,
    description: '编程、代码相关的提示词，包含各种语言和框架的助手',
    enabled: true,
    color: 'bg-emerald-500',
    createTime: now,
    lastModified: now
  };
  const officeCategory = {
    id: crypto.randomUUID(),
    name: '办公',
    isDefault: false,
    description: '办公效率工具',
    enabled: true,
    color: 'bg-blue-500',
    createTime: now,
    lastModified: now
  };
  const eduCategory = {
    id: crypto.randomUUID(),
    name: '教育',
    isDefault: false,
    description: '教育与学习助手',
    enabled: true,
    color: 'bg-purple-500',
    createTime: now,
    lastModified: now
  };

  await db.categories.bulkAdd([
    defaultCategory,
    styleCategory,
    codeCategory,
    officeCategory,
    eduCategory
  ]);

  // Initial Prompts
  await db.prompts.bulkAdd([
    {
      id: crypto.randomUUID(),
      title: '英文润色',
      tags: ['写作', '翻译', '英语'],
      content: '请将以下内容翻译成英文，并进行润色，使其更加专业、地道，符合母语人士的表达习惯：\n\n[在此输入中文内容]',
      description: '将中文翻译并润色为地道的英文',
      createTime: '2024-03-01 10:00:00',
      lastModified: '无修改时间',
      enabled: true,
      categoryId: officeCategory.id,
      author: 'System',
      source: 'Built-in'
    },
    {
      id: crypto.randomUUID(),
      title: '代码优化专家',
      tags: ['编程', '优化'],
      content: '请帮我Review这段代码，解释其功能，并给出优化建议（包括性能、可读性、安全性等方面）：\n\n```\n[在此粘贴代码]\n```',
      description: '代码审查与优化建议',
      createTime: '2024-03-05 14:30:00',
      lastModified: '无修改时间',
      enabled: true,
      categoryId: codeCategory.id,
      author: 'System',
      source: 'Built-in'
    },
    {
      id: crypto.randomUUID(),
      title: '会议纪要生成',
      tags: ['办公', '总结'],
      content: '请根据以下会议记录，整理出一份结构清晰的会议纪要。包含：会议主题、参会人员、主要议题、讨论重点、决议事项和后续行动计划（Action Items）。\n\n[在此粘贴会议记录]',
      description: '快速生成结构化会议纪要',
      createTime: '2024-03-10 09:15:00',
      lastModified: '无修改时间',
      enabled: true,
      categoryId: officeCategory.id,
      author: 'System',
      source: 'Built-in'
    },
    {
      id: crypto.randomUUID(),
      title: '创意头脑风暴',
      tags: ['创意', '灵感'],
      content: '请针对以下主题，提供10个具有创意且可行的点子/方案，并简要说明每个点子的核心价值：\n\n主题：[在此输入主题]',
      description: '针对特定主题生成创意方案',
      createTime: '2024-03-15 16:45:00',
      lastModified: '2024-03-20 11:20:00',
      enabled: true,
      categoryId: officeCategory.id,
      author: 'System',
      source: 'Built-in'
    },
    {
      id: crypto.randomUUID(),
      title: '复杂概念解释',
      tags: ['学习', '解释'],
      content: '请用通俗易懂的语言解释以下概念，最好能使用生活中的类比，让没有背景知识的初学者也能听懂：\n\n概念：[在此输入概念]',
      description: '通俗易懂地解释复杂概念',
      createTime: '2024-03-18 20:00:00',
      lastModified: '2024-03-21 08:30:00',
      enabled: true,
      categoryId: eduCategory.id,
      author: 'System',
      source: 'Built-in'
    }
  ]);

  // Initial Tags (optional, can be inferred, but good to have a list)
  const uniqueTags = new Set(['写作', '翻译', '英语', '编程', '优化', '办公', '总结', '创意', '灵感', '学习', '解释']);
  const tagsToAdd = Array.from(uniqueTags).map(name => ({
    id: crypto.randomUUID(),
    name,
    createTime: now,
    lastModified: now
  }));
  await db.tags.bulkAdd(tagsToAdd);
});

export { db };
