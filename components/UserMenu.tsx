'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import AuthModal from './AuthModal';
import { cn } from '@/lib/utils';

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'login' | 'signup'>('login');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDropdown]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => { setModalTab('signup'); setShowModal(true); }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        >
          Inscription
        </button>
        <button
          onClick={() => { setModalTab('login'); setShowModal(true); }}
          className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        >
          Connexion
        </button>
        {showModal && <AuthModal initialTab={modalTab} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const initial = (user.displayName?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(prev => !prev)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
          'bg-foreground/10 text-foreground hover:bg-foreground/20',
        )}
        aria-label="Menu utilisateur"
      >
        {initial}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-medium truncate">{user.displayName ?? user.email}</p>
            {user.displayName && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
          <div className="p-1">
            <button
              onClick={async () => {
                setShowDropdown(false);
                await logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
