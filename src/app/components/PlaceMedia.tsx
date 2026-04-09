import React from "react";

const mediaConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inst: {
    label: "Instagram",
    color: "group-hover:text-pink-600 dark:group-hover:text-pink-400",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
  },
  fb: {
    label: "Facebook",
    color: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  },
  web: {
    label: "Сайт",
    color: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  },
  youtube: {
    label: "YouTube",
    color: "group-hover:text-red-600 dark:group-hover:text-red-400",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 2-2h15a2 2 0 0 1 2 2 24.12 24.12 0 0 1 0 10 2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2Z"/><path d="m10 15 5-3-5-3z"/></svg>
  },
  tiktok: {
    label: "TikTok",
    color: "group-hover:text-zinc-900 dark:group-hover:text-white",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
  }
};

interface PlaceMediaProps {
  media: Record<string, string> | null;
}

export default function PlaceMedia({ media }: PlaceMediaProps) {
  if (!media || Object.keys(media).length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 font-montserrat">
        Контакти та мережі
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(media).map(([key, url]) => {
          const config = mediaConfig[key] || mediaConfig.web;

          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <div className={`transition-colors ${config.color}`}>
                {config.icon}
              </div>
              <span>{config.label}</span>
              <svg 
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-zinc-400" 
                xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}