"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

// Inline the theme hook to avoid import issues
function useThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("vision-pos-theme") as "dark" | "light" | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "light") {
      root.classList.add("light");
    }
    localStorage.setItem("vision-pos-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === "dark" ? "light" : "dark");
  }, []);

  const setTheme = useCallback((newTheme: "dark" | "light" | "system") => {
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setThemeState(systemTheme);
    } else {
      setThemeState(newTheme);
    }
  }, []);

  return { theme, setTheme, toggleTheme, mounted };
}

interface ThemeToggleProps {
  variant?: "icon" | "pill" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme, mounted } = useThemeToggle();

  if (!mounted) {
    return (
      <div className={cn("h-10 w-10 rounded-2xl bg-white/10", className)} />
    );
  }

  const resolvedTheme = theme;

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-2xl",
          "bg-white/10 backdrop-blur-sm border border-white/20",
          "hover:bg-white/20 hover:border-white/30",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className
        )}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <Sun
          className={cn(
            "h-5 w-5 transition-all duration-300",
            resolvedTheme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-5 w-5 transition-all duration-300",
            resolvedTheme === "light"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          )}
        />
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 p-1 rounded-2xl",
          "bg-white/10 backdrop-blur-sm border border-white/20",
          className
        )}
      >
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
            theme === "light"
              ? "bg-white/20 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
            theme === "dark"
              ? "bg-white/20 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
            theme === "system"
              ? "bg-white/20 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="System preference"
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
