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
  id: string;
  name: string;
  category: Category;
  address: string;
  rating?: number; // 0..5
  openNow?: boolean;
  lat?: number;
  lng?: number;
}
