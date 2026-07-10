import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import { Calendar, ChevronLeft, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * SEO: Генерація динамічних метаданих та Open Graph
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt, image_url, category")
    .eq("slug", slug)
    .single();

  if (!post) return { title: "Стаття не знайдена" };

  const baseUrl = "https://detruckavtsi.info";

  return {
    title: `${post.title} | Гід Трускавця`,
    description: post.excerpt,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${baseUrl}/blog/${slug}`,
      siteName: "Відкривай Трускавець",
      images: post.image_url ? [{ url: post.image_url }] : [],
      type: "article",
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !post) return notFound();

  // Розрахунок часу читання
  const wordsPerMinute = 200;
  const textLength = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readingTime = Math.ceil(textLength / wordsPerMinute);

  /**
   * SEO: JSON-LD Структуровані дані
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.image_url,
    "author": { "@type": "Person", "name": post.author_name },
    "datePublished": post.created_at,
    "genre": post.category,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-black dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link 
        href="/blog" 
        className="mb-12 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-blue-600 transition-all group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Назад до всіх статей
      </Link>

      <article>
        <header className="mb-12">
          {/* Мета-дані */}
          <div className="mb-6 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest">
            <span className="bg-blue-600 px-2.5 py-1 text-white rounded-sm text-[11px]">{post.category || "Поради"}</span>
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              {new Date(post.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" />
              {readingTime} хв читання
            </span>
          </div>
          
          {/* Виправлено: зменшено розмір головного заголовка для балансу */}
          <h1 className="mb-8 text-3xl font-black leading-tight tracking-tight md:text-5xl italic uppercase text-zinc-900 dark:text-white">
            {post.title}
          </h1>

          {/* Структура: Фото + Вступ (Excerpt) */}
          <div className="flex flex-col md:flex-row gap-8 mb-16 items-start">
            {post.image_url && (
              <div className="w-full md:w-1/2 flex-shrink-0">
                <div className="overflow-hidden rounded-[32px] shadow-2xl shadow-blue-500/10 border border-zinc-100 dark:border-zinc-800">
                  <Image 
                    src={post.image_url} 
                    alt={post.title} 
                    width={800}
                    height={600}
                    priority 
                    className="w-full h-full object-cover aspect-[4/3] hover:scale-105 transition-transform duration-700" 
                    unoptimized
                  />
                </div>
              </div>
            )}
            <div className="w-full md:w-1/2">
               <h2 className="text-blue-600 text-xs font-black uppercase tracking-widest mb-4 italic">Короткий огляд</h2>
               <p className="text-lg md:text-xl font-medium leading-relaxed text-zinc-600 dark:text-zinc-400 italic decoration-blue-600/30 underline-offset-4 decoration-dotted underline">
                {post.excerpt}
               </p>
               
               <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-blue-600/20 bg-zinc-100 relative">
                    {post.author_image && (
                      <Image 
                        src={post.author_image} 
                        alt={post.author_name} 
                        fill
                        sizes="48px"
                        className="object-cover" 
                        unoptimized
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-blue-600">{post.author_name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Локальний експерт</p>
                  </div>
               </div>
            </div>
          </div>
        </header>

        {/* Основний контент статті (Typography) */}
        <div 
          className="prose prose-zinc max-w-none dark:prose-invert 
          prose-p:mb-8 prose-p:text-zinc-800 dark:prose-p:text-zinc-200
          prose-p:text-lg md:prose-p:text-xl prose-p:leading-relaxed 
          prose-headings:mt-12 prose-headings:mb-4 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
          prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:italic prose-h2:text-blue-600 dark:prose-h2:text-blue-400
          prose-h3:text-xl md:prose-h3:text-2xl prose-h3:text-zinc-900 dark:prose-h3:text-white
          prose-strong:text-black dark:prose-strong:text-white prose-strong:font-black
          prose-a:text-blue-600 prose-a:font-black prose-a:underline hover:prose-a:text-blue-500 transition-colors
          prose-ul:my-6 prose-ul:list-disc prose-ul:space-y-3
          prose-ol:my-6 prose-ol:space-y-3
          prose-li:text-lg md:prose-li:text-xl prose-li:leading-relaxed prose-li:italic prose-li:text-zinc-800 dark:prose-li:text-zinc-200
          prose-img:rounded-[40px] prose-img:my-12 prose-img:shadow-2xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <footer className="mt-24 border-t border-zinc-100 pt-12 dark:border-zinc-800">
         <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-1 w-12 bg-blue-600 rounded-full mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">
               Матеріал підготовлено командою Гіду Трускавця • 2026
            </p>
         </div>
      </footer>
    </main>
  );
}