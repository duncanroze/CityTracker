'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface FavoriteRoute {
  id: string;
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  createdAt: number;
}

const STORAGE_KEY = 'citytracker-favorites';
const MAX_FAVORITES = 10;

// ─── localStorage helpers ──────────────────────────────
function loadLocal(): FavoriteRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteRoute[];
  } catch {
    return [];
  }
}

function saveLocal(favs: FavoriteRoute[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // localStorage full or unavailable
  }
}

function clearLocal() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function makeId(from: FavoriteRoute['from'], to: FavoriteRoute['to']): string {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
}

// ─── API helpers ───────────────────────────────────────
async function fetchApiFavorites(): Promise<FavoriteRoute[]> {
  const res = await fetch('/api/favorites');
  if (!res.ok) return [];
  const data = await res.json();
  return data.favorites ?? [];
}

async function postApiFavorite(from: FavoriteRoute['from'], to: FavoriteRoute['to']): Promise<FavoriteRoute | null> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.favorite ?? null;
}

async function deleteApiFavorite(id: string): Promise<boolean> {
  const res = await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
  return res.ok;
}

// ─── Hook ──────────────────────────────────────────────
export function useFavorites() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const UNSET = '__unset__';
  const prevUserId = useRef<string>(UNSET);

  // React to auth state changes
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? '';

    // Skip if user hasn't changed (but always run on first load)
    if (prevUserId.current !== UNSET && currentUserId === prevUserId.current) return;
    prevUserId.current = currentUserId;

    if (!currentUserId) {
      // Logged out or anonymous → load from localStorage
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage
      setFavorites(loadLocal());
      return;
    }

    // User just logged in → merge localStorage favorites into DB, then load from DB
    (async () => {
      const localFavs = loadLocal();

      // Merge local favorites into DB (ignore errors for duplicates)
      if (localFavs.length > 0) {
        await Promise.all(localFavs.map(f => postApiFavorite(f.from, f.to)));
        clearLocal();
      }

      // Load favorites from DB
      const dbFavs = await fetchApiFavorites();
      setFavorites(dbFavs);
    })();
  }, [user, authLoading]);

  const addFavorite = useCallback((from: FavoriteRoute['from'], to: FavoriteRoute['to']) => {
    if (prevUserId.current && prevUserId.current !== UNSET) {
      // Logged in → API
      postApiFavorite(from, to).then(fav => {
        if (fav) {
          setFavorites(prev => {
            if (prev.some(f => f.id === fav.id)) return prev;
            return [fav, ...prev].slice(0, MAX_FAVORITES);
          });
        }
      });
    } else {
      // Anonymous → localStorage
      setFavorites(prev => {
        const id = makeId(from, to);
        if (prev.some(f => f.id === id)) return prev;
        const next = [{ id, from, to, createdAt: Date.now() }, ...prev].slice(0, MAX_FAVORITES);
        saveLocal(next);
        return next;
      });
    }
  }, []);

  const removeFavorite = useCallback((id: string) => {
    if (prevUserId.current && prevUserId.current !== UNSET) {
      // Logged in → API
      deleteApiFavorite(id).then(ok => {
        if (ok) {
          setFavorites(prev => prev.filter(f => f.id !== id));
        }
      });
    } else {
      // Anonymous → localStorage
      setFavorites(prev => {
        const next = prev.filter(f => f.id !== id);
        saveLocal(next);
        return next;
      });
    }
  }, []);

  const isFavorite = useCallback((from: FavoriteRoute['from'], to: FavoriteRoute['to']): boolean => {
    const id = makeId(from, to);
    // For DB-backed favorites, id is a cuid, so also compare by coordinates
    return favorites.some(f =>
      f.id === id ||
      (f.from.lat.toFixed(4) === from.lat.toFixed(4) &&
       f.from.lng.toFixed(4) === from.lng.toFixed(4) &&
       f.to.lat.toFixed(4) === to.lat.toFixed(4) &&
       f.to.lng.toFixed(4) === to.lng.toFixed(4))
    );
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
