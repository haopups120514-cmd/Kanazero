"use client";
import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Read current effective theme from the data-theme attribute set by the init script
    const current = document.documentElement.getAttribute("data-theme");
    setIsDark(current !== "light");

    const handleChange = () => {
      const t = document.documentElement.getAttribute("data-theme");
      setIsDark(t !== "light");
    };
    window.addEventListener("kz-theme-changed", handleChange);
    return () => window.removeEventListener("kz-theme-changed", handleChange);
  }, []);

  const toggle = useCallback(() => {
    const newDark = !isDark;
    const theme = newDark ? "dark" : "light";
    localStorage.setItem("kz-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent("kz-theme-changed"));
    setIsDark(newDark);
  }, [isDark]);

  return { isDark, toggle };
}
