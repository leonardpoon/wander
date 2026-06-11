// boundary/TopBar.tsx
// US-11 to US-27: top bar — trip name, day count, tabs, share/export

import { useState } from 'react'
import { useRouter } from 'next/router'
import { Download, Calendar, Copy, Check } from 'lucide-react'
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
    const router = useRouter()
    const [copied, setCopied] = useState(false)
    const [pinRevealed, setPinRevealed] = useState(false)
    const canShowInvite = Boolean(tripCode)

    async function handleCopyInvite() {
        if (!tripCode) return

        const inviteText = tripPin
            ? `Join my trip on Wander!\nCode: ${tripCode}\nPIN: ${tripPin}`
            : `Join my trip on Wander!\nCode: ${tripCode}`

        await navigator.clipboard.writeText(inviteText)
        setCopied(true)
        setPinRevealed(true)
        setTimeout(() => setCopied(false), 1600)
    }

    async function handleCopyPin() {
        if (!tripPin) {
            onShare()
            return
        }

        await navigator.clipboard.writeText(tripPin)
        setCopied(true)
        setPinRevealed(true)
        setTimeout(() => setCopied(false), 1600)
    }

    function handleShareClick() {
        if (tripCode) {
            handleCopyPin()
            return
        }

        onShare()
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
                <button
                    onClick={() => router.push('/')}
                    aria-label="Go to Wander home"
                    className="rounded-lg px-2 py-1 transition-colors"
                    style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 800,
                        fontSize: 16,
                        color: 'var(--foreground)',
                        letterSpacing: '0',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    Wander
                </button>

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
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)',
                        fontSize: 12,
                        fontWeight: 800,
                    }}
                >
                    <span style={{ color: 'var(--muted-foreground)', fontWeight: 700 }}>Join</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                        {tripCode}
                    </span>
                    <span style={{ color: 'var(--muted-foreground)', fontWeight: 700 }}>/</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
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
                    onClick={handleShareClick}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                    style={{
                        background: copied ? 'var(--success)' : 'var(--muted)',
                        color: copied ? '#fff' : 'var(--foreground)',
                        fontSize: 12,
                        fontWeight: 700,
                        border: copied ? '1px solid var(--success)' : '1px solid var(--border)',
                    }}
                >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span className="wander-action-label">
                        {tripCode
                            ? pinRevealed && tripPin
                                ? `PIN ${tripPin}`
                                : 'Copy PIN'
                            : 'Share'}
                    </span>
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
