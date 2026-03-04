// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFavorites } from '../useFavorites';
import type { FavoriteRoute } from '../useFavorites';

// Mock useAuth to return anonymous user (no account)
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const STORAGE_KEY = 'citytracker-favorites';

function makeLocation(lat: number, lng: number, label: string) {
  return { lat, lng, label };
}

const fromA = makeLocation(48.8566, 2.3522, 'Chatelet');
const toA = makeLocation(48.8738, 2.2950, 'Charles de Gaulle Etoile');
const fromB = makeLocation(48.8443, 2.3743, 'Gare de Lyon');
const toB = makeLocation(48.8809, 2.3553, 'Gare du Nord');

describe('useFavorites (anonymous / localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('adds a favorite', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].from.label).toBe('Chatelet');
    expect(result.current.favorites[0].to.label).toBe('Charles de Gaulle Etoile');
  });

  it('does not add duplicate (same coordinates)', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
    });
    act(() => {
      result.current.addFavorite(fromA, toA);
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it('removes a favorite by id', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
    });
    const id = result.current.favorites[0].id;

    act(() => {
      result.current.removeFavorite(id);
    });

    expect(result.current.favorites).toHaveLength(0);
  });

  it('isFavorite returns true for existing favorite', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
    });

    expect(result.current.isFavorite(fromA, toA)).toBe(true);
  });

  it('isFavorite returns false for non-existing favorite', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite(fromA, toA)).toBe(false);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as FavoriteRoute[];
    expect(stored).toHaveLength(1);
    expect(stored[0].from.label).toBe('Chatelet');
  });

  it('loads from localStorage on mount', async () => {
    // Pre-populate localStorage
    const favorites: FavoriteRoute[] = [{
      id: '48.8566,2.3522->48.8738,2.2950',
      from: fromA,
      to: toA,
      createdAt: Date.now(),
    }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => {
      expect(result.current.favorites).toHaveLength(1);
    });
  });

  it('enforces maximum of 10 favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.addFavorite(
          makeLocation(48 + i * 0.01, 2 + i * 0.01, `From ${i}`),
          makeLocation(49 + i * 0.01, 3 + i * 0.01, `To ${i}`),
        );
      }
    });

    expect(result.current.favorites.length).toBeLessThanOrEqual(10);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('generates ID using 4 decimal places', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(
        makeLocation(48.85661234, 2.35221234, 'Precise'),
        makeLocation(48.87381234, 2.29501234, 'Also Precise'),
      );
    });

    const id = result.current.favorites[0].id;
    expect(id).toBe('48.8566,2.3522->48.8738,2.2950');
  });

  it('can manage multiple favorites independently', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite(fromA, toA);
      result.current.addFavorite(fromB, toB);
    });

    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.isFavorite(fromA, toA)).toBe(true);
    expect(result.current.isFavorite(fromB, toB)).toBe(true);

    // Remove first one
    const idA = result.current.favorites.find(f => f.from.label === 'Chatelet')!.id;
    act(() => {
      result.current.removeFavorite(idA);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.isFavorite(fromA, toA)).toBe(false);
    expect(result.current.isFavorite(fromB, toB)).toBe(true);
  });
});
