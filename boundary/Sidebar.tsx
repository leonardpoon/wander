// boundary/Sidebar.tsx
// US-11 to US-27: left sidebar — trip info, view switchers, category filters

import {
    Plus,
    LayoutGrid,
    Map,
    BarChart2,
    CheckSquare,
    Sun,
    Moon,
    Plane,
    Eye,
    ShoppingBag,
    UtensilsCrossed,
    Tag,
} from 'lucide-react'
import { useState } from 'react'
import { ViewType, CategoryKey, CategoryFilters } from './AppShell'
import { CardCategoryOption } from '../entity/CardCategories'

interface SidebarProps {
    tripName:         string
    destination:      string
    heroImage:        string | null
    accentColor:      string
    activeView:       ViewType
    categoryFilters:  CategoryFilters
    categoryOptions:  CardCategoryOption[]
    darkMode:         boolean
    onViewChange:     (view: ViewType) => void
    onToggleCategory: (cat: CategoryKey) => void
    onAddCategory:    (label: string) => void
    onToggleDarkMode: () => void
}

const VIEW_ITEMS: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'board',     label: 'Board',        icon: <LayoutGrid size={16} /> },
    { id: 'map',       label: 'Map',          icon: <Map size={16} /> },
    { id: 'analytics', label: 'Analytics',    icon: <BarChart2 size={16} /> },
    { id: 'packing',   label: 'Packing List', icon: <CheckSquare size={16} /> },
]

const FALLBACK_HERO_IMAGE =
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'

function getCategoryIcon(categoryId: string): React.ReactNode {
    if (categoryId === 'travel') return <Plane size={14} />
    if (categoryId === 'sightsee') return <Eye size={14} />
    if (categoryId === 'shopping') return <ShoppingBag size={14} />
    if (categoryId === 'eating') return <UtensilsCrossed size={14} />
    return <Tag size={14} />
}

export function Sidebar({
    tripName,
    destination,
    heroImage,
    accentColor,
    activeView,
    categoryFilters,
    categoryOptions,
    darkMode,
    onViewChange,
    onToggleCategory,
    onAddCategory,
    onToggleDarkMode,
}: SidebarProps) {
    const [newFilterName, setNewFilterName] = useState('')

    function handleAddFilter() {
        const label = newFilterName.trim()
        if (!label) return
        onAddCategory(label)
        setNewFilterName('')
    }

    return (
        <div
            className="wander-sidebar flex flex-col h-full shrink-0"
            style={{
                background: 'var(--sidebar)',
                borderRight: '1px solid var(--sidebar-border)',
            }}
        >
            {/* Accent strip */}
            <div style={{ height: 4, background: accentColor }} />

            {/* Trip hero + name */}
            <div className="p-4">
                <div
                    className="w-full rounded-xl overflow-hidden mb-3"
                    style={{ height: 100 }}
                >
                    <img
                        src={heroImage ?? FALLBACK_HERO_IMAGE}
                        alt={destination}
                        className="w-full h-full object-cover"
                    />
                </div>
                <h2
                    style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: 'var(--sidebar-foreground)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {tripName}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {destination}
                </p>
            </div>

            <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '0 16px' }} />

            {/* View switchers */}
            <div className="p-3">
                <p style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '8px 8px 4px',
                }}>
                    Views
                </p>
                {VIEW_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors text-left"
                        style={{
                            background: activeView === item.id ? 'var(--sidebar-accent)' : 'transparent',
                            color: activeView === item.id ? 'var(--sidebar-accent-foreground)' : 'var(--muted-foreground)',
                            fontSize: 13,
                            fontWeight: activeView === item.id ? 600 : 400,
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </div>

            <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '0 16px' }} />

            {/* Category filters */}
            <div className="p-3">
                <p style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '8px 8px 4px',
                }}>
                    Filter
                </p>
                {categoryOptions.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onToggleCategory(cat.id)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all text-left"
                        style={{
                            opacity: categoryFilters[cat.id] ? 1 : 0.4,
                            color: 'var(--sidebar-foreground)',
                            fontSize: 13,
                        }}
                    >
                        <span
                            className="rounded-full flex items-center justify-center shrink-0"
                            style={{
                                width: 22,
                                height: 22,
                                background: `${cat.color}25`,
                                color: cat.color,
                            }}
                        >
                            {getCategoryIcon(cat.id)}
                        </span>
                        {cat.label}
                        {categoryFilters[cat.id] && (
                            <span
                                className="ml-auto rounded-full"
                                style={{ width: 6, height: 6, background: cat.color }}
                            />
                        )}
                    </button>
                ))}

                <div className="mt-2 px-1">
                    <div
                        className="flex items-center gap-1 rounded-lg p-1"
                        style={{ background: 'var(--sidebar-accent)' }}
                    >
                        <input
                            value={newFilterName}
                            onChange={(e) => setNewFilterName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddFilter()
                            }}
                            placeholder="New filter"
                            className="min-w-0 flex-1 rounded-md px-2 py-1.5 outline-none"
                            style={{
                                background: 'transparent',
                                color: 'var(--sidebar-foreground)',
                                fontSize: 12,
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleAddFilter}
                            className="flex items-center justify-center rounded-md"
                            style={{
                                width: 28,
                                height: 28,
                                color: 'var(--sidebar-foreground)',
                                background: 'rgba(255,255,255,0.08)',
                            }}
                            title="Add filter"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1" />

            {/* Dark mode toggle */}
            <div className="p-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
                <button
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                    style={{ color: 'var(--muted-foreground)', fontSize: 13 }}
                >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                    {darkMode ? 'Light mode' : 'Dark mode'}
                </button>
            </div>
        </div>
    )
}
