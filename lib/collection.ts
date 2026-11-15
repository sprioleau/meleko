"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { makePersonalVerse, verses, type Verse } from "./verses";


type Collection = { verses: Verse[]; personalVerses: Verse[]; isLoading: boolean; isAuthenticated: boolean };

export function useCollection(): Collection {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return { verses, personalVerses: [], isLoading: false, isAuthenticated: false };
  return useConnectedCollection();
}

function useConnectedCollection(): Collection {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const personal = useQuery(api.collection.list, isAuthenticated ? {} : "skip");
  const personalVerses = (personal ?? []).map((verse) => makePersonalVerse(`personal:${verse._id}`, verse.reference, verse.translation, verse.text, verse.narrationUrl));
  return { verses: [...verses, ...personalVerses], personalVerses, isLoading: isAuthLoading || (isAuthenticated && personal === undefined), isAuthenticated };
}
