"use client";
import { useEffect, useState } from "react";

export default function ThemeController() {
  const [currentTheme, setCurrentTheme] = useState("light");
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const savedTheme = localStorage.getItem("theme") || systemTheme;
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? 'dark' : 'light';
        setCurrentTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const changeTheme = async (themeName: string) => {
    setIsChanging(true);
    document.documentElement.style.transition = 'all 0.3s ease-in-out';
    setTimeout(() => {
      setCurrentTheme(themeName);
      document.documentElement.setAttribute("data-theme", themeName);
      localStorage.setItem("theme", themeName);
      setTimeout(() => {
        setIsChanging(false);
        document.documentElement.style.transition = '';
      }, 300);
    }, 150);
  };

  const label = currentTheme === 'light' ? '深色主题' : '浅色主题';

  return (
    <div className="theme-controller-wrapper">
      <button
        onClick={() => changeTheme(currentTheme === "light" ? "dark" : "light")}
        className="theme-toggle-btn group relative overflow-hidden"
        aria-label={label}
        title={label}
        disabled={isChanging}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full"></div>
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <div className={`theme-icon transition-all duration-300 ${isChanging ? 'scale-0 rotate-180' : 'scale-100 rotate-0'}`}>
            {currentTheme === "light" ? (
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </div>
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/20 scale-0 group-active:scale-100 transition-transform duration-200"></div>
      </button>
    </div>
  );
}
