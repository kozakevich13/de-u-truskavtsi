"use client";

import { useState } from "react";

export default function ExpandableDescription({ description, title }: { description: string, title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Про заклад {title}
      </h2>
      
      <div className="relative mt-3">
        <div
          className={`text-base leading-7 text-zinc-700 dark:text-zinc-400 transition-all duration-500 ease-in-out overflow-hidden ${
            isExpanded ? "max-h-[2000px]" : "max-h-[10.5rem] md:max-h-none line-clamp-6 md:line-clamp-none"
          }`}
        >
          {description}
        </div>

        {!isExpanded && (
          <div className="absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 md:hidden" />
        )}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 md:hidden flex items-center gap-1"
      >
        {isExpanded ? (
          <>
            Згорнути 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </>
        ) : (
          <>
            Читати повністю 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </>
        )}
      </button>
    </section>
  );
}