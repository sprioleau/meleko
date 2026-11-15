export const verses = [
  {
    id: "philippians-4-13",
    reference: "Philippians 4:13",
    theme: "Strength",
    text: "I can do all things through Christ which strengtheneth me.",
    blanks: [3, 6, 8],
    distractors: ["faith", "helpeth", "good"],
  },
  {
    id: "psalm-23-1",
    reference: "Psalm 23:1",
    theme: "Trust",
    text: "The LORD is my shepherd; I shall not want.",
    blanks: [1, 4, 8],
    distractors: ["guide", "fear", "God"],
  },
  {
    id: "psalm-119-11",
    reference: "Psalm 119:11",
    theme: "Scripture",
    text: "Thy word have I hid in mine heart, that I might not sin against thee.",
    blanks: [1, 4, 7, 12],
    distractors: ["soul", "kept", "forget"],
  },
  {
    id: "john-11-35",
    reference: "John 11:35",
    theme: "Compassion",
    text: "Jesus wept.",
    blanks: [0, 1],
    distractors: ["Mary", "prayed", "spoke"],
  },
  {
    id: "1-timothy-4-15",
    reference: "1 Timothy 4:15",
    theme: "Practice",
    text: "Meditate upon these things; give thyself wholly to them; that thy profiting may appear to all.",
    blanks: [0, 5, 6, 11],
    distractors: ["Consider", "freely", "learning"],
  },
] as const;

export type Verse = (typeof verses)[number];
export type VerseId = Verse["id"];

export const modes = ["blanks", "ordering", "letters", "spoken"] as const;
export type Mode = (typeof modes)[number];

export const modeInfo = {
  blanks: { title: "Fill in the Blanks", detail: "Put the missing words back into the verse.", difficulty: "Warm-up" },
  ordering: { title: "Word Ordering", detail: "Put the scrambled words back in order.", difficulty: "Memory builder" },
  letters: { title: "First-Letter Recall", detail: "Rebuild the verse using its first letters.", difficulty: "Memory challenge" },
  spoken: { title: "Spoken Recall", detail: "Say the verse from memory and check what matched.", difficulty: "Full recall" },
} satisfies Record<Mode, { title: string; detail: string; difficulty: string }>;

export function findVerse(id: string | null | undefined) {
  return verses.find((verse) => verse.id === id);
}

export function findMode(value: string | undefined): Mode {
  return modes.find((mode) => mode === value) ?? "blanks";
}

export function wordsOf(text: string) {
  return text.trim().split(/\s+/);
}

export function normalizeWords(text: string) {
  return text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
}

export function splitWord(token: string) {
  const word = token.replace(/[^a-z]/gi, "");
  return { word, punctuation: token.slice(word.length) };
}

export function scoreRecall(expected: string, answer: string) {
  const target = normalizeWords(expected);
  const spoken = normalizeWords(answer);
  const rows = Array.from({ length: target.length + 1 }, () => Array<number>(spoken.length + 1).fill(0));
  for (let i = 0; i <= target.length; i++) rows[i][0] = i;
  for (let j = 0; j <= spoken.length; j++) rows[0][j] = j;
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= spoken.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + Number(target[i - 1] !== spoken[j - 1]));
    }
  }

  const matched = target.map(() => false);
  const extras: string[] = [];
  let i = target.length;
  let j = spoken.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === spoken[j - 1] && rows[i][j] === rows[i - 1][j - 1]) {
      matched[--i] = true;
      j--;
    } else if (i > 0 && j > 0 && rows[i][j] === rows[i - 1][j - 1] + 1) {
      i--;
      j--;
    } else if (j > 0 && rows[i][j] === rows[i][j - 1] + 1) {
      extras.unshift(spoken[j - 1]);
      j--;
    } else {
      i--;
    }
  }

  const edits = rows[target.length][spoken.length];
  const denominator = Math.max(target.length, spoken.length, 1);
  return { score: Math.max(0, Math.round(100 * (1 - edits / denominator))), isExact: edits === 0, matched, extras };
}
