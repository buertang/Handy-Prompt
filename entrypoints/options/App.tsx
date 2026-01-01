import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'

import { Toaster } from '@/components/ui/sonner'
import {
  ArrowRightLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  LanguagesIcon,
  SettingsIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'

import LogoSvg from '@/assets/logo.svg'
import Facebook from '@/assets/facebook'
import Github from '@/assets/github'
import X from '@/assets/x'
import Instagram from '@/assets/instagram'
import LanguageDropdown from '@/components/shadcn-studio/blocks/dropdown-language'
import { ThemeToggle } from '@/components/shadcn-studio/blocks/theme-toggle'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { CharityCard } from '@/components/charity-card'

import ContentManager from './pages/ContentManager'
import CategoryManager from './pages/CategoryManager'
import SyncManager from './pages/SyncManager'
import Settings from './pages/Settings'
import TagManager from './pages/TagManager'
import { I18nProvider, useI18n, type I18nKey } from '@/components/i18n-provider'

type MenuSubItem = {
  label: I18nKey
  href: string
  badge?: string
}

type MenuItem = {
  icon: ComponentType
  label: I18nKey
} & (
    | {
      href: string
      badge?: string
      items?: never
    }
    | { href?: never; badge?: never; items: MenuSubItem[] }
  )

const menuItems: MenuItem[] = [
  {
    icon: ClipboardListIcon,
    label: 'promptManagement',
    items: [
      { label: 'contentManagement', href: '#content' },
      { label: 'categoryManagement', href: '#category' },
      { label: 'tagManagement', href: '#tag' }
    ]
  },
  {
    icon: ArrowRightLeftIcon,
    label: 'syncManagement',
    href: '#sync'
  },
  {
    icon: SettingsIcon,
    label: 'settings',
    href: '#settings'
  }
]

const SidebarGroupedMenuItems = ({
  data,
  groupLabel,
  onItemClick
}: {
  data: MenuItem[]
  groupLabel?: string
  onItemClick: (label: I18nKey, subLabel?: I18nKey) => void
}) => {
  const { t } = useI18n()

  return (
    <SidebarGroup>
      {groupLabel && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {data.map(item =>
            item.items ? (
              <Collapsible className='group/collapsible' key={item.label} defaultOpen>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <item.icon />
                      <span>{t(item.label)}</span>
                      <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map(subItem => (
                        <SidebarMenuSubItem key={subItem.label}>
                          <SidebarMenuSubButton className='justify-between' asChild>
                            <a
                              href={subItem.href}
                              onClick={e => {
                                e.preventDefault()
                                window.location.hash = subItem.href
                                onItemClick(item.label, subItem.label)
                              }}
                            >
                              {t(subItem.label)}
                              {subItem.badge && (
                                <span className='bg-primary/10 flex h-5 min-w-5 items-center justify-center rounded-full text-xs'>
                                  {subItem.badge}
                                </span>
                              )}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild>
                  <a
                    href={item.href}
                    onClick={e => {
                      e.preventDefault()
                      if (item.href) {
                        window.location.hash = item.href
                      }
                      onItemClick(item.label)
                    }}
                  >
                    <item.icon />
                    <span>{t(item.label)}</span>
                  </a>
                </SidebarMenuButton>
                {item.badge && <SidebarMenuBadge className='bg-primary/10 rounded-full'>{item.badge}</SidebarMenuBadge>}
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const ApplicationShellContent = () => {
  const { t } = useI18n()
  const [breadcrumbItems, setBreadcrumbItems] = useState<I18nKey[]>(['promptManagement', 'contentManagement'])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#category') {
        setBreadcrumbItems(['promptManagement', 'categoryManagement'])
      } else if (hash === '#tag') {
        setBreadcrumbItems(['promptManagement', 'tagManagement'])
      } else if (hash === '#settings') {
        setBreadcrumbItems(['settings'])
      } else if (hash === '#sync') {
        setBreadcrumbItems(['syncManagement'])
      } else if (hash === '#content' || hash === '') {
        setBreadcrumbItems(['promptManagement', 'contentManagement'])
      }
    }

    // Initial check
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const { appearance, updateAppearance, system } = useSettings()
  useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  // 监听窗口高度，如果高度不足则隐藏公益卡片
  const [isHeightSufficient, setIsHeightSufficient] = useState(true)

  useEffect(() => {
    // 700px 为阈值：Header(~80) + Footer(~40) + CharityCard(320) + MinMenu(~260)
    const mql = window.matchMedia('(min-height: 700px)')
    const handleChange = (e: MediaQueryListEvent) => setIsHeightSufficient(e.matches)

    // Initial check
    setIsHeightSufficient(mql.matches)

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const handleMenuClick = (label: I18nKey, subLabel?: I18nKey) => {
    if (subLabel) {
      setBreadcrumbItems([label, subLabel])
    } else {
      setBreadcrumbItems([label])
    }
  }

  const renderContent = () => {
    // 根据面包屑判断当前页面
    // 面包屑结构: [主菜单] 或 [主菜单, 子菜单]
    const mainLabel = breadcrumbItems[0]
    const subLabel = breadcrumbItems[1]

    if (mainLabel === 'promptManagement') {
      if (subLabel === 'contentManagement') return <ContentManager />
      if (subLabel === 'categoryManagement') return <CategoryManager />
      if (subLabel === 'tagManagement') return <TagManager />
    }
    if (mainLabel === 'syncManagement') {
      // 由于SyncManager页面包含所有同步选项，这里简化处理，都显示SyncManager
      // 实际也可以在SyncManager内部通过props控制显示的Tab
      return <SyncManager />
    }
    if (mainLabel === 'settings') {
      return <Settings />
    }

    // 默认显示内容管理
    return <ContentManager />
  }

  return (
    <div className='flex min-h-dvh w-full'>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className='items-center gap-2 border-b py-6'>
            <Avatar className='size-12'>
              <AvatarImage src={LogoSvg} alt='Handy Prompt' />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className='text-sidebar-accent-foreground flex flex-col items-center'>
              <p className='text-sm'>Handy Prompt</p>
            </div>
            {/* <div className='flex items-center gap-5'>
              <a href='#'>
                <Facebook />
              </a>
              <a href='#'>
                <Instagram />
              </a>
              <a href='#'>
                <Github />
              </a>
              <a href='#'>
                <X />
              </a>
            </div> */}
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroupedMenuItems data={menuItems} onItemClick={handleMenuClick} />
          </SidebarContent>
          <SidebarFooter className='px-4 py-3.5'>
            {system.showCharityDisplay && isHeightSufficient && <CharityCard />}
            <a href='#'>
              <div className='flex items-center justify-center'>
                {/* <img src={LogoSvg} alt="Logo" className='size-8.5' /> */}
                <span className='text-sm text-muted-foreground'>@2025 Handy Prompt</span>
              </div>
            </a>
          </SidebarFooter>
        </Sidebar>
        <div className='flex flex-1 flex-col'>
          <header className='bg-card sticky top-0 z-50 border-b'>
            <div className='mx-auto flex  items-center justify-between gap-6 px-4 py-2 sm:px-6'>
              <div className='flex items-center gap-4'>
                <SidebarTrigger className='[&_svg]:!size-5' />
                <Separator orientation='vertical' className='hidden !h-4 sm:block' />
                <Breadcrumb className='hidden sm:block'>
                  <BreadcrumbList>
                    <BreadcrumbItem className='hidden md:block'>
                      <BreadcrumbLink href='#'>{t('home')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className='hidden md:block' />
                    {breadcrumbItems.map((item, index) => (
                      <div key={item} className='flex items-center gap-1.5'>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === breadcrumbItems.length - 1 ? (
                            <BreadcrumbPage>{t(item)}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href='#'>{t(item)}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className='flex items-center gap-1.5'>
                <LanguageDropdown
                  trigger={
                    <Button variant='ghost' size='icon'>
                      <LanguagesIcon />
                    </Button>
                  }
                />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className='mx-auto size-full max-w-7xl flex-1 px-4 py-6 sm:px-6'>
            {renderContent()}
          </main>
        </div>
      </SidebarProvider>
      <Toaster />
    </div>
  )
}

const ApplicationShell = () => {
  return (
    <I18nProvider>
      <ApplicationShellContent />
    </I18nProvider>
  )
}

export default ApplicationShell