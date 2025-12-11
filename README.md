# Handy-Prompt

这是一个用于管理提示词（Prompt）的 Chrome 扩展程序。

## 功能介绍

- **提示词管理**：
  - 内容管理：查看和编辑提示词。
  - 分类管理：对提示词进行分类。
- **同步管理**：
  - Notion 同步：支持与 Notion 进行数据同步。
  - WebDAV 同步：支持通过 WebDAV 备份和恢复。
- **设置**：扩展程序的通用设置。

## 开发说明

- **技术栈**：WXT, React, Tailwind CSS, Shadcn UI。
- **目录结构**：
  - `entrypoints/options`：选项页面的代码，包含侧边栏和主内容区域。
  - `components`：UI 组件库。

## 使用方法

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 打开 Chrome 扩展程序管理页面，加载未解压的扩展。
