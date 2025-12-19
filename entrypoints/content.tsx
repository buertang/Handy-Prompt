import ReactDOM from 'react-dom/client';
import '@/assets/tailwind.css';
import { PromptPicker } from '@/components/prompt-picker';
import { ContentSaveDialog } from '@/components/content-save-dialog';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect, useRef } from 'react';
import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('Handy Prompt Content Script Loaded');
    const ui = await createShadowRootUi(ctx, {
      name: 'handy-prompt-ui',
      position: 'overlay', // Changed to overlay for better popup handling
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        console.log('Handy Prompt UI Mounted');
        const app = document.createElement('div');
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(<ContentApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

function ContentApp() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveContent, setSaveContent] = useState('');
  const [popupMode, setPopupMode] = useState<'follow' | 'center'>('follow');
  const popupModeRef = useRef<'follow' | 'center'>('follow');

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await browser.storage.sync.get('sync:appearanceSettings');
        const settings = stored['sync:appearanceSettings'];
        if (settings && settings.popupMode) {
          setPopupMode(settings.popupMode);
          popupModeRef.current = settings.popupMode;
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'sync' && changes['sync:appearanceSettings']) {
        const newValue = changes['sync:appearanceSettings'].newValue;
        if (newValue && newValue.popupMode) {
          setPopupMode(newValue.popupMode);
          popupModeRef.current = newValue.popupMode;
        }
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Track previous focus to restore it
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pickerPosition.left,
      y: e.clientY - pickerPosition.top
    });
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        setPickerPosition({
          left: e.clientX - dragOffset.x,
          top: e.clientY - dragOffset.y
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // 1. Listen for /p trigger
  useEffect(() => {
    const handleInput = (e: Event) => {
      // console.log('Input event detected', e.target);
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;

      if (!isInput && !isContentEditable) return;

      lastFocusedRef.current = target;

      let text = '';
      let cursorIndex = 0;

      if (isInput) {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        text = input.value;
        cursorIndex = input.selectionStart || 0;
      } else {
        // contentEditable handling is rough
        text = target.innerText || target.textContent || '';
        cursorIndex = text.length;
      }

      // Check for /p at the end or before cursor
      const textBeforeCursor = text.slice(0, cursorIndex);
      // console.log('Text before cursor:', textBeforeCursor);

      // Strict check for /p at the end
      if (textBeforeCursor.endsWith('/p')) {
        console.log('Trigger /p detected');
        const rect = target.getBoundingClientRect();

        if (popupModeRef.current === 'center') {
          setPickerPosition({
            top: Math.max(0, window.innerHeight / 2 - 225),
            left: Math.max(0, window.innerWidth / 2 - 250)
          });
        } else {
          // Follow mode with collision detection
          const pickerHeight = 450;
          const pickerWidth = 500;

          let top = rect.bottom + window.scrollY + 5;
          let left = rect.left + window.scrollX;

          // Check bottom edge collision
          const viewportBottom = window.scrollY + window.innerHeight;
          if (top + pickerHeight > viewportBottom) {
            // Not enough space below, check above
            if (rect.top + window.scrollY - pickerHeight - 5 > window.scrollY) {
              top = rect.top + window.scrollY - pickerHeight - 5;
            } else {
              // Not enough space above either, pick the side with more space
              const spaceBelow = viewportBottom - (rect.bottom + window.scrollY);
              const spaceAbove = (rect.top + window.scrollY) - window.scrollY;

              if (spaceAbove > spaceBelow) {
                top = rect.top + window.scrollY - pickerHeight - 5;
                // If it goes off-screen top, clamp it
                if (top < window.scrollY) top = window.scrollY + 10;
              } else {
                // Clamp to viewport bottom if sticking to bottom
                if (top + pickerHeight > viewportBottom) {
                  top = viewportBottom - pickerHeight - 10;
                }
              }
            }
          }

          // Check right edge collision
          const viewportRight = window.scrollX + window.innerWidth;
          if (left + pickerWidth > viewportRight) {
            left = viewportRight - pickerWidth - 20;
          }
          if (left < window.scrollX) {
            left = window.scrollX + 10;
          }

          setPickerPosition({ top, left });
        }

        setActiveElement(target);
        setPickerOpen(true);
      } else {
        // 如果删除了 /p，应该关闭
        if (pickerOpen && !textBeforeCursor.includes('/p')) {
          setPickerOpen(false);
        }
      }
    };

    document.addEventListener('input', handleInput);

    // Listen for messages from background (Right Click -> Save)
    const handleMessage = (message: any) => {
      console.log('Content script received message:', message);
      if (message.type === 'OPEN_CONTENT_SAVE_DIALOG') {
        setSaveContent(message.content);
        setSaveDialogOpen(true);
      } else if (message.type === 'TOGGLE_PROMPT_PICKER') {
        // Toggle picker for active element
        if (pickerOpen) {
          setPickerOpen(false);
          // Restore focus
          if (lastFocusedRef.current) {
            lastFocusedRef.current.focus();
            lastFocusedRef.current = null;
          }
        } else {
          // If we have a lastFocusedRef (from previous interaction), try to use it if it's still connected
          let target = document.activeElement as HTMLElement | null;

          const isEditableElement = (el: HTMLElement | null): el is HTMLElement =>
            !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

          if (!isEditableElement(target)) {
            if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
              target = lastFocusedRef.current;
            } else {
              target = null;
            }
          }

          if (isEditableElement(target)) {
            lastFocusedRef.current = target;
            setActiveElement(target);
            const rect = target.getBoundingClientRect();

            if (popupModeRef.current === 'center') {
              setPickerPosition({
                top: Math.max(0, window.innerHeight / 2 - 225),
                left: Math.max(0, window.innerWidth / 2 - 250)
              });
            } else {
              // Same collision logic as above
              const pickerHeight = 450;
              const pickerWidth = 500;

              let top = rect.bottom + window.scrollY + 5;
              let left = rect.left + window.scrollX;

              const viewportBottom = window.scrollY + window.innerHeight;
              if (top + pickerHeight > viewportBottom) {
                if (rect.top + window.scrollY - pickerHeight - 5 > window.scrollY) {
                  top = rect.top + window.scrollY - pickerHeight - 5;
                } else {
                  const spaceBelow = viewportBottom - (rect.bottom + window.scrollY);
                  const spaceAbove = (rect.top + window.scrollY) - window.scrollY;
                  if (spaceAbove > spaceBelow) {
                    top = rect.top + window.scrollY - pickerHeight - 5;
                    if (top < window.scrollY) top = window.scrollY + 10;
                  } else {
                    if (top + pickerHeight > viewportBottom) {
                      top = viewportBottom - pickerHeight - 10;
                    }
                  }
                }
              }

              const viewportRight = window.scrollX + window.innerWidth;
              if (left + pickerWidth > viewportRight) {
                left = viewportRight - pickerWidth - 20;
              }
              if (left < window.scrollX) {
                left = window.scrollX + 10;
              }

              setPickerPosition({ top, left });
            }

            setPickerOpen(true);
          } else {
            // Show centered if no input focused
            setPickerPosition({
              top: Math.max(0, window.innerHeight / 2 - 225),
              left: Math.max(0, window.innerWidth / 2 - 250)
            });
            setPickerOpen(true);
          }
        }
      } else if (message.type === 'TRIGGER_SAVE_SELECTION') {
        const selection = window.getSelection()?.toString();
        if (selection) {
          setSaveContent(selection);
          setSaveDialogOpen(true);
        }
      }
    };
    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      document.removeEventListener('input', handleInput);
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleInsert = (content: string) => {
    // ... insert logic ...
    // Focus logic handles activeElement but we should also consider restoring focus if needed
    if (!activeElement) return;

    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = input.value;

      // Remove the /p trigger
      const textBefore = text.slice(0, start).replace(/\/p$/, '');
      const textAfter = text.slice(end);

      const newText = textBefore + content + textAfter;
      input.value = newText;

      // Restore cursor
      const newCursorPos = textBefore.length + content.length;
      input.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger input event for frameworks (React/Vue)
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Keep focus on input
      input.focus();
    } else if (activeElement.isContentEditable) {
      // Simple replacement for contentEditable
      // Note: This replaces everything or appends. 
      // Real implementation needs Range manipulation to replace specific /p
      activeElement.innerText = activeElement.innerText.replace(/\/p$/, '') + content;
      activeElement.focus();
    }

    setPickerOpen(false);
    // Clear ref since we handled focus manually
    lastFocusedRef.current = null;
  };

  return (
    <div className="font-sans text-base text-gray-900 antialiased pointer-events-none fixed inset-0 z-[2147483647]">
      {/* Inject styles wrapper if needed, but WXT Shadow DOM handles isolation */}
      {pickerOpen && (
        <div
          className="fixed pointer-events-auto shadow-2xl rounded-lg"
          style={{ top: pickerPosition.top, left: pickerPosition.left }}
        >
          <PromptPicker
            onSelect={handleInsert}
            onClose={() => {
              setPickerOpen(false);
              if (lastFocusedRef.current) {
                lastFocusedRef.current.focus();
                lastFocusedRef.current = null;
              }
            }}
            onDragStart={handleDragStart}
          />
        </div>
      )}

      {saveDialogOpen && (
        <div className="pointer-events-auto">
          <ContentSaveDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            initialContent={saveContent}
          />
        </div>
      )}
      <Toaster />
    </div>
  );
}
