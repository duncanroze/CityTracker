import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Moon, Sun, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MapProvider, useMapContext } from '../contexts/MapContext';
import AppMap from './AppMap';
import AppNav from './AppNav';

function LayoutInner() {
  const { dark, setDark } = useMapContext();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Train className="w-5 h-5 text-muted-foreground" />
              <h1 className="text-base font-semibold">CityTracker</h1>
            </div>
            <AppNav />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar panel */}
        <aside className="w-[380px] shrink-0 border-r border-border bg-background z-10 overflow-y-auto">
          <div className="p-4">
            <Outlet />
          </div>
        </aside>

        {/* Map area */}
        <div className="flex-1 relative">
          <AppMap />
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <TooltipProvider>
      <MapProvider>
        <LayoutInner />
      </MapProvider>
    </TooltipProvider>
  );
}
