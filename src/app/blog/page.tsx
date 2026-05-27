export const revalidate = 86400;

import { Metadata } from "next";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { BookOpen, Calendar, ChevronRight, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Гід по Трускавцю: Статті, поради та цікаві добірки",
  description: "Корисні поради для туристів, добірки найкращих місць та актуальні новини курорту Трускавець.",
};

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const initialPosts = posts ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 text-black dark:text-white">
      <header className="mb-12 border-b border-zinc-100 pb-8 dark:border-zinc-800 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <BookOpen size={28} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Гід по місту</h1>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl font-medium mx-auto md:mx-0">
          Ми збираємо для вас найцікавіші факти про оздоровлення, добірки місць та маршрути Трускавця.
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2">
        {initialPosts.map((post) => (
          <Link 
            key={post.id} 
            href={`/blog/${post.slug}`}
            className="group flex flex-col gap-5 rounded-[40px] border border-zinc-100 bg-white p-5 transition-all hover:border-blue-500 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            {/* Обкладинка */}
            <div className="relative h-60 w-full overflow-hidden rounded-[30px]">
              <img 
                src={post.image_url || "/placeholder-blog.jpg"} 
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                  {post.category}
                </span>
              </div>
            </div>

            <div className="flex flex-col flex-1 px-2">
              <h2 className="mb-3 text-2xl font-black leading-tight text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              
              <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 mb-6">
                {post.excerpt}
              </p>

              {/* БЛОК АВТОРА ТА ДАТИ */}
              <div className="mt-auto flex items-center justify-between border-t border-zinc-50 dark:border-zinc-800 pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
                    {post.author_image ? (
                      <img src={post.author_image} alt={post.author_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-zinc-400">
                        <User size={14} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                      {post.author_name}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(post.created_at).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}