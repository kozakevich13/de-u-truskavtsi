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
}
