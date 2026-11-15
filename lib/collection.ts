"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { makePersonalVerse, verses, type Verse } from "./verses";

const list = makeFunctionReference<"query", Record<string, never>, { _id: string; reference: string; translation: string; text: string }[]>("collection:list");

type Collection = { verses: Verse[]; personalVerses: Verse[]; isLoading: boolean; isAuthenticated: boolean };

export function useCollection(): Collection {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return { verses, personalVerses: [], isLoading: false, isAuthenticated: false };
  return useConnectedCollection();
}

function useConnectedCollection(): Collection {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const personal = useQuery(list, isAuthenticated ? {} : "skip");
  const personalVerses = (personal ?? []).map((verse) => makePersonalVerse(`personal:${verse._id}`, verse.reference, verse.translation, verse.text));
  return { verses: [...verses, ...personalVerses], personalVerses, isLoading: isAuthLoading || (isAuthenticated && personal === undefined), isAuthenticated };
}
