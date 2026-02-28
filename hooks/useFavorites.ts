import { useState, useCallback, useEffect } from 'react';

export interface FavoriteRoute {
  id: string;
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  createdAt: number;
}

const STORAGE_KEY = 'citytracker-favorites';
const MAX_FAVORITES = 10;

function loadFavorites(): FavoriteRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteRoute[];
  } catch {
    return [];
  }
}

function saveFavorites(favs: FavoriteRoute[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // localStorage full or unavailable
  }
}

function makeId(from: FavoriteRoute['from'], to: FavoriteRoute['to']): string {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);

  // Load on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const addFavorite = useCallback((from: FavoriteRoute['from'], to: FavoriteRoute['to']) => {
    setFavorites(prev => {
      const id = makeId(from, to);
      if (prev.some(f => f.id === id)) return prev;
      const next = [{ id, from, to, createdAt: Date.now() }, ...prev].slice(0, MAX_FAVORITES);
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((from: FavoriteRoute['from'], to: FavoriteRoute['to']): boolean => {
    const id = makeId(from, to);
    return favorites.some(f => f.id === id);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
