import { describe, expect, it } from "vitest";
import { makePersonalVerse, scoreRecall, splitWord, verses, wordsOf } from "./verses";

describe("verse recall", () => {
  it("accepts the complete wording when punctuation and case differ", () => {
    expect(scoreRecall(verses[1].text, "the lord is my shepherd i shall not want"))
      .toEqual({ score: 100, isExact: true, extras: [], matched: Array(9).fill(true) });
  });

  it("highlights an omitted word without losing the alignment of later words", () => {
    expect(scoreRecall("The LORD is my shepherd", "the lord my shepherd"))
      .toEqual({ score: 80, isExact: false, extras: [], matched: [true, true, false, true, true] });
  });

  it("penalizes extra words even if the expected wording is present", () => {
    expect(scoreRecall("Jesus wept.", "then Jesus wept briefly").score).toBe(50);
  });

  it("provides distinct, in-range answers and no duplicate distractors for each blank round", () => {
    for (const verse of verses) {
      const words = wordsOf(verse.text);
      const options = [
        ...verse.blanks.map((position) => splitWord(words[position]).word.toLowerCase()),
        ...verse.distractors.map((word) => word.toLowerCase()),
      ];
      expect(options.every(Boolean)).toBe(true);
      expect(new Set(options).size).toBe(options.length);
    }
  });
});


it("reports extra words even when every expected word matches", () => {
  const result = scoreRecall("The Lord is my shepherd", "The Lord is truly my shepherd");
  expect(result.matched).toEqual([true, true, true, true, true]);
  expect(result.extras).toEqual(["truly"]);
  expect(result.isExact).toBe(false);
});


it("keeps personal passage text and translation while selecting playable blanks", () => {
  const text = '“The Lord’s mercy,” she said, “endures forever.”';
  const verse = makePersonalVerse("personal:123", "Psalm 136:1", "ESV", text);
  expect(verse.text).toBe(text);
  expect(verse.translation).toBe("ESV");
  expect(verse.blanks.length).toBeGreaterThan(0);
  for (const position of verse.blanks) {
    const token = wordsOf(text)[position];
    const { prefix, word, punctuation } = splitWord(token);
    expect(prefix + word + punctuation).toBe(token);
  }
});
