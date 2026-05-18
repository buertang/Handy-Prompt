import { db, incrementUsage } from '@/lib/db';
import { sortingSettings, sortNamedItems, sortPrompts } from '@/lib/sort-settings';
import zh_CN from '@/locales/zh_CN.json';
import en from '@/locales/en.json';

type Language = 'zh_CN' | 'en';
const translations: Record<Language, typeof zh_CN> = {
  zh_CN,
  en
};

const STORAGE_KEY = 'handy-prompt-language';

function getTranslation(lang: Language, key: keyof typeof zh_CN) {
  const value = translations[lang][key];
  return typeof value === 'string' ? value : key;
}

async function updateContextMenus() {
  let lang: Language = 'zh_CN'; // Default

  try {
    const syncStored = await browser.storage.sync.get(STORAGE_KEY);
    if (syncStored[STORAGE_KEY]) {
      lang = syncStored[STORAGE_KEY] as Language;
    } else {
      const localStored = await browser.storage.local.get(STORAGE_KEY);
      if (localStored[STORAGE_KEY]) {
        lang = localStored[STORAGE_KEY] as Language;
      } else {
        const uiLang = browser.i18n.getUILanguage();
        if (uiLang.startsWith('en')) {
          lang = 'en';
        }
      }
    }
  } catch (e) {
    console.error('Failed to get language for context menus', e);
  }

  // Remove existing menus to avoid duplicates
  browser.contextMenus.removeAll();

  browser.contextMenus.create({
    id: 'manage_prompts',
    title: getTranslation(lang, 'contextManagePrompts'),
    contexts: ['action']
  });

  browser.contextMenus.create({
    id: 'manage_categories',
    title: getTranslation(lang, 'contextManageCategories'),
    contexts: ['action']
  });

  browser.contextMenus.create({
    id: 'manage_tags',
    title: getTranslation(lang, 'contextManageTags'),
    contexts: ['action']
  });

  // 右键保存选中文本
  browser.contextMenus.create({
    id: 'save_selection',
    title: getTranslation(lang, 'contextSaveSelection'),
    contexts: ['selection']
  });
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default defineBackground(() => {
  console.log('Background script loaded!', { id: browser.runtime.id });

  // Handle commands (shortcuts)
  browser.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) return;

    if (command === 'open-prompt-picker') {
      browser.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_PROMPT_PICKER' });
    } else if (command === 'save-selected-text') {
      // For saving text, we need the content script to get the selection
      browser.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_SAVE_SELECTION' });
    }
  });

  // Handle messages from content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEARCH_PROMPTS') {
      (async () => {
        try {
          const all = await db.prompts.toArray();
          const enabled = all.filter(p => p.enabled);
          const [categories, sorting] = await Promise.all([
            db.categories.toArray(),
            sortingSettings.getValue(),
          ]);
          const categoryMap = new Map(categories.map(c => [c.id, c.name]));
          // Filter in memory for simplicity, or use dexie queries
          const query = message.query?.toLowerCase() || '';
          const categoryId = message.categoryId;

          const filtered = enabled.filter(p => {
            const matchText = p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.tags.some(t => t.toLowerCase().includes(query));
            const matchCategory = !categoryId || categoryId === 'all' || p.categoryId === categoryId;
            return matchText && matchCategory;
          });

          const sorted = sortPrompts(
            filtered,
            sorting.prompts,
            id => categoryMap.get(id) || ''
          );

          sendResponse({ success: true, prompts: sorted, categories });
        } catch (error) {
          console.error('Search prompts error:', error);
          sendResponse({ success: false, error: error });
        }
      })();
      return true; // Keep channel open for async response
    }

    if (message.type === 'SAVE_PROMPT') {
      (async () => {
        try {
          const prompt = message.data;
          await db.prompts.put(prompt);
          // Also ensure category exists or is handled? Assuming ID provided is valid.
          // Update tag usage counts if needed (skipped for now as TagManager handles it on load mostly, or we should update logic)
          sendResponse({ success: true });
        } catch (error) {
          console.error('Save prompt error:', error);
          sendResponse({ success: false, error });
        }
      })();
      return true;
    }

    if (message.type === 'GET_CATEGORIES_AND_TAGS') {
      (async () => {
        try {
          const [categories, tags, prompts, sorting] = await Promise.all([
            db.categories.toArray(),
            db.tags.toArray(),
            db.prompts.toArray(),
            sortingSettings.getValue(),
          ]);
          const categoryCounts = prompts.reduce<Record<string, number>>((acc, prompt) => {
            acc[prompt.categoryId] = (acc[prompt.categoryId] || 0) + 1;
            return acc;
          }, {});
          const tagCounts = prompts.reduce<Record<string, number>>((acc, prompt) => {
            prompt.tags.forEach(tagName => {
              acc[tagName] = (acc[tagName] || 0) + 1;
            });
            return acc;
          }, {});
          const sortedCategories = sortNamedItems(
            categories.map(category => ({
              ...category,
              promptCount: categoryCounts[category.id] || 0,
              isPinned: category.isDefault ? true : category.isPinned,
            })),
            sorting.categories
          );
          const sortedTags = sortNamedItems(
            tags.map(tag => ({
              ...tag,
              promptCount: tagCounts[tag.name] || 0,
              isPinned: tag.isDefault ? true : tag.isPinned,
            })),
            sorting.tags
          );

          sendResponse({ success: true, categories: sortedCategories, tags: sortedTags });
        } catch (error) {
          console.error('Get categories and tags error:', error);
          sendResponse({ success: false, error });
        }
      })();
      return true;
    }

    if (message.type === 'INCREMENT_USAGE') {
      (async () => {
        try {
          if (message.id) {
            await incrementUsage(message.id);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing prompt ID' });
          }
        } catch (error) {
          console.error('Increment usage error:', error);
          sendResponse({ success: false, error });
        }
      })();
      return true;
    }

    if (message.type === 'FETCH_CHARITY_DATA') {
      (async () => {
        try {
          // 在 Background Script 中请求，避免页面环境的 CSP/CORS 限制
          // 并通过 User-Agent 模拟浏览器行为（虽然浏览器通常会覆盖，但在扩展环境中限制较少）
          const response = await fetch('https://api.isoyu.com/gy/api.php', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            // 明确指定不发送 Referrer
            referrerPolicy: 'no-referrer'
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // 尝试获取文本，处理可能的非 JSON 响应（如 Cloudflare 页面）
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            sendResponse({ success: true, data: data.data });
          } catch (e) {
            // 如果解析失败，可能是返回了 HTML (Cloudflare challenge)
            throw new Error('Response is not valid JSON (likely Cloudflare challenge)');
          }
        } catch (error: any) {
          console.error('Charity fetch error:', error);
          sendResponse({ success: false, error: error.message || String(error) });
        }
      })();
      return true;
    }
  });

  // Listen for storage changes to update context menus
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' || areaName === 'local') {
      if (changes[STORAGE_KEY]) {
        updateContextMenus();
      }
    }
  });

  // Create context menus on install
  browser.runtime.onInstalled.addListener(() => {
    updateContextMenus();
  });

  // Handle menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    let hash = '';
    let storageData = null;

    switch (info.menuItemId) {
      case 'manage_prompts':
        hash = '#content';
        break;
      case 'manage_categories':
        hash = '#category';
        break;
      case 'manage_tags':
        hash = '#tag';
        break;
      case 'save_selection':
        // Instead of opening options page, send message to active tab
        if (tab?.id) {
          browser.tabs.sendMessage(tab.id, {
            type: 'OPEN_CONTENT_SAVE_DIALOG',
            content: info.selectionText
          }).catch(err => {
            console.log('Failed to send message to content script (maybe not loaded yet?):', err);
          });
        }
        break;
      default:
        return;
    }

    if (hash) {
      const optionsUrl = browser.runtime.getURL('/options.html');
      const targetUrl = optionsUrl + hash;

      try {
        const tabs = await browser.tabs.query({ url: optionsUrl + '*' });
        const existingTab = tabs.find(t => t.url?.startsWith(optionsUrl));

        if (existingTab && existingTab.id) {
          await browser.tabs.update(existingTab.id, { active: true, url: targetUrl });
          if (existingTab.windowId) {
            await browser.windows.update(existingTab.windowId, { focused: true });
          }
        } else {
          await browser.tabs.create({ url: targetUrl });
        }
      } catch (error) {
        console.error('Failed to navigate to options page:', error);
        await browser.tabs.create({ url: targetUrl });
      }
    }
  });

  // Handle Omnibox input
  browser.omnibox.onInputChanged.addListener(async (text, suggest) => {
    if (!text) return;
    try {
      const all = await db.prompts.toArray();
      const enabled = all.filter(p => p.enabled);
      const query = text.toLowerCase();

      const filtered = enabled.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      ).slice(0, 5); // Limit to 5 suggestions

      const suggestions = filtered.map(p => ({
        content: p.content,
        description: `${escapeXml(p.title)} - <dim>${escapeXml(p.content.substring(0, 50))}${p.content.length > 50 ? '...' : ''}</dim>`
      }));

      suggest(suggestions);
    } catch (error) {
      console.error('Omnibox search error:', error);
    }
  });

  // Handle Omnibox selection
  browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    console.log('Omnibox input entered:', text, disposition);
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab?.id) return;

      const anyBrowser = browser as any;
      if (anyBrowser.search?.query) {
        await anyBrowser.search.query({
          text,
          tabId: activeTab.id,
        });
      } else {
        await browser.tabs.update(activeTab.id, { url: text });
      }
    } catch (error) {
      console.error('Omnibox navigation error:', error);
    }
  });
});
