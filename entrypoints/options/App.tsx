import type { ComponentType } from 'react'

import {
  ArrowRightLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  FacebookIcon,
  InstagramIcon,
  LanguagesIcon,
  LinkedinIcon,
  SettingsIcon,
  TwitterIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
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
import LanguageDropdown from '@/components/shadcn-studio/blocks/dropdown-language'

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
      { label: '分类管理', href: '#' }
    ]
  },
  {
    icon: ArrowRightLeftIcon,
    label: '同步管理',
    items: [
      { label: 'Notion同步', href: '#' },
      { label: 'WebDAV同步', href: '#' }
    ]
  },
  {
    icon: SettingsIcon,
    label: '设置',
    href: '#'
  }
]

const SidebarGroupedMenuItems = ({ data, groupLabel }: { data: MenuItem[]; groupLabel?: string }) => {
  return (
    <SidebarGroup>
      {groupLabel && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {data.map(item =>
            item.items ? (
              <Collapsible className='group/collapsible' key={item.label}>
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
                            <a href={subItem.href}>
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
                  <a href={item.href}>
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
  return (
    <div className='flex min-h-dvh w-full'>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className='items-center gap-2 border-b py-6'>
            <Avatar className='size-12'>
              <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' alt='John Doe' />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className='text-sidebar-accent-foreground flex flex-col items-center'>
              <p className='text-sm'>John Doe</p>
              <p className='text-xs font-light'>john.doe@example.com</p>
            </div>
            <div className='flex items-center gap-5'>
              <a href='#'>
                <FacebookIcon className='size-4' />
              </a>
              <a href='#'>
                <InstagramIcon className='size-4' />
              </a>
              <a href='#'>
                <LinkedinIcon className='size-4' />
              </a>
              <a href='#'>
                <TwitterIcon className='size-4' />
              </a>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroupedMenuItems data={menuItems} />
          </SidebarContent>
          <SidebarFooter className='px-4 py-3.5'>
            <a href='#' className='self-start'>
              <div className='flex items-center'>
                <img src={LogoSvg} alt="Logo" className='size-8.5' />
                <span className='ml-2.5 hidden text-xl font-semibold sm:block'>Social Media</span>
              </div>
            </a>
          </SidebarFooter>
        </Sidebar>
        <div className='flex flex-1 flex-col'>
          <header className='bg-card sticky top-0 z-50 border-b'>
            <div className='mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6'>
              <div className='flex items-center gap-4'>
                <SidebarTrigger className='[&_svg]:!size-5' />
                <Separator orientation='vertical' className='hidden !h-4 sm:block' />
              </div>
              <div className='flex items-center gap-1.5'>
                <LanguageDropdown
                  trigger={
                    <Button variant='ghost' size='icon'>
                      <LanguagesIcon />
                    </Button>
                  }
                />
              </div>
            </div>
          </header>
          <main className='mx-auto size-full max-w-7xl flex-1 px-4 py-6 sm:px-6'>
            <Card className='h-250'>
              <CardContent className='h-full'>
                <div className='h-full rounded-md border bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_1px,var(--card)_2px,var(--card)_15px)]' />
              </CardContent>
            </Card>
          </main>
          <footer>
            <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 p-4 max-lg:flex-col sm:px-6'>
              <p className='text-muted-foreground text-center text-sm text-balance'>
                {`©${new Date().getFullYear()}`}{' '}
                <a href='#' className='text-primary'>
                  Shadcn/studio
                </a>
                , Made for better web design
              </p>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href='#'>Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href='#'>Audience Insight</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Interests</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </footer>
        </div>
      </SidebarProvider>
    </div>
  )
}

export default ApplicationShell
