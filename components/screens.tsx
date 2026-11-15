"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, ChevronDown, LayoutGrid, List, Lightbulb, Mic, Sparkles, Trophy, Type, Puzzle, ListOrdered, Flame, CalendarDays, Star } from "lucide-react";
import { Listen } from "@/components/listen";
import { usePlayer } from "@/lib/player";
import { dayKey, progressStats, verseProgress } from "@/lib/progress";
import { modeInfo, modes, verses, type Mode, type VerseId } from "@/lib/verses";

const icons = { blanks: Puzzle, ordering: ListOrdered, letters: Type, spoken: Mic };
const days = ["M", "T", "W", "T", "F", "S", "S"];
const spotlight = verses[0];

function Week({ weekDays }: { weekDays: boolean[] }) {
  return <div className="week-days" role="group" aria-label="Practice days this week">
    {days.map((day, index) => <div className="week-day" key={index}>
      <span aria-hidden="true">{day}</span><span role="img" className={`day-circle ${weekDays[index] ? "is-done" : ""}`} aria-label={`${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]}: ${weekDays[index] ? "practiced" : "not practiced"}`}>{weekDays[index] ? <Check size={15} /> : null}</span>
    </div>)}
  </div>;
}

function ModeIcon({ mode }: { mode: Mode }) {
  const Icon = icons[mode];
  return <span className={`mode-icon mode-${mode}`}><Icon size={21} strokeWidth={1.8} /></span>;
}

export function Home({ recordings }: { recordings: VerseId[] }) {
  const { events, today } = usePlayer();
  const currentDay = today || dayKey();
  const stats = progressStats(events, currentDay);
  const isRead = events.some((event) => event.date === currentDay && event.verseId === spotlight.id && event.mode === "read");
  const blankCount = new Set(events.filter((event) => event.date === currentDay && event.mode === "blanks").map((event) => event.verseId)).size;
  const isSpoken = events.some((event) => event.date === currentDay && event.verseId === spotlight.id && event.mode === "spoken");
  const dueVerses = verses.filter((verse) => {
    const { nextReview } = verseProgress(events, verse.id, currentDay);
    return nextReview && nextReview <= currentDay;
  });
  return <div className="screens-page home-page">
    <section className="lesson-hero">
      <div className="hero-copy"><span className="hero-kicker"><Sparkles size={15} /> ABOUT 5 MINUTES</span>
        <h1>Today’s lesson</h1><p>Make space for Scripture, one verse at a time.</p>
        <Link className="button button-primary hero-button" href={`/learn?verse=${spotlight.id}&lesson=1`}>Start lesson <ArrowRight size={18} /></Link>
      </div>
      <div className="hero-art" role="img" aria-label="An open book on a blue pedestal" />
    </section>
    <div className="home-grid"><section className="home-activities"><div className="section-heading"><div><h2>Your lesson</h2><p>Three steps to practice today.</p></div></div>
      <div className="activity-list">
        <Link className="activity-row" href={`/learn?verse=${spotlight.id}&lesson=1`}><span className="mode-icon mode-read"><BookOpen size={21} /></span><span><strong>Read the verse</strong><small>{isRead ? "Completed today" : "Read Philippians 4:13"}</small></span>{isRead ? <Check size={19} /> : <ChevronRight size={19} />}</Link>
        <Link className="activity-row" href="/start?lesson=1"><ModeIcon mode="blanks" /><span><strong>Daily Blanks</strong><small>{Math.min(blankCount, 5)} of 5 verses completed today</small></span>{blankCount >= 5 ? <Check size={19} /> : <ChevronRight size={19} />}</Link>
        <Link className="activity-row" href={`/start?mode=spoken&verse=${spotlight.id}&lesson=1`}><ModeIcon mode="spoken" /><span><strong>Spoken Recall</strong><small>{isSpoken ? "Completed today" : "Say Philippians 4:13 from memory"}</small></span>{isSpoken ? <Check size={19} /> : <ChevronRight size={19} />}</Link>
      </div>
    </section><aside className="home-aside">
      <section className="spotlight-card"><div className="card-topline"><span className="eyebrow">VERSE SPOTLIGHT</span><BookOpen size={18} /></div><p className="spotlight-quote">“{spotlight.text}”</p><div className="spotlight-bottom"><strong>{spotlight.reference} · KJV</strong><Listen verse={spotlight} hasRecording={recordings.includes(spotlight.id)} /></div></section>
      <section className="week-card"><div className="card-topline"><div><span className="eyebrow">YOUR RHYTHM</span><h3>This week</h3></div><span className="week-count">{stats.weekDays.filter(Boolean).length} / 7 days</span></div><Week weekDays={stats.weekDays} /><p>Every day you show up matters.</p><Link href="/progress">View your progress <ArrowRight size={15} /></Link></section>
    </aside></div>
    <section className="due-section"><div className="section-heading"><h2>Ready to review</h2><p>Verses return here when it’s time to practice again.</p></div>{dueVerses.length ? <div className="due-list">{dueVerses.map((verse) => <Link href={`/start?mode=spoken&verse=${verse.id}`} key={verse.id}><span><strong>{verse.reference}</strong><small>{verse.theme} · KJV</small></span><span>Review verse <ArrowRight size={15} /></span></Link>)}</div> : <div className="due-empty">No verses are due for review today.</div>}</section>
  </div>;
}

