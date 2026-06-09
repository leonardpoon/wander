// boundary/Sidebar.tsx
// US-11 to US-27: left sidebar — trip info, view switchers, category filters

import {
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
} from 'lucide-react'
import { ViewType, CategoryKey, CategoryFilters } from './AppShell'

interface SidebarProps {
    tripName:         string
    destination:      string
    heroImage:        string | null
    accentColor:      string
    activeView:       ViewType
    categoryFilters:  CategoryFilters
    darkMode:         boolean
    onViewChange:     (view: ViewType) => void
    onToggleCategory: (cat: CategoryKey) => void
    onToggleDarkMode: () => void
}

const VIEW_ITEMS: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'board',     label: 'Board',        icon: <LayoutGrid size={16} /> },
    { id: 'map',       label: 'Map',          icon: <Map size={16} /> },
    { id: 'analytics', label: 'Analytics',    icon: <BarChart2 size={16} /> },
    { id: 'packing',   label: 'Packing List', icon: <CheckSquare size={16} /> },
]

const CATEGORY_ITEMS: { id: CategoryKey; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'travel',   label: 'Travel',   icon: <Plane size={14} />,           color: 'var(--category-travel)' },
    { id: 'sightsee', label: 'Sightsee', icon: <Eye size={14} />,             color: 'var(--category-sightsee)' },
    { id: 'shopping', label: 'Shopping', icon: <ShoppingBag size={14} />,     color: 'var(--category-shopping)' },
    { id: 'eating',   label: 'Eating',   icon: <UtensilsCrossed size={14} />, color: 'var(--category-eating)' },
]

export function Sidebar({
    tripName,
    destination,
    heroImage,
    accentColor,
    activeView,
    categoryFilters,
    darkMode,
    onViewChange,
    onToggleCategory,
    onToggleDarkMode,
}: SidebarProps) {
    return (
        <div
            className="flex flex-col h-full shrink-0"
            style={{
                width: 240,
                background: 'var(--sidebar)',
                borderRight: '1px solid var(--sidebar-border)',
            }}
        >
            {/* Accent strip */}
            <div style={{ height: 4, background: accentColor }} />

            {/* Trip hero + name */}
            <div className="p-4">
                {heroImage && (
                    <div
                        className="w-full rounded-xl overflow-hidden mb-3"
                        style={{ height: 100 }}
                    >
                        <img
                            src={heroImage}
                            alt={destination}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <h2
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                {CATEGORY_ITEMS.map((cat) => (
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
                            {cat.icon}
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