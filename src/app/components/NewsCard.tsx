import Image from "next/image";
import Link from "next/link";
import { Calendar, User } from "lucide-react";

interface NewsCardProps {
  news: {
    title: string;
    slug: string;
    excerpt: string;
    image_url: string;
    category: string;
    author_name: string;
    published_at: string;
  };
}

export default function NewsCard({ news }: NewsCardProps) {
  return (
    <Link href={`/news/${news.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-100 bg-white transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={news.image_url || "/placeholder-news.jpg"}
          alt={news.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-blue-600/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {news.category}
          </span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{new Date(news.published_at).toLocaleDateString('uk-UA')}</span>
          </div>
          <div className="flex items-center gap-1">
            <User size={14} />
            <span>{news.author_name}</span>
          </div>
        </div>
        
        <h3 className="mb-2 text-xl font-bold leading-tight text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
          {news.title}
        </h3>
        
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {news.excerpt}
        </p>
      </div>
    </Link>
  );
}