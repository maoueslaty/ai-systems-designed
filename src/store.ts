import { useCallback, useEffect, useState } from 'react';

const KEY = 'asd.progress.v1';
type Progress = Record<string, number>; // lessonId → max step index reached (+1); outline lessons use 1

function read(): Progress {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function useProgress() {
  const [p, setP] = useState<Progress>(read);
  const mark = useCallback((id: string, step: number) => {
    setP(prev => {
      if ((prev[id] ?? 0) >= step) return prev;
      const next = { ...prev, [id]: step };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  return { progress: p, mark };
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('asd.theme') as 'dark' | 'light') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('asd.theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}

export function useHashRoute() {
  const get = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  const [parts, setParts] = useState<string[]>(get);
  useEffect(() => {
    const on = () => { setParts(get()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export const go = (path: string) => { location.hash = '#/' + path; };
