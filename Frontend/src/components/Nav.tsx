import Link from "next/link";
import { Bot, CalendarDays, MessageSquareText, ScrollText, Trophy, UserRound } from "lucide-react";

export function Nav() {
  const links = [
    { href: "/", label: "Leaderboard", icon: Trophy },
    { href: "/matches", label: "Matches", icon: CalendarDays },
    { href: "/models", label: "Models", icon: Bot },
    { href: "/debate", label: "Debate", icon: MessageSquareText },
    { href: "/prompts", label: "Prompts", icon: ScrollText },
    { href: "/play", label: "Play", icon: UserRound }
  ];
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3">
        <Link href="/" className="mr-3 shrink-0 font-black text-electric">AI World Cup</Link>
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 px-2 py-1 text-sm text-slate-300 hover:text-electric">
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
        <Link href="/info" className="ml-auto shrink-0 px-2 py-1 text-sm text-slate-400 hover:text-electric">About</Link>
      </div>
    </nav>
  );
}
