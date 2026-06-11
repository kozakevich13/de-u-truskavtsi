// 1. КОНФІГУРАЦІЯ РОУТУ (Next.js шукає ці константи строго на самому верху файлу)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 2. ІМПОРТИ
import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// 3. ІНІЦІАЛІЗАЦІЯ КЛІЄНТА
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 4. ГОЛОВНА ФУНКЦІЯ ГЕНЕРАЦІЇ SITEMAP
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://detruckavtsi.info'

  // Використовуємо Promise.all, щоб зробити всі запити до бази одночасно (це набагато швидше)
  const [placesResponse, postsResponse, newsResponse] = await Promise.all([
    supabase.from('places').select('slug, category, created_at'),
    supabase.from('posts').select('slug, created_at'), // Тягнемо дані з таблиці posts
    supabase.from('news').select('slug, created_at')
  ])

  // 1. Формуємо лінки для місць (places) -> урл: /category/slug
  const placeEntries = (placesResponse.data || []).map((place) => ({
    url: `${baseUrl}/${place.category}/${place.slug}`,
    lastModified: new Date(place.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 2. Формуємо лінки для блогових статей -> дані з `posts`, але URL через `/blog/slug`
  const postEntries = (postsResponse.data || []).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`, // Змінено префікс з /posts/ на /blog/
    lastModified: new Date(post.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 3. Формуємо лінки для новин (news) -> урл: /news/slug
  const newsEntries = (newsResponse.data || []).map((item) => ({
    url: `${baseUrl}/news/${item.slug}`,
    lastModified: new Date(item.created_at),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // 4. Статичні сторінки (головна, archives блогу та новин)
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl, // Головна сторінка сайту (додано для повноти мапи)
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`, // Сторінка зі списком усіх статей блогу
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`, // Сторінка зі списком усіх новин
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }
  ]

  // Об'єднуємо абсолютно всі посилання в одну велику мапу сайту
  return [...staticEntries, ...placeEntries, ...postEntries, ...newsEntries]
}