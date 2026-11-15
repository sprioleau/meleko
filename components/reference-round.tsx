"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { usePlayerActions } from "@/lib/player";
import { referenceChoices } from "@/lib/reference-match";
import { verses, type Verse } from "@/lib/verses";

export function ReferenceRound({ verse, number, isFinal, onNext }: {
  verse: Verse;
  number: number;
  isFinal: boolean;
  onNext: (result: { verseId: Verse["id"]; score: number; isIndependent: boolean }) => void;
}) {
  const { playCue } = usePlayerActions();
  const title = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState("");
  const [incorrect, setIncorrect] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const options = referenceChoices(verse.reference, verses.map((item) => item.reference), number);

  useEffect(() => {
    title.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCorrect) {
      onNext({ verseId: verse.id, score: 100, isIndependent: incorrect.length === 0 });
      return;
    }

    if (!selected || incorrect.includes(selected)) return;
    const isMatch = selected === verse.reference;
    playCue(isMatch);
    if (isMatch) setIsCorrect(true);
    else setIncorrect([...incorrect, selected]);
  }

  return <section className="game-card game-enter" aria-labelledby="reference-question">
    <div className="game-card-heading">
      <h2 id="reference-question" ref={title} tabIndex={-1}>Where is this passage found?</h2>
      <span className="pill">{verse.translation}</span>
    </div>
    <blockquote className="game-verse reference-passage">{verse.text}</blockquote>
    <form onSubmit={submit}>
      <fieldset className="reference-options" disabled={isCorrect}>
        <legend>Choose the reference</legend>
        {options.map((option) => {
          const isWrong = incorrect.includes(option);
          return <label key={option} data-wrong={isWrong} data-selected={selected === option}>
            <input type="radio" name="reference" value={option} checked={selected === option} onChange={() => setSelected(option)} />
            <span>{option}</span>
            {isWrong && <span className="reference-option-note">Incorrect</span>}
          </label>;
        })}
      </fieldset>
      {(isCorrect || incorrect.length > 0) && <div className={`game-feedback ${isCorrect ? "game-correct" : "game-incorrect"}`} role="status">
        {isCorrect ? <><strong>Correct!</strong> {verse.reference}</> : "Try another reference."}
      </div>}
      <div className="game-actions">
        <button type="submit" className="button button-primary game-check" disabled={!selected || (!isCorrect && incorrect.includes(selected))}>
          {isCorrect ? (isFinal ? "See results" : "Next round") : "Check answer"}
          {isCorrect ? <ArrowRight size={18} /> : <Check size={18} />}
        </button>
      </div>
    </form>
  </section>;
}
