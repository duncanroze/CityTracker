import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { Moon, Sun, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-base font-semibold">CityTracker</h1>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setDark(!dark)} aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
