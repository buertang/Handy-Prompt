import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  alias: {
    '@': path.resolve(__dirname, './'),
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    default_locale: 'zh_CN',
    name: '__MSG_extName__',
    description: '__MSG_extDesc__',
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
        "description": "__MSG_openPromptPicker__"
      },
      "save-selected-text": {
        "suggested_key": {
          "default": "Ctrl+Shift+S",
          "mac": "Command+Shift+S"
        },
        "description": "__MSG_saveSelectedText__"
      }
    }
  },
});
