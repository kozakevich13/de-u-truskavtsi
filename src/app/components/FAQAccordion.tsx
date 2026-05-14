'use client';
import { ChevronDown, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { FAQ } from "../types/place";

export default function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState("всі");

  const types = useMemo(() => {
    const uniqueTypes = Array.from(new Set(faqs.map((f) => f.type || "загальне")));
    return ["всі", ...uniqueTypes];
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = 
        activeType.toLowerCase() === "всі" || 
        faq.type?.toLowerCase() === activeType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [searchQuery, activeType, faqs]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      
      {/* Блок пошуку та фільтрів */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Пошук у довіднику..."
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase transition-all ${
                activeType.toLowerCase() === type.toLowerCase()
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Список акордеонів */}
      {filteredFaqs.length > 0 ? (
        filteredFaqs.map((faq, index) => (
          <div 
            key={faq.id} 
            className="overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-all dark:border-zinc-800 dark:bg-zinc-950"
            itemScope itemType="https://schema.org/Question" // Додаткова мікророзмітка
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="flex w-full items-center justify-between p-6 text-left focus:outline-none"
            >
              {/* Семантичний заголовок h3 для SEO */}
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 pr-4" itemProp="name">
                {faq.question}
              </h3>
              <ChevronDown 
                className={`flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} 
                size={20} 
              />
            </button>
            
            <div 
              className={`transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 invisible'
              }`}
              itemScope itemType="https://schema.org/Answer" 
              itemProp="acceptedAnswer"
            >
              <div className="p-6 pt-0 text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-50 dark:border-zinc-900/50">
                <p className="whitespace-pre-line" itemProp="text">{faq.answer}</p>
                <div className="mt-4 flex gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    #{faq.category}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
                    {faq.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="py-20 text-center text-zinc-500 font-medium">
          <p className="text-xl font-bold">Нічого не знайдено за запитом 🦆</p>
        </div>
      )}
    </div>
  );
}