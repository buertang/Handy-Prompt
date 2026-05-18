import { storage } from '#imports'

export type SortDirection = 'asc' | 'desc'
export type PromptSortField = 'title' | 'createTime' | 'lastModified' | 'category' | 'usage'
export type NamedSortField = 'name' | 'promptCount' | 'createTime' | 'lastModified'

export interface SortPreference<TField extends string> {
  field: TField
  direction: SortDirection
}

export interface SortingSettings {
  prompts: SortPreference<PromptSortField>
  categories: SortPreference<NamedSortField>
  tags: SortPreference<NamedSortField>
}

export const DEFAULT_SORTING_SETTINGS: SortingSettings = {
  prompts: { field: 'createTime', direction: 'desc' },
  categories: { field: 'createTime', direction: 'desc' },
  tags: { field: 'createTime', direction: 'desc' },
}

export const sortingSettings = storage.defineItem<SortingSettings>('sync:sortingSettings', {
  fallback: DEFAULT_SORTING_SETTINGS,
})

type PromptLike = {
  id?: string
  title: string
  categoryId: string
  createTime?: string
  lastModified?: string
  usageCount?: number
  isPinned?: boolean
}

type NamedItemLike = {
  id?: string
  name: string
  createTime?: string
  lastModified?: string
  promptCount?: number
  isPinned?: boolean
  isDefault?: boolean
}

const compareText = (a: string, b: string) => a.localeCompare(b, 'zh-CN')

const applyDirection = (result: number, direction: SortDirection) => (
  direction === 'asc' ? result : -result
)

const normalizeDirection = (direction?: SortDirection): SortDirection => (
  direction === 'asc' || direction === 'desc' ? direction : 'desc'
)

const normalizePromptField = (field?: PromptSortField): PromptSortField => {
  const fields: PromptSortField[] = ['title', 'createTime', 'lastModified', 'category', 'usage']
  return field && fields.includes(field) ? field : DEFAULT_SORTING_SETTINGS.prompts.field
}

const normalizeNamedField = (field?: NamedSortField): NamedSortField => {
  const fields: NamedSortField[] = ['name', 'promptCount', 'createTime', 'lastModified']
  return field && fields.includes(field) ? field : DEFAULT_SORTING_SETTINGS.categories.field
}

export const normalizeSortingSettings = (settings?: Partial<SortingSettings> | null): SortingSettings => ({
  prompts: {
    field: normalizePromptField(settings?.prompts?.field),
    direction: normalizeDirection(settings?.prompts?.direction),
  },
  categories: {
    field: normalizeNamedField(settings?.categories?.field),
    direction: normalizeDirection(settings?.categories?.direction),
  },
  tags: {
    field: normalizeNamedField(settings?.tags?.field),
    direction: normalizeDirection(settings?.tags?.direction),
  },
})

const comparePinned = (aPinned?: boolean, bPinned?: boolean) => {
  if (aPinned === bPinned) return 0
  return (bPinned ? 1 : 0) - (aPinned ? 1 : 0)
}

const comparePrompts = <T extends PromptLike>(
  a: T,
  b: T,
  preference: SortPreference<PromptSortField>,
  getCategoryName?: (categoryId: string) => string
) => {
  const pinned = comparePinned(a.isPinned, b.isPinned)
  if (pinned !== 0) return pinned

  let result = 0
  switch (preference.field) {
    case 'title':
      result = compareText(a.title, b.title)
      break
    case 'createTime':
      result = compareText(a.createTime || '', b.createTime || '')
      break
    case 'lastModified':
      result = compareText(a.lastModified || '', b.lastModified || '')
      break
    case 'category':
      result = compareText(getCategoryName?.(a.categoryId) || '', getCategoryName?.(b.categoryId) || '')
      break
    case 'usage':
      result = (a.usageCount || 0) - (b.usageCount || 0)
      break
  }

  const directed = applyDirection(result, preference.direction)
  return directed !== 0 ? directed : compareText(a.title, b.title)
}

const compareNamedItems = <T extends NamedItemLike>(
  a: T,
  b: T,
  preference: SortPreference<NamedSortField>
) => {
  if (a.isDefault && !b.isDefault) return -1
  if (!a.isDefault && b.isDefault) return 1

  const pinned = comparePinned(a.isPinned, b.isPinned)
  if (pinned !== 0) return pinned

  let result = 0
  switch (preference.field) {
    case 'name':
      result = compareText(a.name, b.name)
      break
    case 'promptCount':
      result = (a.promptCount || 0) - (b.promptCount || 0)
      break
    case 'createTime':
      result = compareText(a.createTime || '', b.createTime || '')
      break
    case 'lastModified':
      result = compareText(a.lastModified || '', b.lastModified || '')
      break
  }

  const directed = applyDirection(result, preference.direction)
  return directed !== 0 ? directed : compareText(a.name, b.name)
}

export const sortPrompts = <T extends PromptLike>(
  prompts: T[],
  preference: SortPreference<PromptSortField>,
  getCategoryName?: (categoryId: string) => string
) => [...prompts].sort((a, b) => comparePrompts(a, b, preference, getCategoryName))

export const sortNamedItems = <T extends NamedItemLike>(
  items: T[],
  preference: SortPreference<NamedSortField>
) => [...items].sort((a, b) => compareNamedItems(a, b, preference))
