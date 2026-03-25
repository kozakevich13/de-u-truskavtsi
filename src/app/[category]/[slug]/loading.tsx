export default function Loading() {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
        <div className="mb-6 h-9 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
  
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="h-[320px] rounded-2xl bg-zinc-200 dark:bg-zinc-800 md:h-[520px]" />
          <div className="grid grid-cols-2 grid-rows-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[155px] rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 md:h-[255px]" />
            ))}
          </div>
        </section>
  
        <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-10 w-3/4 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-1/2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
            
            <div className="flex gap-4 mt-6">
              <div className="h-8 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </div>
  
            <div className="mt-10 space-y-3">
              <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800/50" />
              <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800/50" />
              <div className="h-4 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
          </div>
  
          <aside className="lg:col-span-1">
            <div className="h-80 rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
          </aside>
        </section>
      </main>
    );
  }