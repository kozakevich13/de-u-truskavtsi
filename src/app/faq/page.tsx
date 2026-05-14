import { supabase } from "../lib/supabase"; 
import FAQAccordion from "../components/FAQAccordion"; 
import { Metadata } from "next";

// 1. Метадані для пошуковиків
export const metadata: Metadata = {
  title: 'Довідник Трускавця — Питання та Відповіді',
  description: 'Найповніший FAQ про відпочинок у Трускавці: ціни на лікування, поради для туристів, розваги та мінеральні води.',
  keywords: ['Трускавець', 'Нафтуся', 'відпочинок у Трускавці', 'ціни', 'поради'],
};

export const dynamic = 'force-dynamic';

export default async function FAQPage() {
  const { data: faqs, error } = await supabase
    .from("faq")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Помилка Supabase на сервері:", error.message);
  }

  // 2. Формування JSON-LD для Google FAQ Rich Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs?.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      {/* Додаємо розмітку в HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="bg-white border-b border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white md:text-6xl mb-4">
              Довідник <span className="text-blue-600">Трускавця</span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Відповіді на найпопулярніші запитання про відпочинок, лікування та ціни.
            </p>
          </div>
        </div>

        <FAQAccordion faqs={faqs || []} />
      </main>
    </>
  );
}