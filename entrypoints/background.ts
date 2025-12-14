import { db } from '@/lib/db';

export default defineBackground(() => {
  console.log('Background script loaded!', { id: browser.runtime.id });

  // Handle messages from content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEARCH_PROMPTS') {
      (async () => {
        try {
          const all = await db.prompts.toArray();
          const enabled = all.filter(p => p.enabled);
          // Filter in memory for simplicity, or use dexie queries
          const query = message.query?.toLowerCase() || '';
          const categoryId = message.categoryId;

          const filtered = enabled.filter(p => {
            const matchText = p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.tags.some(t => t.toLowerCase().includes(query));
            const matchCategory = !categoryId || categoryId === 'all' || p.categoryId === categoryId;
            return matchText && matchCategory;
          });

          // Also fetch categories for the picker
          const categories = await db.categories.toArray();

          sendResponse({ success: true, prompts: filtered, categories });
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
          const categories = await db.categories.toArray();
          const tags = await db.tags.toArray();
          sendResponse({ success: true, categories, tags });
        } catch (error) {
          sendResponse({ success: false, error });
        }
      })();
      return true;
    }
  });

  // Create context menus on install
  browser.runtime.onInstalled.addListener(() => {
    // Remove existing menus to avoid duplicates
    browser.contextMenus.removeAll();

    browser.contextMenus.create({
      id: 'manage_prompts',
      title: '管理提示词',
      contexts: ['action']
    });

    browser.contextMenus.create({
      id: 'manage_categories',
      title: '管理分类',
      contexts: ['action']
    });

    browser.contextMenus.create({
      id: 'manage_tags',
      title: '管理标签',
      contexts: ['action']
    });

    // 右键保存选中文本
    browser.contextMenus.create({
      id: 'save_selection',
      title: '保存为提示词',
      contexts: ['selection']
    });
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
});
