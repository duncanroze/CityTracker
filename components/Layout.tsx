'use client';

import { useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Moon, Sun, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MapProvider, useMapContext } from '@/contexts/MapContext';
import AppNav from '@/components/AppNav';
import MobileDrawer from '@/components/MobileDrawer';

const AppMap = dynamic(() => import('@/components/AppMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-muted animate-pulse" />,
});

function LayoutInner({ children }: { children: ReactNode }) {
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
              <h1 className="text-base font-semibold hidden sm:block">CityTracker</h1>
            </div>
            {/* Desktop nav only — mobile nav is inside the drawer */}
            <div className="hidden md:block">
              <AppNav />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-[380px] shrink-0 border-r border-border bg-background z-10 overflow-y-auto">
          <div className="p-4">
            {children}
          </div>
        </aside>

        {/* Map — always visible */}
        <div className="flex-1 relative">
          <AppMap />
        </div>

        {/* Mobile bottom sheet */}
        <div className="md:hidden">
          <MobileDrawer>
            {children}
          </MobileDrawer>
        </div>
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <MapProvider>
        <LayoutInner>{children}</LayoutInner>
      </MapProvider>
    </TooltipProvider>
  );
}
