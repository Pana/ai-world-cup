import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-white/10 bg-night/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-bold text-electric">AI World Cup</Link>
        <Link href="/" className="text-sm hover:text-electric">Leaderboard</Link>
        <Link href="/info" className="text-sm hover:text-electric">World Cup</Link>
      </div>
    </nav>
  );
}
