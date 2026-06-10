export interface CountryCurrency {
    code: string
    name: string
    currency: string
}

export const COUNTRY_CURRENCIES: CountryCurrency[] = [
    { code: 'AU', name: 'Australia', currency: 'AUD' },
    { code: 'BR', name: 'Brazil', currency: 'BRL' },
    { code: 'CA', name: 'Canada', currency: 'CAD' },
    { code: 'CH', name: 'Switzerland', currency: 'CHF' },
    { code: 'CN', name: 'China', currency: 'CNY' },
    { code: 'DK', name: 'Denmark', currency: 'DKK' },
    { code: 'EG', name: 'Egypt', currency: 'EGP' },
    { code: 'FR', name: 'France', currency: 'EUR' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
    { code: 'GR', name: 'Greece', currency: 'EUR' },
    { code: 'IE', name: 'Ireland', currency: 'EUR' },
    { code: 'IT', name: 'Italy', currency: 'EUR' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR' },
    { code: 'PT', name: 'Portugal', currency: 'EUR' },
    { code: 'ES', name: 'Spain', currency: 'EUR' },
    { code: 'FI', name: 'Finland', currency: 'EUR' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
    { code: 'ID', name: 'Indonesia', currency: 'IDR' },
    { code: 'IN', name: 'India', currency: 'INR' },
    { code: 'JP', name: 'Japan', currency: 'JPY' },
    { code: 'KR', name: 'South Korea', currency: 'KRW' },
    { code: 'MY', name: 'Malaysia', currency: 'MYR' },
    { code: 'MX', name: 'Mexico', currency: 'MXN' },
    { code: 'NO', name: 'Norway', currency: 'NOK' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
    { code: 'PH', name: 'Philippines', currency: 'PHP' },
    { code: 'SE', name: 'Sweden', currency: 'SEK' },
    { code: 'SG', name: 'Singapore', currency: 'SGD' },
    { code: 'TH', name: 'Thailand', currency: 'THB' },
    { code: 'TR', name: 'Turkey', currency: 'TRY' },
    { code: 'TW', name: 'Taiwan', currency: 'TWD' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'VN', name: 'Vietnam', currency: 'VND' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
]

const COUNTRY_ALIASES: Record<string, string> = {
    america: 'US',
    england: 'GB',
    holland: 'NL',
    korea: 'KR',
    uk: 'GB',
    usa: 'US',
    'united states of america': 'US',
    'u.s.': 'US',
    'u.s.a.': 'US',
}

export function getCurrencyForCountryCode(countryCode?: string | null): string | null {
    if (!countryCode) return null
    const normalized = countryCode.trim().toUpperCase()
    return COUNTRY_CURRENCIES.find((country) => country.code === normalized)?.currency ?? null
}

export function findCountryCurrency(input: string): CountryCurrency | null {
    const normalized = input.trim().toLowerCase()
    if (!normalized) return null

    const aliasCode = COUNTRY_ALIASES[normalized]
    if (aliasCode) {
        return COUNTRY_CURRENCIES.find((country) => country.code === aliasCode) ?? null
    }

    const byCode = COUNTRY_CURRENCIES.find((country) => country.code.toLowerCase() === normalized)
    if (byCode) return byCode

    return COUNTRY_CURRENCIES.find((country) => country.name.toLowerCase() === normalized) ?? null
}
