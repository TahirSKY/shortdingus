import { useLocation, Link } from "react-router-dom";
import { Wand2, Sparkles, ImageIcon, Film, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/agent-studio", label: "Agent", icon: Zap },
  { to: "/studio", label: "Studio", icon: Wand2 },
  { to: "/playground", label: "Play", icon: Sparkles },
  { to: "/renders", label: "Renders", icon: Film },
];

const MobileBottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
