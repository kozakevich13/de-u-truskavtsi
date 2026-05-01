import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import { Calendar, User, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt")
    .eq("slug", slug)
    .single();

  if (!post) return { title: "Стаття не знайдена" };

  return {
    title: `${post.title} | Гід Трускавця`,
    description: post.excerpt,
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-black dark:text-white">
      <Link 
        href="/blog" 
        className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-blue-600 transition-colors"
      >
        <ChevronLeft size={14} /> Назад до гіду
      </Link>

      <article>
        <header className="mb-10">
          <div className="mb-4 flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
            <span>{post.category || "Поради"}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span className="text-zinc-400 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(post.created_at).toLocaleDateString('uk-UA')}
            </span>
          </div>
          
        <h1 className="mb-6 text-2xl font-black leading-tight tracking-tighter md:text-4xl italic uppercase">
        {post.title}
        </h1>

          <div className="flex items-center gap-3 border-y border-zinc-100 py-6 dark:border-zinc-800">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
              {post.author_image ? (
                <img src={post.author_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                  <User size={20} />
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider">{post.author_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Автор статті</p>
            </div>
          </div>
        </header>

        {post.image_url && (
          <div className="mb-10 overflow-hidden rounded-[32px] shadow-2xl shadow-blue-500/5">
            <img src={post.image_url} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        <div className="prose prose-zinc max-w-none dark:prose-invert prose-p:text-base prose-p:leading-relaxed md:prose-p:text-lg prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
          <div className="whitespace-pre-wrap font-medium text-zinc-800 dark:text-zinc-300">
            {post.content}
          </div>
        </div>
      </article>

      <footer className="mt-20 border-t border-zinc-100 pt-10 dark:border-zinc-800">
         <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 italic">
           Відкривай Трускавець • 2026
         </p>
      </footer>
    </main>
  );
}