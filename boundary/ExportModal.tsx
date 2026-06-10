// boundary/ExportModal.tsx
// Export trip as PDF itinerary or CSV data

import { useState } from 'react'
import { X, FileText, Download, Table } from 'lucide-react'
import { Card } from '../entity/Cards'
import { Column } from '../entity/Column'

interface ExportModalProps {
    tripName: string
    cards:    Card[]
    columns:  Column[]
    onClose:  () => void
}

export function ExportModal({ tripName, cards, columns, onClose }: ExportModalProps) {
    const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)
    const columnsById = new Map(columns.map((column) => [column.id, column]))

    function getCardDate(card: Card): string {
        return columnsById.get(card.column_id)?.date ?? ''
    }

    // CSV export — client-side, no backend needed
    function exportCSV() {
        setExporting('csv')

        const headers = ['Title', 'Category', 'Sub-category', 'Date', 'Time', 'Location', 'Budget', 'Notes']
        const rows = cards.map((c) => [
            `"${c.title}"`,
            c.category,
            c.sub_category ?? '',
            getCardDate(c),
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

    function escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }

    function exportPDF() {
        setExporting('pdf')

        const printableCards = cards
            .slice()
            .sort((a, b) => {
                const columnA = columnsById.get(a.column_id)
                const columnB = columnsById.get(b.column_id)
                const columnPositionA = columnA?.position ?? Number.MAX_SAFE_INTEGER
                const columnPositionB = columnB?.position ?? Number.MAX_SAFE_INTEGER

                if (columnPositionA !== columnPositionB) return columnPositionA - columnPositionB
                return a.position - b.position
            })
            .map((card) => `
                <article class="card">
                    <div class="meta">
                        ${getCardDate(card) ? `<span>${escapeHtml(getCardDate(card))}</span>` : ''}
                        <span>${escapeHtml(card.category)}</span>
                        ${card.sub_category ? `<span>${escapeHtml(card.sub_category)}</span>` : ''}
                        ${card.time_value ? `<span>${escapeHtml(card.time_value.slice(0, 5))}</span>` : ''}
                    </div>
                    <h2>${escapeHtml(card.title)}</h2>
                    ${card.location_name ? `<p class="line">Location: ${escapeHtml(card.location_name)}</p>` : ''}
                    ${card.budget_amount ? `<p class="line">Budget: ${escapeHtml(String(card.budget_amount))}</p>` : ''}
                    ${card.notes ? `<p class="notes">${escapeHtml(card.notes)}</p>` : ''}
                </article>
            `)
            .join('')

        const printWindow = window.open('', '_blank', 'noopener,noreferrer')
        if (!printWindow) {
            setExporting(null)
            return
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>${escapeHtml(tripName)} itinerary</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 32px;
                            color: #0f172a;
                            font-family: Arial, sans-serif;
                            background: #ffffff;
                        }
                        header {
                            border-bottom: 2px solid #e2e8f0;
                            margin-bottom: 24px;
                            padding-bottom: 16px;
                        }
                        h1 { margin: 0 0 6px; font-size: 28px; }
                        .subtitle { color: #64748b; font-size: 13px; }
                        .card {
                            break-inside: avoid;
                            border: 1px solid #e2e8f0;
                            border-radius: 10px;
                            margin-bottom: 14px;
                            padding: 16px;
                        }
                        .meta {
                            display: flex;
                            gap: 8px;
                            flex-wrap: wrap;
                            margin-bottom: 8px;
                            color: #475569;
                            font-size: 11px;
                            font-weight: 700;
                            text-transform: uppercase;
                        }
                        .meta span {
                            background: #f1f5f9;
                            border-radius: 999px;
                            padding: 4px 8px;
                        }
                        h2 { margin: 0 0 8px; font-size: 18px; }
                        .line, .notes {
                            margin: 4px 0;
                            font-size: 13px;
                            line-height: 1.5;
                        }
                        .notes {
                            color: #334155;
                            white-space: pre-wrap;
                        }
                        @media print {
                            body { padding: 20mm; }
                        }
                    </style>
                </head>
                <body>
                    <header>
                        <h1>${escapeHtml(tripName)}</h1>
                        <div class="subtitle">${cards.length} itinerary cards</div>
                    </header>
                    ${printableCards || '<p>No cards yet.</p>'}
                    <script>
                        window.onload = () => {
                            window.print();
                            window.setTimeout(() => window.close(), 500);
                        };
                    </script>
                </body>
            </html>
        `)
        printWindow.document.close()

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

                    {/* PDF export */}
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
                                PDF Itinerary
                            </h4>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                                Printable itinerary with your planned cards.
                            </p>
                            <button
                                onClick={exportPDF}
                                disabled={exporting === 'pdf'}
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
                                {exporting === 'pdf' ? 'Preparing...' : 'Download .PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
