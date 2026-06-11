// User Stories: US-23 to US-27

import { supabase } from '../entity/supabaseClient'

export interface ExchangeRate {
    base: string
    target: string
    rate: number
    date: string
}

export interface ConvertedAmount {
    original: number
    converted: number
    rate: number
    tripCurrency: string
    homeCurrency: string
}

export interface BudgetSummary {
    tripCurrency: string
    homeCurrency: string
    totalBudget: number
    totalConverted: number
    byCategory: Record<string, number>
}

// Frankfurter Fetch
async function fetchRate(base: string, target: string): Promise<ExchangeRate | null> {
    if (base === target) {
        return {base, target, rate: 1, date: new Date().toISOString().split('T')[0]}
    }
    try {
        const url = `https://api.frankfurter.app/latest?from=${base}&to=${target}`
        const response = await fetch(url)

        if (!response.ok) return null

        const data= await response.json()

        const rate: ExchangeRate = {
            base,
            target,
            rate: data.rates[target],
            date: data.date,
        }

        // write to raw.exchange_rates for the dbt 
        writeRawExchangeRate(base, target, rate.rate, data).catch(console.error)

        return rate
    } catch {
        return null
    }

}

// US-44: insert one row into raw.exchange_rate per fetch
async function writeRawExchangeRate(base: string, target: string, rate: number, rawPayload: unknown): Promise<void> {
    const { error } = await supabase
        .schema('raw')
        .from('exchange_rates')
        .insert({
            base_currency: base,
            target_currency: target,
            rate,
            raw_payload: rawPayload,
        })

    if (error) console.error('Failed to write raw exchange rate:', error.message)
}


// rate cache
const rateCache = new Map<string, ExchangeRate>()

async function getRate(base: string, target: string): Promise<ExchangeRate | null> {
    const key = `${base}_${target}`
    if (rateCache.has(key)) return rateCache.get(key)!

    const rate = await fetchRate(base, target)
    if (rate) rateCache.set(key, rate)
    return rate
}

export const fxService = {

    // US-25: convert a single amount from trip currency to home curreny
    async convert(amount: number, tripCurrency: string, homeCurrency: string): Promise<ConvertedAmount | null> {
        const rate = await getRate(tripCurrency, homeCurrency)
        if (!rate) return null

        return {
            original: amount, 
            converted: Math.round(amount * rate.rate * 100) / 100,
            rate: rate.rate,
            tripCurrency,
            homeCurrency,
        }
    },

    // US-26: format a converted amount for display
    formatWithHome(
        amount: number,
        tripCurrency: string,
        convertedAmount: number,
        homeCurrency: string
    ): string {
        const trip = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: tripCurrency,
        }).format(amount)

        const home = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: homeCurrency,
        }).format(convertedAmount)

        if (tripCurrency === homeCurrency) return trip

        return `${trip} (${home})`
    },

    // US-27: compute budget summary for entire trip
    async getBudgetSummary(
        cards: {category: string, budget_amount: number | null; budget_currency?: string | null}[],
        tripCurrency: string,
        homeCurrency: string
    ): Promise<BudgetSummary> {
        const byCategory: Record<string, number> = {}

        // sum budget amounts by category in the trip currency
        for (const card of cards) {
            if (!card.budget_amount) continue 

            const sourceCurrency = card.budget_currency ?? tripCurrency
            let tripCurrencyAmount = card.budget_amount

            if (sourceCurrency !== tripCurrency) {
                const rate = await getRate(sourceCurrency, tripCurrency)
                if (rate) {
                    tripCurrencyAmount = Math.round(card.budget_amount * rate.rate * 100) / 100
                }
            }

            byCategory[card.category] = (byCategory[card.category] ?? 0) + tripCurrencyAmount
        }

        const totalBudget = Object.values(byCategory).reduce((a, b) => a + b, 0)

        // convert total to home currency
        const rate = await getRate(tripCurrency, homeCurrency)
        const totalConverted = rate ? Math.round(totalBudget * rate.rate * 100) / 100 : totalBudget

        return {
            tripCurrency,
            homeCurrency,
            totalBudget,
            totalConverted,
            byCategory,
        }
    },

    // US-23: fet the current rate for a currency pair
    async getRate(base: string, target: string): Promise<ExchangeRate | null> {
        return await getRate(base, target)
    },

    // US-24: list of supported currencies
    getSupportedCurrencies(): { code: string; name: string }[] {
        return [
            { code: 'USD', name: 'US Dollar' },
            { code: 'EUR', name: 'Euro' },
            { code: 'GBP', name: 'British Pound' },
            { code: 'JPY', name: 'Japanese Yen' },
            { code: 'SGD', name: 'Singapore Dollar' },
            { code: 'AUD', name: 'Australian Dollar' },
            { code: 'BRL', name: 'Brazilian Real' },
            { code: 'CAD', name: 'Canadian Dollar' },
            { code: 'CHF', name: 'Swiss Franc' },
            { code: 'CNY', name: 'Chinese Yuan' },
            { code: 'DKK', name: 'Danish Krone' },
            { code: 'HKD', name: 'Hong Kong Dollar' },
            { code: 'KRW', name: 'South Korean Won' },
            { code: 'THB', name: 'Thai Baht' },
            { code: 'MYR', name: 'Malaysian Ringgit' },
            { code: 'MXN', name: 'Mexican Peso' },
            { code: 'NOK', name: 'Norwegian Krone' },
            { code: 'SEK', name: 'Swedish Krona' },
            { code: 'TRY', name: 'Turkish Lira' },
            { code: 'IDR', name: 'Indonesian Rupiah' },
            { code: 'PHP', name: 'Philippine Peso' },
            { code: 'VND', name: 'Vietnamese Dong' },
            { code: 'INR', name: 'Indian Rupee' },
            { code: 'AED', name: 'UAE Dirham' },
            { code: 'NZD', name: 'New Zealand Dollar' },
            { code: 'ZAR', name: 'South African Rand' },
        ]
    },

    // clear the in-memory cache
    clearCache(): void {
        rateCache.clear()
    },
}
