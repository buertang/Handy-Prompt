import { storage } from '#imports'
import { useEffect, useState } from 'react'
import {
  DEFAULT_SORTING_SETTINGS,
  normalizeSortingSettings,
  sortingSettings,
  type SortingSettings,
} from '@/lib/sort-settings'

type Theme = 'system' | 'light' | 'dark'

interface AppearanceSettings {
  theme: Theme
  viewMode: 'card' | 'list'
  popupMode: 'follow' | 'center'
}

interface SystemSettings {
  notifications: boolean
  syncInterval: number
  suppressShortcutWarning: boolean
  showCharityDisplay: boolean
}

interface UISettings {
  activeTab: string
  contentSelectedCategory: string
}

// Define storage items
const appearanceSettings = storage.defineItem<AppearanceSettings>('sync:appearanceSettings', {
  fallback: {
    theme: 'system',
    viewMode: 'card',
    popupMode: 'follow'
  }
})

const systemSettings = storage.defineItem<SystemSettings>('sync:systemSettings', {
  fallback: {
    notifications: true,
    syncInterval: 15,
    suppressShortcutWarning: false,
    showCharityDisplay: true
  }
})

const uiSettings = storage.defineItem<UISettings>('local:uiSettings', {
  fallback: {
    activeTab: 'home',
    contentSelectedCategory: 'all'
  }
})

export function useSettings() {
  const [appearance, setAppearance] = useState<AppearanceSettings>({ theme: 'system', viewMode: 'card', popupMode: 'follow' })
  const [system, setSystem] = useState<SystemSettings>({
    notifications: true,
    syncInterval: 15,
    suppressShortcutWarning: false,
    showCharityDisplay: true
  })
  const [ui, setUI] = useState<UISettings>({ activeTab: 'home', contentSelectedCategory: 'all' })
  const [sorting, setSorting] = useState<SortingSettings>(DEFAULT_SORTING_SETTINGS)
  const [loading, setLoading] = useState(true)

  // Load settings and watch for changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [appearanceData, systemData, uiData, sortingData] = await Promise.all([
          appearanceSettings.getValue(),
          systemSettings.getValue(),
          uiSettings.getValue(),
          sortingSettings.getValue()
        ])

        setAppearance(appearanceData)
        setSystem(systemData)
        setUI(uiData)
        setSorting(normalizeSortingSettings(sortingData))
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()

    // Watch for changes
    const unwatchAppearance = appearanceSettings.watch((newValue) => {
      setAppearance(newValue ?? { theme: 'system', viewMode: 'card', popupMode: 'follow' })
    })

    const unwatchSystem = systemSettings.watch((newValue) => {
      setSystem(newValue ?? {
        notifications: true,
        syncInterval: 15,
        suppressShortcutWarning: false,
        showCharityDisplay: true
      })
    })

    const unwatchUI = uiSettings.watch((newValue) => {
      setUI(newValue ?? { activeTab: 'home', contentSelectedCategory: 'all' })
    })

    const unwatchSorting = sortingSettings.watch((newValue) => {
      setSorting(normalizeSortingSettings(newValue))
    })

    return () => {
      unwatchAppearance()
      unwatchSystem()
      unwatchUI()
      unwatchSorting()
    }
  }, [])

  // Update appearance settings
  const updateAppearance = async (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...appearance, ...updates }
    setAppearance(newSettings)
    try {
      await appearanceSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save appearance settings:', error)
    }
  }

  // Update system settings
  const updateSystem = async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...system, ...updates }
    setSystem(newSettings)
    try {
      await systemSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save system settings:', error)
    }
  }

  // Update UI settings
  const updateUI = async (updates: Partial<UISettings>) => {
    const newSettings = { ...ui, ...updates }
    setUI(newSettings)
    try {
      await uiSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save UI settings:', error)
    }
  }

  // Update sorting settings
  const updateSorting = async (updates: Partial<SortingSettings>) => {
    const newSettings = normalizeSortingSettings({
      prompts: { ...sorting.prompts, ...updates.prompts },
      categories: { ...sorting.categories, ...updates.categories },
      tags: { ...sorting.tags, ...updates.tags },
    })
    setSorting(newSettings)
    try {
      await sortingSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save sorting settings:', error)
    }
  }

  // Reset all settings
  const resetSettings = async () => {
    try {
      await Promise.all([
        appearanceSettings.removeValue(),
        systemSettings.removeValue(),
        uiSettings.removeValue(),
        sortingSettings.removeValue()
      ])

      // Reset to default values
      const defaultAppearance = { theme: 'system', viewMode: 'card' }
      const defaultSystem = { notifications: true, syncInterval: 15, suppressShortcutWarning: false, showCharityDisplay: true }
      const defaultUI = { activeTab: 'home', contentSelectedCategory: 'all' }

      setAppearance(defaultAppearance as AppearanceSettings)
      setSystem(defaultSystem)
      setUI(defaultUI)
      setSorting(DEFAULT_SORTING_SETTINGS)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  return {
    appearance,
    system,
    ui,
    sorting,
    loading,
    updateAppearance,
    updateSystem,
    updateUI,
    updateSorting,
    resetSettings
  }
} 
