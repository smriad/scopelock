import Link from "next/link";
import { History, Lock } from "lucide-react";

type Props = {
  active?: "home" | "history";
  subtitle?: string;
  trailing?: React.ReactNode;
};

export function AppHeader({ active = "home", subtitle, trailing }: Props) {
  return (
    <header className="relative border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/40"
          >
            <Lock className="h-5 w-5 text-emerald-300" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-lg font-semibold tracking-tight text-white">
                ScopeLock
              </Link>
              <nav className="flex gap-1 text-sm">
                <NavLink href="/" active={active === "home"}>Analyze</NavLink>
                <NavLink href="/history" active={active === "history"}>
                  <span className="inline-flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    History
                  </span>
                </NavLink>
              </nav>
            </div>
            {subtitle && (
              <p className="text-sm text-zinc-400">{subtitle}</p>
            )}
          </div>
        </div>
        {trailing}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-2.5 py-1 ${
        active
          ? "bg-white/10 text-emerald-200"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </Link>
  );
}
