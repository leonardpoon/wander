// boundary/ShareModal.tsx
// US-28 to US-31: share trip via room code + PIN

import { useState } from 'react'
import { X, Copy, Check, Users } from 'lucide-react'

interface ShareModalProps {
    tripCode: string    // WND-XXXXXX
    tripPin:  string    // 4-digit PIN or "****"
    onClose:  () => void
}

export function ShareModal({ tripCode, tripPin, onClose }: ShareModalProps) {
    const [copied, setCopied] = useState(false)

    const shareText = `Join my trip on Wander!\nCode: ${tripCode}\nPIN: ${tripPin}`

    async function handleCopy() {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="rounded-2xl p-6"
                style={{
                    width:      480,
                    background: 'var(--card)',
                    border:     '1px solid var(--border)',
                    boxShadow:  '0 20px 60px rgba(0,0,0,0.2)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Users size={18} style={{ color: 'var(--accent)' }} />
                        <h2
                            style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize:   16,
                                color:      'var(--foreground)',
                            }}
                        >
                            Share Trip
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Room code + PIN */}
                <div
                    className="rounded-xl p-5 mb-4 text-center"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                    <p style={{
                        fontSize:        11,
                        color:           'var(--muted-foreground)',
                        marginBottom:    8,
                        fontWeight:      600,
                        textTransform:   'uppercase',
                        letterSpacing:   '0.06em',
                    }}>
                        Room Code
                    </p>
                    <p
                        style={{
                            fontFamily:    "'JetBrains Mono', monospace",
                            fontWeight:    800,
                            fontSize:      28,
                            color:         'var(--foreground)',
                            letterSpacing: '0.08em',
                            marginBottom:  12,
                        }}
                    >
                        {tripCode}
                    </p>

                    <div
                        className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 mx-auto"
                        style={{
                            background: 'var(--card)',
                            border:     '1px solid var(--border)',
                            display:    'inline-flex',
                        }}
                    >
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>PIN:</span>
                        <span
                            style={{
                                fontFamily:    "'JetBrains Mono', monospace",
                                fontWeight:    700,
                                fontSize:      16,
                                color:         'var(--foreground)',
                                letterSpacing: '0.12em',
                            }}
                        >
                            {tripPin}
                        </span>
                    </div>
                </div>

                {/* Instructions */}
                <p
                    className="text-center mb-5"
                    style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}
                >
                    Share the room code and PIN with your travel companions.
                    They enter both on the join screen — no account needed.
                </p>

                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
                    style={{
                        background: copied ? 'var(--success)' : 'var(--accent)',
                        color:      'white',
                        fontSize:   13,
                        fontWeight: 700,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copied!' : 'Copy Code & PIN'}
                </button>
            </div>
        </div>
    )
}