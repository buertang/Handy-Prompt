import { storage } from '#imports'
import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

interface AppearanceSettings {
  theme: Theme
}

interface SystemSettings {
  notifications: boolean
  syncInterval: number
  suppressShortcutWarning: boolean
}

interface UISettings {
  activeTab: string
}

// Define storage items
const appearanceSettings = storage.defineItem<AppearanceSettings>('sync:appearanceSettings', {
  fallback: {
    theme: 'system'
  }
})

const systemSettings = storage.defineItem<SystemSettings>('sync:systemSettings', {
  fallback: {
    notifications: true,
    syncInterval: 15,
    suppressShortcutWarning: false
  }
})

const uiSettings = storage.defineItem<UISettings>('local:uiSettings', {
  fallback: {
    activeTab: 'home'
  }
})

export function useSettings() {
  const [appearance, setAppearance] = useState<AppearanceSettings>({ theme: 'system' })
  const [system, setSystem] = useState<SystemSettings>({
    notifications: true,
    syncInterval: 15,
    suppressShortcutWarning: false
  })
  const [ui, setUI] = useState<UISettings>({ activeTab: 'home' })
  const [loading, setLoading] = useState(true)

  // Load settings and watch for changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [appearanceData, systemData, uiData] = await Promise.all([
          appearanceSettings.getValue(),
          systemSettings.getValue(),
          uiSettings.getValue()
        ])

        setAppearance(appearanceData)
        setSystem(systemData)
        setUI(uiData)
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()

    // Watch for changes
    const unwatchAppearance = appearanceSettings.watch((newValue) => {
      setAppearance(newValue ?? { theme: 'system' })
    })

    const unwatchSystem = systemSettings.watch((newValue) => {
      setSystem(newValue ?? {
        notifications: true,
        syncInterval: 15,
        suppressShortcutWarning: false
      })
    })

    const unwatchUI = uiSettings.watch((newValue) => {
      setUI(newValue ?? { activeTab: 'home' })
    })

    return () => {
      unwatchAppearance()
      unwatchSystem()
      unwatchUI()
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

  // Reset all settings
  const resetSettings = async () => {
    try {
      await Promise.all([
        appearanceSettings.removeValue(),
        systemSettings.removeValue(),
        uiSettings.removeValue()
      ])

      // Reset to default values
      const defaultAppearance = { theme: 'system' as Theme }
      const defaultSystem = { notifications: true, syncInterval: 15, suppressShortcutWarning: false }
      const defaultUI = { activeTab: 'home' }

      setAppearance(defaultAppearance)
      setSystem(defaultSystem)
      setUI(defaultUI)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  return {
    appearance,
    system,
    ui,
    loading,
    updateAppearance,
    updateSystem,
    updateUI,
    resetSettings
  }
} 
