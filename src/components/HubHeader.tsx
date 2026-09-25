import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Groups" },
  { to: "/playground", label: "Playground" },
  { to: "/renders", label: "Renders" },
  { to: "/examples", label: "Examples" },
  { to: "/voice-studio", label: "Voice" },
];

export default function HubHeader() {
  const { pathname } = useLocation();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-mono text-sm font-semibold tracking-tight">shortdingus<span className="text-muted-foreground">/hub</span></Link>
        <nav className="hidden gap-5 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={cn("transition-colors hover:text-foreground", (l.to === "/" ? pathname === "/" || pathname.startsWith("/groups") : pathname === l.to) ? "text-foreground" : "text-muted-foreground")}>{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
