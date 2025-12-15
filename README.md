# Handy-Prompt

Handy-Prompt 是一个强大的 Chrome 扩展程序，专为 Prompt Engineering 设计，帮助用户高效管理、分类和使用海量提示词。

## ✨ 主要功能

### 1. 📝 提示词管理 (Prompt Management)
- **海量存储**：使用 IndexedDB 技术，支持存储 10,000+ 条提示词，无需担心性能问题。
- **即时搜索**：毫秒级搜索体验，快速找到你需要的提示词。
- **智能标签**：支持为提示词添加多个标签，支持创建、重命名和删除标签。
- **分类归档**：
  - 支持多级分类管理。
  - 删除分类时，可智能选择“保留提示词（移至默认分类）”或“级联删除”。
- **详细信息**：自动记录创建时间和精确到秒的最后修改时间。

### 2. 🔄 同步与备份 (Sync & Backup)
- **Notion 同步**：支持配置 Notion Integration Token 和 Database ID，实现双向同步（配置中）。
- **WebDAV 备份**：支持坚果云、Nextcloud 等 WebDAV 协议网盘，一键备份和恢复数据。

### 3. 🔍 地址栏快捷搜索 (Omnibox)
- 在 Chrome 地址栏输入 `hp` + `空格`，即可激活快速搜索模式。
- 输入关键词查找提示词，上下键选择。
- 选中回车后，将调用默认引擎搜索提示词内容。

### 4. ⚙️ 个性化设置
- **主题切换**：支持浅色、深色及跟随系统主题。
- **快捷键**：支持自定义快捷键唤起扩展。

## 🛠️ 技术栈

- **框架**: [WXT](https://wxt.dev/) (Web Extension Tools)
- **UI 库**: React 18 + Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- **数据存储**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **图标**: Lucide React

## 📂 目录结构

```
d:\Project\buertang\chrome_extension\Handy-Prompt
├── assets/             # 静态资源
├── components/         # UI 组件 (shadcn/ui + 业务组件)
│   ├── category-dialog.tsx # 分类编辑弹窗
│   ├── prompt-dialog.tsx   # 提示词编辑弹窗
│   ├── tag-dialog.tsx      # 标签编辑弹窗
│   └── ui/                 # 基础 UI 组件
├── entrypoints/        # WXT 入口文件
│   ├── background.ts   # 后台脚本
│   ├── content.ts      # 内容脚本
│   ├── options/        # 选项页面 (管理后台)
│   │   ├── pages/
│   │   │   ├── ContentManager.tsx  # 内容管理页
│   │   │   ├── CategoryManager.tsx # 分类管理页
│   │   │   ├── TagManager.tsx      # 标签管理页
│   │   │   ├── SyncManager.tsx     # 同步配置页
│   │   │   └── Settings.tsx        # 设置页
│   └── popup/          # 弹出页面 (浏览器右上角)
├── hooks/              # 自定义 React Hooks
├── lib/                # 工具库
│   └── db.ts           # Dexie 数据库定义
└── wxt.config.ts       # WXT 配置文件
```

## 🚀 快速开始

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **启动开发服务器**
   ```bash
   pnpm dev
   ```
   此命令将启动 Chrome 并加载扩展程序，支持热重载。

3. **构建生产版本**
   ```bash
   pnpm build
   ```

## 📖 使用指南

### 1. 管理提示词
- 点击扩展图标 -> "管理提示词" 进入后台。
- 点击 "新建提示词" 或直接编辑现有内容。
- 在编辑框中，可以直接输入新标签，系统会自动创建。

### 2. 数据安全
- 所有的提示词数据存储在您本地浏览器的 IndexedDB 中，安全且私密。
- 建议定期通过 "同步管理" -> "WebDAV" 进行数据备份。

## 🤝 贡献
欢迎提交 Issue 或 Pull Request 来改进这个项目！
