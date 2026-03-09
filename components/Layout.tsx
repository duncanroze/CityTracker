'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MapProvider, useMapContext } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import AppNav from '@/components/AppNav';
import MobileDrawer from '@/components/MobileDrawer';
import UserMenu from '@/components/UserMenu';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767.98px)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial value from browser API
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function Logo() {
  return (
    <div className="flex items-center">
      {/* Mobile: icon only — colors via CSS vars so they follow the .dark class instantly */}
      <svg className="sm:hidden w-8 h-8" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="logoGradM" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--logo-grad0)" /><stop offset="1" stopColor="var(--logo-grad1)" />
          </linearGradient>
          <clipPath id="pinClipM">
            <path d="M24 0C14 0 6 8 6 18C6 30 24 44 24 44C24 44 42 30 42 18C42 8 34 0 24 0Z" />
          </clipPath>
        </defs>
        <g transform="translate(4,2)">
          <path d="M24 0C14 0 6 8 6 18C6 30 24 44 24 44C24 44 42 30 42 18C42 8 34 0 24 0Z" fill="url(#logoGradM)" />
          <g clipPath="url(#pinClipM)">
            <path d="M30 12 A 8 8 0 1 0 30 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <line x1="12" y1="32" x2="36" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="36" x2="32" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx="38" cy="10" r="5" fill="#ef4444" stroke="var(--logo-dot-stroke)" strokeWidth="2" />
        </g>
      </svg>
      {/* Desktop: full logo with text */}
      <svg className="hidden sm:block h-11" viewBox="0 0 230 56" fill="none" aria-label="CityTracker">
        <defs>
          <linearGradient id="logoGradD" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--logo-grad0)" /><stop offset="1" stopColor="var(--logo-grad1)" />
          </linearGradient>
          <clipPath id="pinClipD">
            <path d="M24 0C14 0 6 8 6 18C6 30 24 44 24 44C24 44 42 30 42 18C42 8 34 0 24 0Z" />
          </clipPath>
        </defs>
        <g transform="translate(4,4)">
          <path d="M24 0C14 0 6 8 6 18C6 30 24 44 24 44C24 44 42 30 42 18C42 8 34 0 24 0Z" fill="url(#logoGradD)" />
          <g clipPath="url(#pinClipD)">
            <path d="M30 12 A 8 8 0 1 0 30 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <line x1="12" y1="32" x2="36" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="36" x2="32" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx="38" cy="10" r="5" fill="#ef4444" stroke="var(--logo-dot-stroke)" strokeWidth="2" />
        </g>
        <text x="62" y="28" dominantBaseline="central" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="24" fontWeight="600" fill="var(--logo-text)">
          City<tspan fill="var(--logo-accent)">Tracker</tspan>
        </text>
      </svg>
    </div>
  );
}

const AppMap = dynamic(() => import('@/components/AppMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-muted animate-pulse" />,
});

function LayoutInner({ children }: { children: ReactNode }) {
  const { dark, setDark } = useMapContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const syncedRef = useRef(false);

  // Sync theme from server only on new device (no localStorage preference)
  useEffect(() => {
    if (user && !syncedRef.current) {
      syncedRef.current = true;
      const hasLocalPref = localStorage.getItem('theme') !== null;
      if (!hasLocalPref) {
        setDark(user.theme === 'dark');
        localStorage.setItem('theme', user.theme);
      }
    }
    if (!user) syncedRef.current = false;
  }, [user, setDark]);

  // Apply dark class + persist to localStorage (skip first render to avoid
  // overwriting the real preference with the SSR default before MapContext reads it)
  const themeInitRef = useRef(false);
  useEffect(() => {
    if (themeInitRef.current) {
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } else {
      themeInitRef.current = true;
    }
  }, [dark]);

  // Save to server on toggle (skip initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!user) return;
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: dark ? 'dark' : 'light' }),
      keepalive: true,
    }).catch(() => {});
  }, [dark, user]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            {/* Desktop nav only — mobile nav is inside the drawer */}
            <div className="hidden md:block">
              <AppNav />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDark(!dark)}
              aria-label="Basculer le thème"
            >
              <Sun className="w-4 h-4 hidden dark:block" />
              <Moon className="w-4 h-4 dark:hidden" />
            </Button>
            <UserMenu />
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

        {/* Map — always visible, z-[1] so the mobile drawer (z-50) stacks above */}
        <div className="flex-1 relative z-[1]">
          <AppMap />
        </div>

        {/* Mobile bottom sheet — only rendered on mobile to prevent portal leaking on desktop */}
        {isMobile && (
          <MobileDrawer>
            {children}
          </MobileDrawer>
        )}
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
