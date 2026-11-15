"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AudioLines, BarChart3, BookOpen, CalendarDays, CircleHelp, Flame, Gamepad2, House, Sparkles, UserRound, VolumeX } from "lucide-react";
import { usePlayer, usePlayerActions } from "@/lib/player";
import { progressStats } from "@/lib/progress";
import { InstallApp } from "./install";

const nav = [
  { href: "/", text: "Today", icon: House },
  { href: "/practice", text: "Practice", icon: Gamepad2 },
  { href: "/library", text: "Verse Library", mobileText: "Library", icon: BookOpen },
  { href: "/progress", text: "Progress", icon: BarChart3 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { today, events, hasSound } = usePlayer();
  const { toggleSound } = usePlayerActions();
  const stats = progressStats(events, today || "2000-01-01");
  const currentNav = path === "/learn" ? "/library" : ["/start", "/play"].includes(path) ? "/practice" : path;
  const currentTitle = nav.find((item) => item.href === currentNav)?.text ?? (path === "/account" ? "Account" : "About");
  const date = today ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(today + "T12:00:00Z")) : "";
  const isPlaying = path === "/play";

  function renderNav(mobile = false) {
    return nav.map(({ href, text, mobileText, icon: Icon }) => {
      const isActive = href === currentNav;
      return <Link href={href} className={isActive ? "nav-link is-active" : "nav-link"} key={href} aria-current={isActive ? "page" : undefined}>
        <Icon size={19} strokeWidth={isActive ? 2.35 : 1.9} /><span>{mobile ? mobileText ?? text : text}</span>
      </Link>;
    });
  }

  return <div className={isPlaying ? "shell is-playing" : "shell"}>
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Meleko home">
        <Image src="/icons/icon-192.png" width={39} height={39} alt="" unoptimized priority />
        <span>Meleko</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">{renderNav()}</nav>
      <div className="sidebar-bottom">
        <Link href="/account" className={path === "/account" ? "nav-link is-active" : "nav-link"} aria-current={path === "/account" ? "page" : undefined}><UserRound size={19} /><span>Account</span></Link>
        <Link href="/about" className={path === "/about" ? "nav-link is-active" : "nav-link"} aria-current={path === "/about" ? "page" : undefined}><CircleHelp size={19} /><span>About Meleko</span></Link>
      </div>
    </aside>
    <div className="shell-content">
      <header className="topbar">
        <div className="topbar-context"><b>{currentTitle}</b>{path === "/" && date && <><i aria-hidden="true" /><span>{date}</span></>}</div>
        <Link className="brand brand-mobile" href="/" aria-label="Meleko home">
          <Image src="/icons/icon-192.png" width={30} height={30} alt="" unoptimized priority /><span>Meleko</span>
        </Link>
        <div className="topbar-tools">
          <div className="topbar-stats">
            <Link href="/progress" className="stat-chip stat-flame" aria-label={`${stats.dailyStreak} day streak`} title="Daily streak"><Flame size={17} /> <b>{stats.dailyStreak}</b><span> days</span></Link>
            <Link href="/progress" className="stat-chip stat-calendar" aria-label={`${stats.weeklyStreak} week streak`} title="Weekly streak"><CalendarDays size={16} /> <b>{stats.weeklyStreak}</b><span> weeks</span></Link>
            <Link href="/progress" className="stat-chip stat-xp" title="Total XP"><Sparkles size={16} /><b>{stats.xp} XP</b></Link>
          </div>
          <button type="button" className="icon-button sound-button" aria-label="Game sounds" aria-pressed={hasSound} title={hasSound ? "Mute game sounds" : "Unmute game sounds"} onClick={toggleSound}>
            {hasSound ? <AudioLines size={20} /> : <VolumeX size={19} />}
          </button>
          <Link className="icon-button mobile-about" href="/account" aria-label="Account"><UserRound size={19} /></Link>
          <Link className="icon-button mobile-about" href="/about" aria-label="About Meleko"><CircleHelp size={20} /></Link>
        </div>
      </header>
      <main className="main-content" id="main" tabIndex={-1}>{children}</main>
      <div className={path === "/about" ? "install-control is-about" : "install-control"}><InstallApp /></div>
    </div>
    <nav className="mobile-nav" aria-label="Main navigation">{renderNav(true)}</nav>
  </div>;
}
