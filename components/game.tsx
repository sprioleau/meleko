"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Lightbulb, Mic, RotateCcw, Square, Trophy, X, Zap } from "lucide-react";
import { Listen } from "@/components/listen";
import { playCue, recordPractice, usePlayer } from "@/lib/player";
import { dayKey, eventXp, progressStats, verseProgress } from "@/lib/progress";
import { findVerse, modeInfo, normalizeWords, scoreRecall, splitWord, verses, wordsOf, type Mode, type Verse, type VerseId } from "@/lib/verses";

type Round = { verse: Verse; positions: readonly number[] };
type Tile = { id: number; word: string };
type RoundResult = { verseId: VerseId; isIndependent: boolean; score: number };

interface Recognition {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const focusVerse = verses[0];
const instructions: Record<Mode, string> = {
  blanks: "Choose words from the word bank to complete the verse.",
  ordering: "Choose each word in the order it appears in the verse.",
  letters: "Use the first letters to type the verse from memory.",
  spoken: "Say the verse from memory or type it below.",
};

function roundPlan(mode: Mode, verseId: VerseId | undefined, isLesson: boolean): Round[] {
  const selectedVerse = isLesson && mode === "blanks"
    ? undefined
    : findVerse(verseId) ?? (isLesson ? focusVerse : undefined);
  return (selectedVerse ? [selectedVerse] : verses).map((verse) => ({
    verse,
    positions: mode === "ordering" ? wordsOf(verse.text).map((_, index) => index) : verse.blanks,
  }));
}

function makeTiles(options: string[], seed: number) {
  const tiles = options.map((word, id) => ({ id, word }));
  for (let index = tiles.length - 1; index > 0; index--) {
    seed = Math.imul(seed, 1664525) + 1013904223;
    const swap = (seed >>> 0) % (index + 1);
    [tiles[index], tiles[swap]] = [tiles[swap], tiles[index]];
  }
  return tiles;
}

function RecallInput({ answer, onAnswer, isLocked, mode, isListening, onListening }: {
  answer: string;
  onAnswer: (answer: string) => void;
  isLocked: boolean;
  mode: Mode;
  isListening: boolean;
  onListening: (value: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.abort();
  }, []);

  function toggleRecognition() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Speech recognition is unavailable in this browser. Type your verse below.");
      return;
    }
    setMessage("");
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.onresult = (event) => onAnswer(event.results[0][0].transcript);
      recognition.onend = () => {
        recognitionRef.current = null;
        onListening(false);
      };
      recognition.onerror = () => {
        onListening(false);
        setMessage("Speech recognition could not capture your verse. Try again or type it below.");
      };
      recognition.start();
      onListening(true);
    } catch {
      recognitionRef.current = null;
      setMessage("Microphone access is unavailable. Type your verse below.");
    }
  }

  return <div className="game-recall">
    {mode === "spoken" && !isLocked && <div className="game-mic-row">
      <button className="button button-soft" type="button" onClick={toggleRecognition}>
        {isListening ? <Square size={17} /> : <Mic size={17} />}
        {isListening ? "Stop recording" : "Use microphone"}
      </button>
      {isListening && <span role="status">Listening…</span>}
    </div>}
    {message && <p className="game-mic-message" role="status">{message}</p>}
    <label htmlFor="game-answer">Your verse</label>
    <textarea id="game-answer" value={answer} readOnly={isLocked || isListening} rows={3}
      autoCapitalize="off" autoComplete="off" spellCheck={false} onChange={(event) => onAnswer(event.target.value)}
      placeholder="Type the verse from memory…" />
  </div>;
}

