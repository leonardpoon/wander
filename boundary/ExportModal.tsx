// boundary/ExportModal.tsx
// Export trip as PDF itinerary or CSV/JSON data

import { useState } from 'react'
import { X, FileText, Download, Table } from 'lucide-react'
import { Card } from '../entity/Cards'

interface ExportModalProps {
    tripName: string
    cards:    Card[]
    onClose:  () => void
}

export function ExportModal({ tripName, cards, onClose }: ExportModalProps) {
    const [exporting, setExporting] = useState<'pdf' | 'csv' | 'json' | null>(null)

    // CSV export — client-side, no backend needed
    function exportCSV() {
        setExporting('csv')

        const headers = ['Title', 'Category', 'Sub-category', 'Date', 'Time', 'Location', 'Budget', 'Notes']
        const rows = cards.map((c) => [
            `"${c.title}"`,
            c.category,
            c.sub_category ?? '',
            '',                                      // date comes from column — not on card
            c.time_value?.slice(0, 5) ?? '',
            c.location_name ?? '',
            c.budget_amount ?? '',
            `"${(c.notes ?? '').replace(/"/g, "'")}"`,
        ])

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `${tripName.replace(/\s+/g, '-')}-itinerary.csv`
        a.click()
        URL.revokeObjectURL(url)

        setExporting(null)
    }

    // JSON export — raw card data
    function exportJSON() {
        setExporting('json')

        const json = JSON.stringify(cards, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `${tripName.replace(/\s+/g, '-')}-data.json`
        a.click()
        URL.revokeObjectURL(url)

        setExporting(null)
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
                        <Download size={18} style={{ color: 'var(--accent)' }} />
                        <h2
                            style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize:   16,
                                color:      'var(--foreground)',
                            }}
                        >
                            Export Trip
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

                <div className="flex flex-col" style={{ gap: 12 }}>
                    {/* CSV export */}
                    <div
                        className="flex items-center gap-4 rounded-xl p-4"
                        style={{
                            background: 'var(--muted)',
                            border:     '1px solid var(--border)',
                        }}
                    >
                        <div
                            className="flex items-center justify-center rounded-xl shrink-0"
                            style={{
                                width:      44,
                                height:     44,
                                background: '#22C55E18',
                                color:      '#22C55E',
                            }}
                        >
                            <Table size={20} />
                        </div>
                        <div className="flex-1">
                            <h4
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 700,
                                    fontSize:   14,
                                    color:      'var(--foreground)',
                                    marginBottom: 2,
                                }}
                            >
                                CSV Spreadsheet
                            </h4>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                                All cards as rows — open in Excel, Google Sheets, or Numbers.
                            </p>
                            <button
                                onClick={exportCSV}
                                disabled={exporting === 'csv'}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors"
                                style={{
                                    background: 'var(--card)',
                                    color:      'var(--foreground)',
                                    fontSize:   12,
                                    fontWeight: 500,
                                    border:     '1px solid var(--border)',
                                }}
                            >
                                <Download size={12} />
                                {exporting === 'csv' ? 'Exporting…' : 'Download .CSV'}
                            </button>
                        </div>
                    </div>

                    {/* JSON export */}
                    <div
                        className="flex items-center gap-4 rounded-xl p-4"
                        style={{
                            background: 'var(--muted)',
                            border:     '1px solid var(--border)',
                        }}
                    >
                        <div
                            className="flex items-center justify-center rounded-xl shrink-0"
                            style={{
                                width:      44,
                                height:     44,
                                background: '#3B82F618',
                                color:      '#3B82F6',
                            }}
                        >
                            <FileText size={20} />
                        </div>
                        <div className="flex-1">
                            <h4
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 700,
                                    fontSize:   14,
                                    color:      'var(--foreground)',
                                    marginBottom: 2,
                                }}
                            >
                                JSON Data
                            </h4>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                                Raw trip data for developers or external integrations.
                            </p>
                            <button
                                onClick={exportJSON}
                                disabled={exporting === 'json'}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors"
                                style={{
                                    background: 'var(--card)',
                                    color:      'var(--foreground)',
                                    fontSize:   12,
                                    fontWeight: 500,
                                    border:     '1px solid var(--border)',
                                }}
                            >
                                <Download size={12} />
                                {exporting === 'json' ? 'Exporting…' : 'Download .JSON'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}