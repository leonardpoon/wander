// boundary/TopBar.tsx
// US-11 to US-27: top bar — trip name, day count, tabs, share/export

import { useState } from 'react'
import { Share2, Download, Calendar, Copy, Check } from 'lucide-react'
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
    tripCode?:   string | null
    tripPin?:    string | null
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
    tripCode,
    tripPin,
}: TopBarProps) {
    const [copied, setCopied] = useState(false)
    const canShowInvite = Boolean(tripCode)

    async function handleCopyInvite() {
        if (!tripCode) return

        const inviteText = tripPin
            ? `Join my trip on Wander!\nCode: ${tripCode}\nPIN: ${tripPin}`
            : `Join my trip on Wander!\nCode: ${tripCode}`

        await navigator.clipboard.writeText(inviteText)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
    }

    return (
        <div
            className="wander-topbar flex items-center px-6 shrink-0"
            style={{
                minHeight: 56,
                borderBottom: '1px solid var(--border)',
                background: 'var(--card)',
                gap: 16,
                position: 'relative',
            }}
        >
            {/* Trip name + date */}
            <div className="wander-topbar-trip flex items-center gap-3 min-w-0">
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
                    className="wander-day-count flex items-center gap-1 rounded-full px-2.5 py-0.5 shrink-0"
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

                <span className="wander-date-range" style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {dateRange}
                </span>
            </div>

            {/* Tabs */}
            {canShowInvite && (
                <button
                    onClick={handleCopyInvite}
                    className="wander-invite-button flex items-center justify-center gap-2 rounded-xl px-4 py-1.5 transition-colors"
                    style={{
                        background: 'var(--foreground)',
                        color: 'var(--background)',
                        border: '1px solid var(--foreground)',
                        fontSize: 12,
                        fontWeight: 800,
                    }}
                >
                    <span style={{ color: 'inherit', opacity: 0.72 }}>Join</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {tripCode}
                    </span>
                    <span style={{ color: 'inherit', opacity: 0.52 }}>/</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
                        {tripPin ?? 'PIN'}
                    </span>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
            )}

            {!canShowInvite && <div className="wander-invite-spacer" />}

            {/* Actions */}
            <div className="wander-topbar-actions flex items-center justify-end gap-2 min-w-0">
                <div
                    className="flex items-center rounded-lg p-0.5"
                    style={{ background: 'var(--muted)' }}
                >
                    {([
                        { id: 'planner', label: 'Planner' },
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
                    <span className="wander-action-label">Share</span>
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
                    <span className="wander-action-label">Export</span>
                </button>
            </div>
        </div>
    )
}