function TileRound({ mode, words, positions, tiles, choices, activeSlot, feedback, onSlot, onTile }: {
  mode: Mode;
  words: string[];
  positions: readonly number[];
  tiles: Tile[];
  choices: (Tile | null)[];
  activeSlot: number;
  feedback: ReturnType<typeof scoreRecall> | null;
  onSlot: (slot: number) => void;
  onTile: (tile: Tile) => void;
}) {
  const isLocked = feedback?.isExact ?? false;
  return <>
    <div className={`game-verse game-verse-${mode}`} aria-label={mode === "blanks" ? "Verse with missing words" : "Place words in verse order"}>
      {words.map((token, wordIndex) => {
        const slot = positions.indexOf(wordIndex);
        if (slot === -1) return <span key={wordIndex}>{token}</span>;
        const choice = choices[slot];
        const { punctuation } = splitWord(token);
        const isWrong = Boolean(feedback && choice && choice.word.toLowerCase() !== splitWord(token).word.toLowerCase());
        return <span key={wordIndex} className="game-slot-token">
          <button type="button" className="game-slot" data-active={!isLocked && activeSlot === slot}
            data-incorrect={isWrong} data-complete={isLocked} disabled={isLocked}
            aria-label={choice ? `${isWrong ? "Incorrect. " : ""}Remove ${choice.word} from position ${slot + 1}` : `Select missing word ${slot + 1}`}
            aria-pressed={!isLocked && activeSlot === slot} onClick={() => onSlot(slot)}>
            {choice?.word ?? <span aria-hidden="true">{mode === "ordering" ? slot + 1 : ""}</span>}
          </button>{punctuation}
        </span>;
      })}
    </div>
    {!isLocked && <div className="game-word-bank">
      <h3>Word bank</h3>
      <div className="game-tiles">
        {tiles.map((tile) => {
          const isUsed = choices.some((choice) => choice?.id === tile.id);
          return <button key={tile.id} type="button" className="game-tile" aria-disabled={isUsed || activeSlot === -1}
            data-used={isUsed} onClick={() => {
              if (!isUsed && activeSlot !== -1) onTile(tile);
            }}>{tile.word}</button>;
        })}
      </div>
    </div>}
  </>;
}

