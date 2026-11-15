function referenceKey(reference: string) {
  return reference.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
}

export function referenceChoices(reference: string, pool: readonly string[], roundNumber: number) {
  const answerKey = referenceKey(reference);
  const distractors = new Map<string, string>();
  for (const option of pool) {
    const key = referenceKey(option);
    if (key !== answerKey && !distractors.has(key)) distractors.set(key, option);
  }

  const choices = [...distractors.values()].slice(0, 3);
  const seed = [...reference].reduce((value, character) => value + character.charCodeAt(0), roundNumber);
  choices.splice(seed % (choices.length + 1), 0, reference);
  return choices;
}
