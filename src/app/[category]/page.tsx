import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link"; // Додаємо імпорт Link
import { createClient } from "@supabase/supabase-js";
import CategoryContent from "../components/CategoryContent";
import { Place } from "../types/place";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categoryMapping: Record<string, string> = {
  cafes: "cafe",
  restaurants: "restaurant",
  hotels: "hotel",
  shops: "shop",
  sanatoriums: "sanatorium",
  museums: "museums",
  cinemas: "cinema",
  byuvets: "byuvet",
  malls: "mall"
};

const categorySEO: Record<string, { title: string, h1: string, description: string, seoText: string }> = {
  cafe: {
    title: "Найкращі кав'ярні Трускавця 2026 — де випити каву",
    h1: "Кав'ярні Трускавця",
    description: "Список найзатишніших кав'ярень Трускавця. Смачна кава, десерти та найкращі місця для сніданку.",
    seoText: "Трускавецька кавова культура вражає різноманіттям: від маленьких затишних кав'ярень у центрі до сучасних закладів із крафтовою кавою та власною випічкою."
  },
  hotel: {
    title: "Готелі Трускавця: забронювати житло та відпочинок",
    h1: "Готелі Трускавця",
    description: "Найкращі готелі та вілли Трускавця. Огляди, фото, рейтинги та зручний пошук житла для вашої відпустки.",
    seoText: "Відпочинок у Трускавці починається з вибору житла. Ви можете обрати сучасні готельні комплекси, приватні вілли в історичному центрі або затишні апартаменти."
  },
  restaurant: {
    title: "Ресторани Трускавця: де смачно поїсти",
    h1: "Ресторани Трускавця",
    description: "Путівник ресторанами Трускавця. Українська, європейська та карпатська кухня.",
    seoText: "Ресторани міста пропонують багатий вибір страв: від автентичної галицької кухні до вишуканих європейських делікатесів."
  },
  sanatorium: {
    title: "Санаторії Трускавця: лікування та оздоровлення",
    h1: "Санаторії Трускавця",
    description: "Повний список санаторіїв Трускавця з медичними профілями.",
    seoText: "Санаторії міста спеціалізуються на лікуванні багатьох захворювань, поєднуючи вживання цілющих вод із сучасними процедурами."
  },
  shop: {
    title: "Магазини та супермаркети Трускавця",
    h1: "Шопінг у Трускавці",
    description: "Де купити продукти та сувеніри у Трускавці.",
    seoText: "У місті працюють як великі мережеві супермаркети, так і колоритні сувенірні ринки з виробами карпатських майстрів."
  },
  museums: {
    title: "Музеї та культурні пам'ятки Трускавця",
    h1: "Музеї Трускавця",
    description: "Культурна програма у Трускавці: музеї та галереї.",
    seoText: "Музеї Трускавця відкривають багату історію регіону та знайомлять із творчістю видатних українських митців."
  },
  cinema: {
    title: "Кінотеатри Трускавця: розклад та квитки",
    h1: "Кінотеатри Трускавця",
    description: "Перегляд найновіших фільмів у Трускавці. Дізнайтеся розклад сеансів та локації кінозалів.",
    seoText: "Кінотеатри міста пропонують сучасне обладнання та комфортні умови для перегляду світових прем'єр."
  },
  byuvet: {
    title: "Бювети Трускавця: Нафтуся, Марія та Софія",
    h1: "Бювети Трускавця",
    description: "Графік роботи бюветів Трускавця та правила вживання лікувальних вод.",
    seoText: "Бювети — це серце курортного Трускавця. Саме тут туристи отримують доступ до унікальних мінеральних вод."
  },
  mall: {
    title: "Торгові центри Трускавця: ТЦ Вектор, ТЦ Куб",
    h1: "Торгові центри Трускавця",
    description: "Найкращі місця для шопінгу та розваг у Трускавці.",
    seoText: "Сучасні торгові центри Трускавця поєднують у собі супермаркети, бутіки та зони для відпочинку."
  }
};

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const dbKey = categoryMapping[params.category];
  const seo = dbKey ? categorySEO[dbKey] : null;
  return {
    title: seo?.title || "Категорія",
    description: seo?.description || "",
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const { category: urlCategory } = params;
  const dbCategory = categoryMapping[urlCategory];
  const seo = dbCategory ? categorySEO[dbCategory] : null;

  if (!dbCategory || !seo) notFound();

  const otherCategories = Object.keys(categoryMapping)
    .filter(cat => cat !== urlCategory)
    .map(cat => ({
      slug: cat,
      label: categorySEO[categoryMapping[cat]]?.h1 || cat
    }));

  const { data: places } = await supabase
    .from("places")
    .select("*")
    .eq("category", dbCategory)
    .order("rating", { ascending: false });

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Навігація */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link 
          href="/" 
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Головна
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900 font-medium dark:text-zinc-300">
          {seo.h1}
        </span>
      </nav>

      {/* Заголовок */}
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-5xl text-center md:text-left">
          {seo.h1}
        </h1>
      </header>

      {/* Список + Карта */}
      <CategoryContent initialPlaces={(places as Place[]) || []} />

      {/* SEO-блок */}
      <section className="mt-20 rounded-[2.5rem] border border-zinc-200 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Про відпочинок та {seo.h1.toLowerCase()}
        </h2>
        <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {seo.seoText}
        </p>

        <hr className="my-10 border-zinc-200 dark:border-zinc-700" />
        
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Досліджуйте Трускавець далі:
          </h3>
          <div className="flex flex-wrap gap-3">
            {otherCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}