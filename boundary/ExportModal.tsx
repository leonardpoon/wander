// boundary/ExportModal.tsx
// Export trip as PDF itinerary or CSV data

import { useState } from 'react'
import { X, FileText, Download, Table } from 'lucide-react'
import { Card, CardGroup } from '../entity/Cards'
import { Column } from '../entity/Column'

interface ExportModalProps {
    tripName: string
    cards:    Card[]
    groups:   CardGroup[]
    columns:  Column[]
    onClose:  () => void
}

export function ExportModal({ tripName, cards, groups, columns, onClose }: ExportModalProps) {
    const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)
    const columnsById = new Map(columns.map((column) => [column.id, column]))
    const groupsById = new Map(groups.map((group) => [group.id, group]))

    function getCardDate(card: Card): string {
        return columnsById.get(card.column_id)?.date ?? ''
    }

    function getOrderedCards(): Card[] {
        return cards
            .slice()
            .sort((a, b) => {
                const columnA = columnsById.get(a.column_id)
                const columnB = columnsById.get(b.column_id)
                const columnPositionA = columnA?.position ?? Number.MAX_SAFE_INTEGER
                const columnPositionB = columnB?.position ?? Number.MAX_SAFE_INTEGER

                if (columnPositionA !== columnPositionB) return columnPositionA - columnPositionB

                const groupA = a.group_id ? groupsById.get(a.group_id) : null
                const groupB = b.group_id ? groupsById.get(b.group_id) : null
                const boardPositionA = groupA?.position ?? a.position
                const boardPositionB = groupB?.position ?? b.position

                if (boardPositionA !== boardPositionB) return boardPositionA - boardPositionB
                if ((a.group_id ?? '') !== (b.group_id ?? '')) return (a.group_id ?? '').localeCompare(b.group_id ?? '')
                return a.position - b.position
            })
    }

    // CSV export — client-side, no backend needed
    function exportCSV() {
        setExporting('csv')

        const headers = ['Title', 'Group', 'Category', 'Sub-category', 'Date', 'Time', 'Location', 'Budget', 'Notes']
        const rows = getOrderedCards().map((c) => [
            `"${c.title}"`,
            c.group_id ? `"${groupsById.get(c.group_id)?.title ?? 'Activity group'}"` : '',
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

    function downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }

    function normalizePdfText(value: string): string {
        return value
            .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '-')
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
    }

    function wrapText(value: string, maxChars: number): string[] {
        const words = value.split(/\s+/).filter(Boolean)
        const lines: string[] = []
        let current = ''

        for (const word of words) {
            const next = current ? `${current} ${word}` : word
            if (next.length > maxChars && current) {
                lines.push(current)
                current = word
            } else {
                current = next
            }
        }

        if (current) lines.push(current)
        return lines.length ? lines : ['']
    }

    function buildPdf(lines: string[]): Blob {
        const pageWidth = 595
        const pageHeight = 842
        const marginX = 48
        const startY = 790
        const lineHeight = 16
        const maxLinesPerPage = 46
        const pages: string[][] = []

        for (let i = 0; i < lines.length; i += maxLinesPerPage) {
            pages.push(lines.slice(i, i + maxLinesPerPage))
        }

        if (pages.length === 0) pages.push(['No cards yet.'])

        const objects: string[] = []
        objects.push('<< /Type /Catalog /Pages 2 0 R >>')

        const pageObjectIds = pages.map((_, index) => 3 + index * 2)
        objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)

        pages.forEach((pageLines, index) => {
            const pageObjectId = 3 + index * 2
            const contentObjectId = pageObjectId + 1
            const text = pageLines
                .map((line, lineIndex) => {
                    const y = startY - lineIndex * lineHeight
                    return `BT /F1 10 Tf ${marginX} ${y} Td (${normalizePdfText(line)}) Tj ET`
                })
                .join('\n')
            const content = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`

            objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`)
            objects.push(content)
        })

        objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

        let pdf = '%PDF-1.4\n'
        const offsets = [0]
        objects.forEach((object, index) => {
            offsets.push(pdf.length)
            pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
        })

        const xrefOffset = pdf.length
        pdf += `xref\n0 ${objects.length + 1}\n`
        pdf += '0000000000 65535 f \n'
        offsets.slice(1).forEach((offset) => {
            pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
        })
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

        return new Blob([pdf], { type: 'application/pdf' })
    }

    function getPrintableLines(): string[] {
        const orderedCards = getOrderedCards()

        const lines = [
            tripName,
            `${cards.length} itinerary cards`,
            '',
        ]
        let lastDate = ''
        let lastGroupId: string | null = null

        for (const card of orderedCards) {
            const date = getCardDate(card)
            if (date && date !== lastDate) {
                lines.push('', date)
                lastDate = date
                lastGroupId = null
            }

            if (card.group_id && card.group_id !== lastGroupId) {
                const group = groupsById.get(card.group_id)
                lines.push('', `Group: ${group?.title ?? 'Activity group'}`)
                lastGroupId = card.group_id
            } else if (!card.group_id) {
                lastGroupId = null
            }

            const meta = [
                card.time_value?.slice(0, 5),
                card.category,
                card.sub_category,
            ].filter(Boolean).join(' | ')
            lines.push(...wrapText(`${meta ? `${meta} - ` : ''}${card.title}`, 82))

            if (card.location_name) lines.push(...wrapText(`Location: ${card.location_name}`, 82))
            if (card.budget_amount) {
                const currency = card.budget_currency ? `${card.budget_currency} ` : ''
                lines.push(`Budget: ${currency}${card.budget_amount}`)
            }
            if (card.notes) {
                for (const noteLine of card.notes.split('\n')) {
                    lines.push(...wrapText(`Notes: ${noteLine}`, 82))
                }
            }
            lines.push('')
        }

        return lines
    }

    function exportPDF() {
        setExporting('pdf')
        try {
            const pdf = buildPdf(getPrintableLines())
            downloadBlob(pdf, `${tripName.replace(/\s+/g, '-')}-itinerary.pdf`)
        } finally {
            setExporting(null)
        }
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
                                fontFamily: "'Inter', system-ui, sans-serif",
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
                                    fontFamily: "'Inter', system-ui, sans-serif",
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
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 700,
                                    fontSize:   14,
                                    color:      'var(--foreground)',
                                    marginBottom: 2,
                                }}
                            >
                                PDF Itinerary
                            </h4>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                                Downloads a real PDF file with cards grouped by day and activity group.
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
