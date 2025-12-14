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
      'https://api.notion.com/*',
      'https://*.jianguoyun.com/*' // Common WebDAV example, usually users need specific
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
