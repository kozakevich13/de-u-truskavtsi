import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js' // або твій шлях до supabase client

// Налаштуй клієнт Supabase (використовуй свої змінні середовища)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://detruckavtsi.info'

  // 1. Отримуємо всі місця з бази даних Supabase
  const { data: places } = await supabase
    .from('places')
    .select('slug, category, created_at')

  // 2. Формуємо масив посилань для кожного місця
  const placeEntries = (places || []).map((place) => ({
    url: `${baseUrl}/${place.category}/${place.slug}`,
    lastModified: new Date(place.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 3. Додаємо статичні сторінки (головна, категорії тощо)
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Додай тут інші статичні сторінки, якщо вони є
  ]

  return [...staticEntries, ...placeEntries]
}