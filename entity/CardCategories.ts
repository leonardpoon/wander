export interface CardCategoryOption {
    id: string
    label: string
    color: string
    builtIn?: boolean
}

export const BUILT_IN_CATEGORY_OPTIONS: CardCategoryOption[] = [
    { id: 'travel',   label: 'Travel',   color: 'var(--category-travel)',   builtIn: true },
    { id: 'sightsee', label: 'Sightsee', color: 'var(--category-sightsee)', builtIn: true },
    { id: 'shopping', label: 'Shopping', color: 'var(--category-shopping)', builtIn: true },
    { id: 'eating',   label: 'Eating',   color: 'var(--category-eating)',   builtIn: true },
]

const CUSTOM_CATEGORY_COLORS = [
    '#14B8A6',
    '#8B5CF6',
    '#F97316',
    '#06B6D4',
    '#84CC16',
    '#D946EF',
    '#F43F5E',
    '#0EA5E9',
    '#A855F7',
    '#10B981',
]

export function normalizeCategoryLabel(label: string): string {
    return label.trim().replace(/\s+/g, ' ')
}

export function slugifyCategoryLabel(label: string): string {
    const slug = normalizeCategoryLabel(label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return slug || 'custom'
}

export function getUniqueCategoryId(label: string, existingIds: string[]): string {
    const base = slugifyCategoryLabel(label)
    const existing = new Set(existingIds)
    if (!existing.has(base)) return base

    let suffix = 2
    while (existing.has(`${base}-${suffix}`)) suffix += 1
    return `${base}-${suffix}`
}

export function getNextCategoryColor(existingColors: string[]): string {
    const existing = new Set(existingColors.map((color) => color.toLowerCase()))
    const available = CUSTOM_CATEGORY_COLORS.find((color) => !existing.has(color.toLowerCase()))
    if (available) return available

    const hue = (existingColors.length * 47) % 360
    return `hsl(${hue} 72% 46%)`
}

export function getCategoryLabel(categoryId: string, options: CardCategoryOption[]): string {
    return options.find((option) => option.id === categoryId)?.label
        ?? categoryId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getCategoryColor(categoryId: string, options: CardCategoryOption[]): string {
    return options.find((option) => option.id === categoryId)?.color ?? '#64748B'
}
