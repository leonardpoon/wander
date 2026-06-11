// boundary/AnalyticsDashboard.tsx
// US-23 to US-27: budget analytics + FX conversion
// recharts for bar charts — already in your stack

import { useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts'
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react'
import { useCards } from '../controller/useCards'
import { fxService, BudgetSummary } from '../controller/fxService'
import {
    BUILT_IN_CATEGORY_OPTIONS,
    getCategoryColor,
    getCategoryLabel,
    getNextCategoryColor,
} from '../entity/CardCategories'

interface AnalyticsDashboardProps {
    tripId:       string
    tripCurrency: string
    homeCurrency: string
    dayCount:     number
}

export function AnalyticsDashboard({
    tripId,
    tripCurrency,
    homeCurrency,
    dayCount,
}: AnalyticsDashboardProps) {
    const { cards, isLoading } = useCards(tripId)

    const [summary,        setSummary]        = useState<BudgetSummary | null>(null)
    const [loadingSummary, setLoadingSummary] = useState(false)

    useEffect(() => {
        if (cards.length === 0) return

        async function loadSummary() {
            setLoadingSummary(true)
            const result = await fxService.getBudgetSummary(
                cards,
                tripCurrency,
                homeCurrency
            )
            setSummary(result)
            setLoadingSummary(false)
        }

        loadSummary()
    }, [cards, tripCurrency, homeCurrency])

    // category breakdown data for bar chart
    const chartCategoryOptions = [...BUILT_IN_CATEGORY_OPTIONS]
    const ensureCategoryOption = (key: string) => {
        if (!chartCategoryOptions.some((option) => option.id === key)) {
            chartCategoryOptions.push({
                id: key,
                label: getCategoryLabel(key, chartCategoryOptions),
                color: getNextCategoryColor(chartCategoryOptions.map((option) => option.color)),
            })
        }
    }

    cards.forEach((card) => ensureCategoryOption(card.category))

    const categoryData = summary ? Object.entries(summary.byCategory).map(([key, amount]) => {
        ensureCategoryOption(key)
        return {
            name: getCategoryLabel(key, chartCategoryOptions),
            amount,
            key,
        }
    }) : []

    const activityMixData = cards.reduce((acc, card) => {
        const existing = acc.find((d) => d.key === card.category)
        if (existing) {
            existing.count += 1
        } else {
            acc.push({
                key: card.category,
                name: getCategoryLabel(card.category, chartCategoryOptions),
                count: 1,
            })
        }
        return acc
    }, [] as { key: string; name: string; count: number }[])

    if (isLoading || loadingSummary) {
        return (
            <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                    Loading analytics…
                </p>
            </div>
        )
    }

    return (
        <div
            className="h-full overflow-y-auto"
            style={{ padding: 24 }}
        >
            <h2
                style={{
                    fontFamily:    "'Inter', system-ui, sans-serif",
                    fontWeight:    700,
                    fontSize:      20,
                    color:         'var(--foreground)',
                    letterSpacing: '-0.02em',
                    marginBottom:  20,
                }}
            >
                Trip Analytics
            </h2>

            {/* Overview cards */}
            <div
                className="grid gap-4 mb-8"
                style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
                <StatCard
                    icon={<Calendar size={16} />}
                    label="Total Days"
                    value={`${dayCount}`}
                    accent="var(--accent)"
                />
                <StatCard
                    icon={<Activity size={16} />}
                    label="Activities"
                    value={`${cards.length}`}
                    accent="var(--category-sightsee)"
                />
                <StatCard
                    icon={<DollarSign size={16} />}
                    label={`Budget (${tripCurrency})`}
                    value={summary
                        ? summary.totalBudget.toLocaleString()
                        : '—'
                    }
                    accent="var(--category-travel)"
                />
                <StatCard
                    icon={<TrendingUp size={16} />}
                    label={`Budget (${homeCurrency})`}
                    value={summary
                        ? summary.totalConverted.toLocaleString()
                        : '—'
                    }
                    accent="var(--category-eating)"
                    sub={tripCurrency !== homeCurrency ? `@ ${tripCurrency}/${homeCurrency}` : undefined}
                />
            </div>

            {/* Budget and activity charts */}
            {summary && summary.totalBudget > 0 && (
                <div
                    className="grid gap-6 mb-6"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
                >
                    <div
                        className="rounded-2xl p-6"
                        style={{
                            background: 'var(--card)',
                            border:     '1px solid var(--border)',
                        }}
                    >
                        <h3
                            style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontWeight: 700,
                                fontSize:   14,
                                color:      'var(--foreground)',
                                marginBottom: 16,
                            }}
                        >
                            Budget by Category
                        </h3>

                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={categoryData} barSize={40}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background:   'var(--card)',
                                        border:       '1px solid var(--border)',
                                        borderRadius: 8,
                                        fontSize:     12,
                                    }}
                                    formatter={(value) => [
                                        `${tripCurrency} ${Number(value ?? 0).toLocaleString()}`,
                                        'Budget',
                                    ]}
                                />
                                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                    {categoryData.map((entry) => (
                                        <Cell
                                            key={entry.key}
                                            fill={getCategoryColor(entry.key, chartCategoryOptions)}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div
                        className="rounded-2xl p-6"
                        style={{
                            background: 'var(--card)',
                            border:     '1px solid var(--border)',
                        }}
                    >
                        <h3
                            style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontWeight: 700,
                                fontSize:   14,
                                color:      'var(--foreground)',
                                marginBottom: 16,
                            }}
                        >
                            Activity Mix
                        </h3>

                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={activityMixData}
                                    dataKey="count"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={48}
                                    outerRadius={78}
                                    paddingAngle={2}
                                >
                                    {activityMixData.map((entry) => (
                                        <Cell
                                            key={entry.key}
                                            fill={getCategoryColor(entry.key, chartCategoryOptions)}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background:   'var(--card)',
                                        border:       '1px solid var(--border)',
                                        borderRadius: 8,
                                        fontSize:     12,
                                    }}
                                    formatter={(value) => [
                                        `${Number(value ?? 0).toLocaleString()} cards`,
                                        'Activities',
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="grid gap-2 mt-2">
                            {activityMixData.map((entry) => (
                                <div
                                    key={entry.key}
                                    className="flex items-center justify-between gap-3"
                                    style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            style={{
                                                width:        9,
                                                height:       9,
                                                borderRadius: 999,
                                                background:   getCategoryColor(entry.key, chartCategoryOptions),
                                                flexShrink:   0,
                                            }}
                                        />
                                        <span className="truncate">{entry.name}</span>
                                    </span>
                                    <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                                        {entry.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {(!summary || summary.totalBudget === 0) && (
                <div
                    className="rounded-2xl p-8 text-center"
                    style={{
                        background: 'var(--card)',
                        border:     '1px dashed var(--border)',
                    }}
                >
                    <DollarSign
                        size={28}
                        style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px' }}
                    />
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>
                        No budget data yet
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                        Add budget amounts to cards to see the breakdown
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon:   React.ReactNode
    label:  string
    value:  string
    accent: string
    sub?:   string
}

function StatCard({ icon, label, value, accent, sub }: StatCardProps) {
    return (
        <div
            className="rounded-2xl p-4"
            style={{
                background: 'var(--card)',
                border:     '1px solid var(--border)',
            }}
        >
            <div
                className="flex items-center gap-2 mb-3"
                style={{ color: accent }}
            >
                {icon}
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                </span>
            </div>
            <p
                style={{
                    fontFamily:    "'JetBrains Mono', monospace",
                    fontWeight:    700,
                    fontSize:      22,
                    color:         'var(--foreground)',
                    letterSpacing: '-0.02em',
                }}
            >
                {value}
            </p>
            {sub && (
                <p style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {sub}
                </p>
            )}
        </div>
    )
}
