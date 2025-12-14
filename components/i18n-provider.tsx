import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { browser } from 'wxt/browser';
import zh_CN from '@/locales/zh_CN.json';
import en from '@/locales/en.json';

// Define the shape of your translation structure
// Using zh_CN as the source of truth for keys
type Translations = typeof zh_CN;

// Helper type to access nested keys
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
  ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
  : `${Key}`
}[keyof ObjectType & (string | number)];

export type I18nKey = NestedKeyOf<Translations>;

type Language = 'en' | 'zh_CN';

interface I18nContextType {
  t: (key: I18nKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  en,
  zh_CN,
};

const STORAGE_KEY = 'handy-prompt-language';

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('zh_CN');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      // Try to get from storage first
      // Fallback to local if sync is empty (migration scenario)
      let storedValue = null;
      try {
        const syncStored = await browser.storage.sync.get(STORAGE_KEY);
        storedValue = syncStored[STORAGE_KEY];
      } catch (e) {
        console.warn('Failed to read from sync storage:', e);
      }

      if (!storedValue) {
        const localStored = await browser.storage.local.get(STORAGE_KEY);
        storedValue = localStored[STORAGE_KEY];
        // If found in local but not sync, migrate to sync
        if (storedValue) {
          browser.storage.sync.set({ [STORAGE_KEY]: storedValue });
        }
      }

      if (storedValue) {
        setLanguageState(storedValue as Language);
      } else {
        // Fallback to browser UI language
        const uiLang = browser.i18n.getUILanguage();
        // Default to zh_CN if no match or explicitly zh
        if (uiLang.startsWith('en')) {
          setLanguageState('en');
        } else {
          setLanguageState('zh_CN');
        }
      }
      setIsLoaded(true);
    };

    initLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    browser.storage.sync.set({ [STORAGE_KEY]: lang });
    // Also set local for backup/speed? No, single source of truth is better.
    // But we might want to clear local to avoid confusion.
    browser.storage.local.remove(STORAGE_KEY); 
  };

  const t = (key: I18nKey): string => {
    const langData = translations[language];
    const keys = key.split('.');
    let result: any = langData;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k as keyof typeof result];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
