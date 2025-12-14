import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '@': path.resolve(__dirname, './'),
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Handy Prompt',
    description: '做自己随手可用的prompt工具',
    // permissions: ['sidePanel', 'storage'],
    // side_panel: {
    //   default_path: 'sidepanel.html'
    // },
    // action: {
    //   default_title: 'Open Sidepanel'
    // }
    permissions: ['storage', 'contextMenus'],
    host_permissions: [
      '<all_urls>',
    ],
    commands: {
      "open-prompt-picker": {
        "suggested_key": {
          "default": "Ctrl+Shift+P",
          "mac": "Command+Shift+P"
        },
        "description": "打开提示词选择弹窗"
      },
      "save-selected-text": {
        "suggested_key": {
          "default": "Ctrl+Shift+S",
          "mac": "Command+Shift+S"
        },
        "description": "保存选中的文本作为提示词"
      }
    }
  },
});