function PlayRound({ round, number, mode, hasRecording, onNext, isFinal }: {
  round: Round;
  number: number;
  mode: Mode;
  hasRecording: boolean;
  onNext: (result: RoundResult) => void;
  isFinal: boolean;
}) {
  const { verse, positions } = round;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isTileMode = mode === "blanks" || mode === "ordering";
  const [words] = useState(() => wordsOf(verse.text));
  const [tiles] = useState(() => makeTiles([
    ...positions.map((position) => splitWord(words[position]).word),
    ...(mode === "blanks" ? verse.distractors : []),
  ], number + words.length));
  const [choices, setChoices] = useState<(Tile | null)[]>(() => positions.map(() => null));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<ReturnType<typeof scoreRecall> | null>(null);
  const [hasHint, setHasHint] = useState(false);
  const [hasMiss, setHasMiss] = useState(false);
  const activeSlot = selectedSlot ?? choices.indexOf(null);
  const isComplete = Boolean(feedback && (feedback.isExact || mode === "spoken"));
  const canCheck = isTileMode ? choices.every(Boolean) : !isListening && normalizeWords(answer).length > 0;

  useEffect(() => {
    if (number > 1) titleRef.current?.focus();
  }, [number]);

  function chooseSlot(slot: number) {
    setFeedback(null);
    setSelectedSlot(slot);
    setChoices((previous) => previous.map((choice, index) => index === slot ? null : choice));
  }

  function chooseTile(tile: Tile) {
    if (activeSlot === -1) return;
    setFeedback(null);
    setSelectedSlot(null);
    setChoices((previous) => previous.map((choice, index) => index === activeSlot ? tile : choice));
  }

  function updateAnswer(value: string) {
    setAnswer(value);
    setFeedback(null);
  }

  function useHint() {
    setHasHint(true);
    if (!isTileMode) return;
    const slot = choices.findIndex((choice, index) => choice?.word !== splitWord(words[positions[index]]).word);
    if (slot === -1) return;
    const word = splitWord(words[positions[slot]]).word;
    function isAvailable(tile: Tile) {
      return !choices.some((choice) => choice?.id === tile.id);
    }
    const tile = tiles.find((option) => option.word === word && isAvailable(option))
      ?? tiles.find((option) => option.word === word && choices.some((choice, index) =>
        choice?.id === option.id && choice.word !== splitWord(words[positions[index]]).word));
    if (!tile) return;
    setChoices((previous) => previous.map((choice, index) => {
      if (index === slot) return tile;
      return choice?.id === tile.id ? null : choice;
    }));
    setSelectedSlot(null);
    setFeedback(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComplete && feedback) {
      onNext({ verseId: verse.id, score: feedback.score, isIndependent: feedback.isExact && !hasHint && !hasMiss });
      return;
    }
    if (!canCheck) return;
    const text = isTileMode ? words.map((word, index) => {
      const slot = positions.indexOf(index);
      return slot === -1 ? word : choices[slot]?.word;
    }).join(" ") : answer;
    const result = scoreRecall(verse.text, text);
    setFeedback(result);
    if (!result.isExact) setHasMiss(true);
    playCue(result.isExact);
  }

  function retry() {
    setFeedback(null);
    if (mode === "spoken") setAnswer("");
  }

  return <section className="game-card game-enter" aria-labelledby="game-round-heading">
    <div className="game-card-heading">
      <h2 id="game-round-heading" ref={titleRef} tabIndex={-1}>{verse.reference} <span className="mastery-label">KJV</span></h2>
      {isComplete && <span className="game-round-check"><Check size={17} /> Reviewed</span>}
    </div>
    <form onSubmit={submit}>
      {isTileMode ? <TileRound mode={mode} words={words} positions={positions} tiles={tiles} activeSlot={activeSlot}
        choices={choices} feedback={feedback} onSlot={chooseSlot} onTile={chooseTile} /> : <>
        {mode === "letters" && <p className="game-verse game-letter-cues" aria-label="First letters of each word">
          {words.map((token, index) => <span key={index}>{token[0].toUpperCase()}{splitWord(token).punctuation}</span>)}
        </p>}
        <RecallInput mode={mode} answer={answer} onAnswer={updateAnswer} isLocked={isComplete}
          isListening={isListening} onListening={setIsListening} />
      </>}
      {hasHint && !isTileMode && !isComplete && <p className="game-hint-verse">
        <Lightbulb size={18} aria-hidden="true" /> {verse.text}
      </p>}
      {feedback && <div className={`game-feedback ${feedback.isExact ? "game-correct" : "game-incorrect"}`} role="status">
        <div className="game-feedback-heading">
          {feedback.isExact ? <Check size={20} /> : <RotateCcw size={19} />}
          <strong>{feedback.isExact ? "That’s right!" : mode === "spoken" ? `${feedback.score}% match` : "Give it another try"}</strong>
        </div>
        {feedback.isExact && <p>{verse.text}</p>}
        {!feedback.isExact && isTileMode && <p>Select a highlighted word to replace it.</p>}
        {!feedback.isExact && mode === "letters" && <p>Check your words and their order, then try again.</p>}
        {!feedback.isExact && mode === "spoken" && <p className="game-match">
          {words.map((word, index) => <span key={index} data-matched={feedback.matched[index]}>{word}{!feedback.matched[index] && <span> (missed or changed)</span>}</span>)}
          {feedback.extras.length > 0 && <span>Extra words: {feedback.extras.join(", ")}</span>}
        </p>}
      </div>}
      <div className="game-actions">
        {isComplete ? <>
          {mode === "spoken" && !feedback?.isExact && <button type="button" className="button button-soft" onClick={retry}>
            <RotateCcw size={16} /> Try again
          </button>}
          <Listen verse={verse} hasRecording={hasRecording} />
        </> : <button type="button" className="button button-soft" onClick={useHint} disabled={hasHint && !isTileMode}>
          <Lightbulb size={18} /> {isTileMode ? "Get a hint" : "Show verse"}
        </button>}
        <button type="submit" className="button button-primary game-check" disabled={!canCheck}>
          {isComplete ? (isFinal ? "See results" : "Next round") : "Check answer"}
          {isComplete ? <ArrowRight size={18} /> : <Check size={18} />}
        </button>
      </div>
    </form>
  </section>;
}

