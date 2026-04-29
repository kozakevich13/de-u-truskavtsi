import { MessageSquare, Quote } from "lucide-react";

interface Review {
  user: string;
  source: string;
  date: string;
  text: string;
}

export default function PlaceReviews({ reviews }: { reviews: any }) {
  const reviewsList: Review[] = Array.isArray(reviews) ? reviews : [];

  if (reviewsList.length === 0) return null;

  return (
    <section className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800">
      <div className="flex items-center gap-2 mb-8 px-2">
        <MessageSquare className="text-blue-600" size={24} />
        <h2 className="text-2xl font-black uppercase tracking-tighter italic dark:text-zinc-100">
          Відгуки відвідувачів
        </h2>
      </div>

      {/* Змінено на flex-col для вертикального розташування */}
      <div className="flex flex-col gap-6 max-w-3xl"> 
        {reviewsList.map((review, index) => (
          <div 
            key={index} 
            className="relative flex flex-col justify-between rounded-[32px] bg-white p-8 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <Quote className="absolute top-6 right-8 text-zinc-100 dark:text-zinc-800/50" size={48} />
            
            <div className="relative z-10">
              <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                «{review.text}»
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <div className="flex items-center gap-3">
                {/* Аватарка з першою літерою імені */}
                <div className="h-10 w-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm">
                  {review.user.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {review.user}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {review.date}
                  </p>
                </div>
              </div>
              
              {review.source && (
                <div className="flex items-center gap-1.5 rounded-full bg-zinc-50 px-3 py-1 dark:bg-zinc-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Source: {review.source}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}