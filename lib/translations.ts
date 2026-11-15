export const lookupTranslations = ["KJV", "WEB"] as const;

export const translations = [
  ["KJV", "King James Version"],
  ["WEB", "World English Bible"],
  ["NKJV", "New King James Version"],
  ["ESV", "English Standard Version"],
  ["NASB", "New American Standard Bible"],
  ["NLT", "New Living Translation"],
  ["NIV", "New International Version"],
] as const;

export type Translation = (typeof translations)[number][0];
export type LookupTranslation = (typeof lookupTranslations)[number];

export function isTranslation(value: string): value is Translation {
  return translations.some(([code]) => code === value);
}

export function isLookupTranslation(value: string): value is LookupTranslation {
  return lookupTranslations.some((code) => code === value);
}
