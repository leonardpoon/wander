// boundary/TopBar.tsx
// US-11 to US-27: top bar — trip name, day count, tabs, share/export

import { Share2, Download, Calendar } from 'lucide-react'
import { TabType } from './AppShell'

interface TopBarProps {
    tripName:    string
    dateRange:   string
    dayCount:    number
    activeTab:   TabType
    accentColor: string
    onTabChange: (tab: TabType) => void
    onShare:     () => void
    onExport:    () => void
}

export function TopBar({
    tripName,
    dateRange,
    dayCount,
    activeTab,
    accentColor,
    onTabChange,
    onShare,
    onExport,
}: TopBarProps) {
    return (
        <div
            className="flex items-center px-6 shrink-0"
            style={{
                height: 56,
                borderBottom: '1px solid var(--border)',
                background: 'var(--card)',
                gap: 16,
            }}
        >
            {/* Trip name + date */}
            <div className="flex items-center gap-3 min-w-0">
                <h1
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: 16,
                        color: 'var(--foreground)',
                        letterSpacing: '-0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {tripName}
                </h1>

                <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 shrink-0"
                    style={{
                        background: `${accentColor}18`,
                        color: accentColor,
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    <Calendar size={10} />
                    {dayCount} days
                </span>

                <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {dateRange}
                </span>
            </div>

            {/* Tabs */}
            <div
                className="flex items-center rounded-lg p-0.5 ml-4"
                style={{ background: 'var(--muted)' }}
            >
                {([
                    { id: 'planner', label: 'Trip Planner' },
                    { id: 'todo',    label: 'To-Do' },
                ] as { id: TabType; label: string }[]).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className="rounded-md px-3 py-1.5 transition-all"
                        style={{
                            fontSize: 12,
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            background: activeTab === tab.id ? 'var(--card)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onShare}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                    style={{
                        background: 'var(--muted)',
                        color: 'var(--foreground)',
                        fontSize: 12,
                        fontWeight: 500,
                        border: '1px solid var(--border)',
                    }}
                >
                    <Share2 size={13} />
                    Share
                </button>

                <button
                    onClick={onExport}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                    style={{
                        background: accentColor,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    <Download size={13} />
                    Export
                </button>
            </div>
        </div>
    )
}