// src/components/PlaceMap.tsx
"use client";

import dynamic from "next/dynamic";
import type { SelectedPoint } from "./OSMMap";

const OSMMap = dynamic(() => import("./OSMMap"), { ssr: false });

export default function PlaceMap({ point }: { point?: SelectedPoint }) {
  return <OSMMap selected={point} />;
}