export function Practice() {
  const [verseId, setVerseId] = useState<VerseId>(spotlight.id);
  return <div className="screens-page"><header className="page-heading"><span className="eyebrow">MAKE IT STICK</span><h1>Practice your way</h1><p>Choose an activity and give your memory a little workout.</p></header><div className="practice-selector"><label htmlFor="practice-verse">Choose a verse</label><div className="practice-select-wrap"><select id="practice-verse" value={verseId} onChange={(event) => setVerseId(event.target.value as VerseId)}>{verses.map((verse) => <option value={verse.id} key={verse.id}>{verse.reference}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></div></div><div className="practice-grid">{modes.map((mode) => <Link href={`/start?mode=${mode}&verse=${verseId}`} className="practice-card" key={mode}><div className="practice-card-top"><ModeIcon mode={mode} /></div><span className="pill">{modeInfo[mode].difficulty}</span><h2>{modeInfo[mode].title}</h2><p>{modeInfo[mode].detail}</p><span className="card-link">Start practicing <ArrowRight size={17} /></span></Link>)}</div><div className="practice-note"><Lightbulb size={20} /><p>Want to choose a different verse? Explore the <Link href="/library">verse library</Link>.</p></div></div>;
}

export function Library({ recordings }: { recordings: VerseId[] }) {
  const { events, today } = usePlayer();
  const [view, setView] = useState<"list" | "grid">("list");
  return <div className="screens-page"><header className="page-heading"><span className="eyebrow">WORDS TO KEEP CLOSE</span><h1>Verse library</h1><p>Explore the verses in your collection, and return to them whenever you need.</p></header><div className="library-toolbar"><span>{verses.length} verses</span><div className="library-view-toggle" role="group" aria-label="Library view"><button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} aria-hidden="true" /> List</button><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={18} aria-hidden="true" /> Grid</button></div></div><div className={`library-grid library-${view}`}>{verses.map((verse) => {
    const progress = verseProgress(events, verse.id, today || dayKey());
    return <article className="verse-card" key={verse.id}><div className="verse-card-content"><div className="card-topline"><span className="verse-theme">{verse.theme}</span><span className="mastery-label">{progress.mastery}</span></div><blockquote>“{verse.text}”</blockquote><strong>{verse.reference} · KJV</strong></div><div className="verse-card-actions"><Link className="button button-soft button-small" href={`/learn?verse=${verse.id}`}>Read</Link><Link className="button button-primary button-small" href={`/start?mode=blanks&verse=${verse.id}`}>Practice <ArrowRight size={15} /></Link><Listen verse={verse} hasRecording={recordings.includes(verse.id)} /></div></article>;
  })}</div></div>;
}

export function Progress() {
  const { events, today } = usePlayer();
  const currentDay = today || dayKey();
  const stats = progressStats(events, currentDay);
  const practiced = verses.filter((verse) => verseProgress(events, verse.id, currentDay).mastery !== "New").length;
  return <div className="screens-page"><header className="page-heading"><span className="eyebrow">EVERY STEP COUNTS</span><h1>Your progress</h1><p>Small moments of practice make a meaningful difference.</p></header><div className="stats-grid"><article className="stat-card"><span className="stat-icon"><Flame size={20} /></span><strong>{stats.dailyStreak}</strong><h2>Day streak</h2><p>Consecutive days of practice</p></article><article className="stat-card"><span className="stat-icon"><CalendarDays size={20} /></span><strong>{stats.weeklyStreak}</strong><h2>Week streak</h2><p>Weeks with 3 practice days</p></article><article className="stat-card"><span className="stat-icon"><Star size={20} /></span><strong>{stats.xp}</strong><h2>Practice points</h2><p>Earned through activities</p></article><article className="stat-card"><span className="stat-icon"><BookOpen size={20} /></span><strong>{practiced}</strong><h2>Verses practiced</h2><p>Out of {verses.length} in your library</p></article></div><div className="progress-grid"><section className="progress-panel"><div className="card-topline"><div><span className="eyebrow">KEEP SHOWING UP</span><h2>This week</h2></div><span className="week-count">{stats.weekDays.filter(Boolean).length} / 7 days</span></div><Week weekDays={stats.weekDays} /><p>Practice on three days to build your weekly streak.</p></section><section className="progress-panel"><span className="eyebrow">YOUR COLLECTION</span><h2>Verse progress</h2><div className="progress-list">{verses.map((verse) => <Link href={`/learn?verse=${verse.id}`} key={verse.id}><span>{verse.reference}</span><span className="mastery-label">{verseProgress(events, verse.id, currentDay).mastery}</span><ChevronRight size={16} /></Link>)}</div></section></div></div>;
}

export function About() {
  return <div className="screens-page about-page"><div className="about-intro"><span className="eyebrow">THE HEART BEHIND MELEKO</span><h1>Words worth remembering.</h1><p>Learn Scripture through play. Remember it for life.</p></div><div className="about-grid"><section className="about-card"><span className="about-icon"><BookOpen size={24} /></span><h2>A little practice, a lasting word</h2><p>Meleko is a space to slow down, spend time with Scripture, and build a practice of remembering. Read, listen, and try different activities as you make each verse your own.</p></section><section className="about-card"><span className="about-icon"><Sparkles size={24} /></span><h2>What’s in a name?</h2><p>Meleko takes inspiration from the Greek <em>μελετάω</em> (meletaō): to practice, meditate, or devote careful attention. It’s a word connected to the invitation to meditate in 1 Timothy 4:15 and to meditation on God’s law in Psalm 1:2 in the Septuagint.</p></section></div><div className="about-footer"><Trophy size={20} /><span>Made with care by <strong>San'Quan Prioleau</strong>.</span></div></div>;
}
