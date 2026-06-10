import { CardCategoryOption } from './CardCategories'
import { supabase } from './supabaseClient'

interface CardCategoryRow {
    id: string
    trip_id: string
    category_id: string
    label: string
    color: string
    position: number
    created_at: string
}

function toOption(row: CardCategoryRow): CardCategoryOption {
    return {
        id: row.category_id,
        label: row.label,
        color: row.color,
    }
}

export const cardCategoryRepository = {
    async findByTrip(tripId: string): Promise<CardCategoryOption[]> {
        const { data, error } = await supabase
            .from('card_categories')
            .select('*')
            .eq('trip_id', tripId)
            .order('position', { ascending: true })

        if (error) throw new Error(`findCardCategoriesByTrip failed: ${error.message}`)
        return (data as CardCategoryRow[]).map(toOption)
    },

    async createCategory(
        tripId: string,
        category: CardCategoryOption,
        position: number
    ): Promise<CardCategoryOption> {
        const { data, error } = await supabase
            .from('card_categories')
            .insert({
                trip_id: tripId,
                category_id: category.id,
                label: category.label,
                color: category.color,
                position,
            })
            .select()
            .single()

        if (error) throw new Error(`createCardCategory failed: ${error.message}`)
        return toOption(data as CardCategoryRow)
    },
}
