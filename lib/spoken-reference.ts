const smallNumbers = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const tens = "zero ten twenty thirty forty fifty sixty seventy eighty ninety".split(" ");

function readNumber(value: string): number | undefined {
  if (/^\d{1,3}$/.test(value)) return Number(value);
  const words = value.split(" ");
  const small = smallNumbers.indexOf(words[0]);
  if (words.length === 1 && small >= 0) return small;
  const ten = tens.indexOf(words[0]);
  const units = smallNumbers.indexOf(words[1]);
  if (ten >= 2 && (words.length === 1 || (words.length === 2 && units >= 1 && units <= 9))) {
    return ten * 10 + (words.length === 2 ? units : 0);
  }
  if (small >= 1 && small <= 9 && words[1] === "hundred") {
    const rest = words.slice(words[2] === "and" ? 3 : 2);
    const tail = rest.length ? readNumber(rest.join(" ")) : 0;
    if (tail !== undefined && tail < 100) return small * 100 + tail;
  }
}

export function spokenReference(transcript: string) {
  const text = transcript.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ")
    .replace(/^(first|second|third|one|two|three)\s+/i, (match) => {
      const order = ["first", "second", "third"].indexOf(match.trim().toLowerCase());
      return `${order >= 0 ? order + 1 : smallNumbers.indexOf(match.trim().toLowerCase())} `;
    });
  if (/\d:\d/.test(text)) return text;
  const words = text.toLowerCase().replace(/[-,]/g, " ").split(/\s+/);
  const explicitChapter = words.indexOf("chapter");
  const explicitVerse = words.findIndex((word) => word === "verse" || word === "verses");
  const numberStart = explicitChapter >= 0 ? explicitChapter + 1 : words.findIndex((word, index) => index > 0 && readNumber(word) !== undefined);
  const book = words.slice(0, explicitChapter >= 0 ? explicitChapter : numberStart).join(" ");
  if (numberStart < 1 || !book) return text;
  const boundaries = explicitVerse >= 0
    ? [explicitVerse]
    : words.slice(numberStart + 1).map((_, index) => index + numberStart + 1);
  for (const boundary of boundaries) {
    const chapter = readNumber(words.slice(numberStart, boundary).join(" "));
    const verse = readNumber(words.slice(boundary + (explicitVerse >= 0 ? 1 : 0)).join(" "));
    if (chapter && verse) return `${book.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())} ${chapter}:${verse}`;
  }
  return text;
}
