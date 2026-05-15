"use client";

import { useEffect } from "react";
import { seedIfEmpty } from "@/lib/seed";

export function SeedOnEmpty() {
  useEffect(() => {
    void seedIfEmpty();
  }, []);
  return null;
}
