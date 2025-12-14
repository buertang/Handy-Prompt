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
        setPickerPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        });
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
            setPickerPosition({
              top: rect.bottom + window.scrollY + 5,
              left: rect.left + window.scrollX
            });
            setPickerOpen(true);
          } else {
            // Show centered if no input focused
            setPickerPosition({
              top: window.innerHeight / 2 - 200,
              left: window.innerWidth / 2 - 250
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