export function Game({ mode, verseId, isLesson, recordings }: {
  mode: Mode;
  verseId?: VerseId;
  isLesson: boolean;
  recordings: VerseId[];
}) {
  const [rounds] = useState(() => roundPlan(mode, verseId, isLesson));
  const [results, setResults] = useState<RoundResult[]>([]);
  const [earnedXp, setEarnedXp] = useState(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const submittedRounds = useRef(0);
  const player = usePlayer();
  const index = results.length;
  const round = rounds[index];
  const hasFinished = index === rounds.length;
  const requestedVerse = verseId ? `&verse=${verseId}` : "";
  const lessonQuery = isLesson ? "&lesson=1" : "";
  const startHref = `/start?mode=${mode}${requestedVerse}${lessonQuery}`;
  const returnHref = isLesson ? "/" : "/practice";
  const today = player.today || dayKey();
  const nextReview = verseProgress(player.events, results.at(-1)?.verseId ?? focusVerse.id, today).nextReview;
  const streak = progressStats(player.events, today).dailyStreak;

  useEffect(() => {
    if (hasFinished) resultHeading.current?.focus();
  }, [hasFinished]);

  function finishRound(result: RoundResult) {
    if (submittedRounds.current > index) return;
    submittedRounds.current++;
    const { verseId: id, isIndependent } = result;
    const previous = recordPractice(id, mode, isIndependent);
    const value = eventXp({ id: "", date: player.today, verseId: id, mode, isIndependent });
    const xp = Math.max(0, value - (previous ? eventXp(previous) : 0));
    setEarnedXp((total) => total + xp);
    setResults([...results, result]);
  }

  return <div className="game-shell">
    <div className="game-topline">
      <Link href={hasFinished ? returnHref : startHref} className="game-back">
        {hasFinished ? <ArrowLeft size={17} /> : <X size={19} />}{hasFinished ? "Back" : "Exit practice"}
      </Link>
      {!hasFinished && <span className="game-round-label">Round {index + 1} of {rounds.length}</span>}
    </div>
    {!hasFinished ? <>
      <div className="game-progress" role="progressbar" aria-label="Completed rounds" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={index}>
        {rounds.map((_, position) => <span key={position} data-state={position < index ? "done" : position === index ? "current" : "next"} />)}
      </div>
      <header className="game-header">
        <h1>{modeInfo[mode].title}</h1>
        <p>{instructions[mode]}</p>
      </header>
      <PlayRound key={index} round={round} number={index + 1} mode={mode} isFinal={index === rounds.length - 1}
        hasRecording={recordings.includes(round.verse.id)} onNext={finishRound} />
    </> : <section className="game-card game-finish game-enter">
      <span className="game-trophy"><Trophy size={32} strokeWidth={1.8} /></span>
      <h1 ref={resultHeading} tabIndex={-1}>Practice complete!</h1>
      <p>You finished {rounds.length} {rounds.length === 1 ? "round" : "rounds"} of {modeInfo[mode].title.toLowerCase()}.</p>
      <p>{streak} day{streak === 1 ? "" : "s"} of practice in a row{nextReview ? ` · Next review: ${nextReview}` : ""}</p>
      <div className="game-result-row">
        <div className="game-result"><Zap size={20} /><strong>+{earnedXp} XP</strong><span>Earned today</span></div>
        <div className="game-result"><Check size={20} />
          <strong>{mode === "spoken" ? `${Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)}%` : `${results.filter((result) => result.isIndependent).length}/${rounds.length}`}</strong>
          <span>{mode === "spoken" ? "Word match" : "Without help"}</span>
        </div>
      </div>
      <div className="game-finish-actions">
        {isLesson && mode === "blanks" ? <Link href={`/start?mode=spoken&verse=${focusVerse.id}&lesson=1`} className="button button-primary">
          Continue to Spoken Recall <ArrowRight size={18} />
        </Link> : <Link href={returnHref} className="button button-primary">
          {isLesson ? "Back to lesson" : "Back to practice"} <ArrowRight size={18} />
        </Link>}
        <Link href={isLesson && mode === "blanks" ? returnHref : startHref} className="button button-soft">
          {isLesson && mode === "blanks" ? "Back to lesson" : "Practice again"} <ChevronRight size={17} />
        </Link>
      </div>
    </section>}
  </div>;
}
