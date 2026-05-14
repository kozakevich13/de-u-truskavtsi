export type Category =
  | "cafe"
  | "restaurant"
  | "grocery"
  | "pharmacy"
  | "gas"
  | "gym"
  | "atm"
  | "hotel"
  | "park"
  | "attraction";

export interface OpeningHours {
  opens: string;
  closes: string;
  dayOfWeek: string[];
}
  
export interface Place {
  id: number;
  name: string;
  category: string;
  address: string;
  description: string | null;
  images: string[] | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  is_open_now: boolean | null;
  created_at?: string;
  slug: string;
  main_image: string;
  menu?: MenuSection[];
  opening_hours?: OpeningHours[] | null;
}

export interface MenuItem {
  name: string;
  price: string;
  weight?: string;
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}


export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  type: string;
  slug: string;
  created_at: string;
}

export interface FAQPageContentProps {
  initialFaqs: FAQ[];
}
