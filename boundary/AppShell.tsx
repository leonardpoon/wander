// boundary/AppShell.tsx
// US-11 to US-27: main app shell — sidebar + top bar + content area

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './Topbar'
import { CardCategoryOption } from '../entity/CardCategories'

export type ViewType = 'board' | 'map' | 'analytics' | 'packing' | 'todo'
export type TabType = 'planner' | 'todo'
export type CategoryKey = string
export type CategoryFilters = Record<string, boolean>

interface AppShellProps {
    tripName:     string
    destination:  string
    heroImage:    string | null
    accentColor:  string
    dateRange:    string
    dayCount:     number
    children:     React.ReactNode
    activeView:   ViewType
    activeTab:    TabType
    onViewChange: (view: ViewType) => void
    onTabChange:  (tab: TabType) => void
    onShare:      () => void
    onExport:     () => void
    categoryOptions: CardCategoryOption[]
    categoryFilters: CategoryFilters
    onToggleCategory: (cat: CategoryKey) => void
    onAddCategory: (label: string) => void
    tripCode?:     string | null
    tripPin?:      string | null
}

export function AppShell({
    tripName,
    destination,
    heroImage,
    accentColor,
    dateRange,
    dayCount,
    children,
    activeView,
    activeTab,
    onViewChange,
    onTabChange,
    onShare,
    onExport,
    categoryOptions,
    categoryFilters,
    onToggleCategory,
    onAddCategory,
    tripCode,
    tripPin,
}: AppShellProps) {
    const [darkMode, setDarkMode] = useState(false)

    function toggleDarkMode() {
        setDarkMode((prev) => {
            document.documentElement.classList.toggle('dark', !prev)
            return !prev
        })
    }

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ background: 'var(--background)', color: 'var(--foreground)' }}
        >
            <Sidebar
                tripName={tripName}
                destination={destination}
                heroImage={heroImage}
                accentColor={accentColor}
                activeView={activeView}
                categoryFilters={categoryFilters}
                categoryOptions={categoryOptions}
                darkMode={darkMode}
                onViewChange={onViewChange}
                onToggleCategory={onToggleCategory}
                onAddCategory={onAddCategory}
                onToggleDarkMode={toggleDarkMode}
            />

            <div className="flex flex-col flex-1 min-w-0">
                <TopBar
                    tripName={tripName}
                    dateRange={dateRange}
                    dayCount={dayCount}
                    activeTab={activeTab}
                    accentColor={accentColor}
                    onTabChange={onTabChange}
                    onShare={onShare}
                    onExport={onExport}
                    tripCode={tripCode}
                    tripPin={tripPin}
                />
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
