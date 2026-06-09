// boundary/WeatherIcon.tsx
// US-19: maps weatherService icon slugs to Lucide icons
// Used by KanbanColumn weather strip and AnalyticsDashboard

import {
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudLightning,
    CloudDrizzle,
    CloudFog,
    Wind,
} from 'lucide-react'

export function getWeatherIcon(slug: string, size: number = 16): React.ReactNode {
    const style = { flexShrink: 0 as const }

    switch (slug) {
        case 'clear':
            return <Sun size={size} style={{ ...style, color: '#F59E0B' }} />
        case 'partly-cloudy':
            return <Cloud size={size} style={{ ...style, color: '#94A3B8' }} />
        case 'cloudy':
            return <Cloud size={size} style={{ ...style, color: '#64748B' }} />
        case 'fog':
            return <CloudFog size={size} style={{ ...style, color: '#94A3B8' }} />
        case 'drizzle':
            return <CloudDrizzle size={size} style={{ ...style, color: '#60A5FA' }} />
        case 'rain':
            return <CloudRain size={size} style={{ ...style, color: '#3B82F6' }} />
        case 'showers':
            return <CloudRain size={size} style={{ ...style, color: '#2563EB' }} />
        case 'snow':
            return <CloudSnow size={size} style={{ ...style, color: '#BAE6FD' }} />
        case 'thunder':
            return <CloudLightning size={size} style={{ ...style, color: '#8B5CF6' }} />
        default:
            return <Wind size={size} style={{ ...style, color: '#94A3B8' }} />
    }
}