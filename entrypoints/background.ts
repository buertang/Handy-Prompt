export default defineBackground(() => {
  console.log('Background script loaded!', { id: browser.runtime.id });

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
        hash = '#content';
        if (info.selectionText) {
          storageData = { pendingPromptContent: info.selectionText };
        }
        break;
      default:
        return;
    }

    if (storageData) {
      await browser.storage.local.set(storageData);
    }

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

        // 如果是保存操作且已存在标签页，可能需要发送消息通知页面刷新/打开弹窗
        // 因为 storage 变化不会自动触发页面逻辑（除非页面监听了 storage 变化）
        if (storageData && existingTab.id) {
          browser.tabs.sendMessage(existingTab.id, { type: 'OPEN_ADD_PROMPT', content: info.selectionText })
            .catch(() => {
              // Ignore errors if content script is not ready or message fails
              // The page will check storage on focus/visibility change hopefully
            });
        }

      } else {
        await browser.tabs.create({ url: targetUrl });
      }
    } catch (error) {
      console.error('Failed to navigate to options page:', error);
      await browser.tabs.create({ url: targetUrl });
    }
  });
});
