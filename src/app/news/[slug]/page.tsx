import { supabase } from "../../lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function SingleNewsPage({ params }: { params: { slug: string } }) {
  const { data: news } = await supabase
    .from("news")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!news) return notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {news.category}
        </span>
        <h1 className="mb-6 text-3xl font-black leading-tight text-zinc-900 dark:text-white md:text-5xl">
          {news.title}
        </h1>
        <div className="flex items-center gap-4 text-zinc-500">
          <span>{new Date(news.published_at).toLocaleDateString('uk-UA')}</span>
          <span>•</span>
          <span>{news.author_name}</span>
        </div>
      </header>

      <div className="relative mb-10 aspect-video overflow-hidden rounded-3xl shadow-2xl">
        <Image
          src={news.image_url}
          alt={news.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Рендеримо HTML контент з бази */}
      <div 
        className="prose prose-lg dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </article>
  );
}