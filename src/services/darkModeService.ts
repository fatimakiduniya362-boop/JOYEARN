/**
 * Global Dark Mode Service for JoyEarn
 * Handles persistence in localStorage and updates Tailwind CSS `.dark` classes on <html> and <body>.
 */

const STORAGE_KEY = 'joyearn_dark_mode';

class DarkModeService {
  private isDark: boolean = false;
  private listeners: Set<(isDark: boolean) => void> = new Set();

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.isDark = stored === 'true';
      } else {
        // Default to system preference if available
        this.isDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
      }
    } catch {
      this.isDark = false;
    }

    this.applyToDOM();
  }

  public getIsDark(): boolean {
    return this.isDark;
  }

  public setDark(enable: boolean) {
    this.isDark = enable;
    try {
      localStorage.setItem(STORAGE_KEY, String(enable));
    } catch {
      // storage unavailable
    }
    this.applyToDOM();
    this.notify();
  }

  public toggle(): boolean {
    this.setDark(!this.isDark);
    return this.isDark;
  }

  public subscribe(listener: (isDark: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isDark);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyToDOM() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (this.isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#090d16';
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.isDark));
  }
}

export const darkModeService = new DarkModeService();
