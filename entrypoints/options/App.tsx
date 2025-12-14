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

import ContentManager from './pages/ContentManager'
import CategoryManager from './pages/CategoryManager'
import SyncManager from './pages/SyncManager'
import Settings from './pages/Settings'
import TagManager from './pages/TagManager'

type MenuSubItem = {
  label: string
  href: string
  badge?: string
}

type MenuItem = {
  icon: ComponentType
  label: string
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
    label: '提示词管理',
    items: [
      { label: '内容管理', href: '#' },
      { label: '分类管理', href: '#' },
      { label: '标签管理', href: '#' }
    ]
  },
  {
    icon: ArrowRightLeftIcon,
    label: '同步管理',
    href: '#'
  },
  {
    icon: SettingsIcon,
    label: '设置',
    href: '#'
  }
]

const SidebarGroupedMenuItems = ({
  data,
  groupLabel,
  onItemClick
}: {
  data: MenuItem[]
  groupLabel?: string
  onItemClick: (label: string, subLabel?: string) => void
}) => {
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
                      <span>{item.label}</span>
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
                                onItemClick(item.label, subItem.label)
                              }}
                            >
                              {subItem.label}
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
                      onItemClick(item.label)
                    }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
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

const ApplicationShell = () => {
  const [breadcrumbItems, setBreadcrumbItems] = useState<string[]>(['提示词管理', '内容管理'])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#category') {
        setBreadcrumbItems(['提示词管理', '分类管理'])
      } else if (hash === '#tag') {
        setBreadcrumbItems(['提示词管理', '标签管理'])
      } else if (hash === '#settings') {
        setBreadcrumbItems(['设置'])
      } else if (hash === '#sync') {
        setBreadcrumbItems(['同步管理'])
      } else if (hash === '#content' || hash === '') {
        setBreadcrumbItems(['提示词管理', '内容管理'])
      }
    }

    // Initial check
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const { appearance, updateAppearance } = useSettings()
  useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  const handleMenuClick = (label: string, subLabel?: string) => {
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

    if (mainLabel === '提示词管理') {
      if (subLabel === '内容管理') return <ContentManager />
      if (subLabel === '分类管理') return <CategoryManager />
      if (subLabel === '标签管理') return <TagManager />
    }
    if (mainLabel === '同步管理') {
      // 由于SyncManager页面包含所有同步选项，这里简化处理，都显示SyncManager
      // 实际也可以在SyncManager内部通过props控制显示的Tab
      return <SyncManager />
    }
    if (mainLabel === '设置') {
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
            <div className='flex items-center gap-5'>
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
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroupedMenuItems data={menuItems} onItemClick={handleMenuClick} />
          </SidebarContent>
          <SidebarFooter className='px-4 py-3.5'>
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
                      <BreadcrumbLink href='#'>Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className='hidden md:block' />
                    {breadcrumbItems.map((item, index) => (
                      <div key={item} className='flex items-center gap-1.5'>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === breadcrumbItems.length - 1 ? (
                            <BreadcrumbPage>{item}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href='#'>{item}</BreadcrumbLink>
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

export default ApplicationShell
