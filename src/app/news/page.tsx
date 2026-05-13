import { supabase } from "../lib/supabase";
import NewsCard from "../components/NewsCard";

export const revalidate = 3600; // Оновлювати кеш кожну годину

export default async function NewsPage() {
  const { data: news } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white md:text-5xl">
          Новини Трускавця
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Будьте в курсі останніх подій та змін на нашому курорті.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {news?.map((item) => (
          <NewsCard key={item.id} news={item} />
        ))}
      </div>
    </main>
  );
}