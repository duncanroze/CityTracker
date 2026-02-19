'use client';

import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { X, MapPin, Train as TrainIcon } from 'lucide-react';
import type { Station, PickerSelection } from '@/types';
import LineBadge from './LineBadge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGeocode } from '@/hooks/useGeocode';
import type { GeocodeResult } from '@/types';

interface PickerItem {
  type: 'station' | 'address';
  station?: Station;
  geocode?: GeocodeResult;
}

interface StationPickerProps {
  label: string;
  stations: Station[];
  selected: PickerSelection | null;
  onSelect: (selection: PickerSelection | null) => void;
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function shortAddress(address: string): string {
  const parts = address.split(',');
  // Nominatim format: "12, Rue de Rivoli, Paris, ..." — combine number + street
  if (parts.length >= 2 && /^\d+\s*$/.test(parts[0])) {
    return `${parts[0].trim()} ${parts[1].trim()}`;
  }
  return parts[0].trim();
}

export default function StationPicker({ label, stations, selected, onSelect }: StationPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const { results: geocodeResults, loading: geocodeLoading, search: geocodeSearch, clear: geocodeClear } = useGeocode();

  // Station name matches (instant, local)
  const stationMatches = useMemo(
    () =>
      query.length > 0
        ? stations.filter((s) => normalize(s.name).includes(normalize(query))).slice(0, 5)
        : [],
    [query, stations],
  );

  // Address matches from geocode
  const addressItems: PickerItem[] = useMemo(
    () => geocodeResults.map((gr) => ({ type: 'address' as const, geocode: gr })),
    [geocodeResults],
  );

  // Unified list: stations first, then addresses
  const allItems: PickerItem[] = useMemo(() => {
    const items: PickerItem[] = stationMatches.map((s) => ({ type: 'station', station: s }));
    return [...items, ...addressItems];
  }, [stationMatches, addressItems]);

  const showListbox = isOpen && (allItems.length > 0 || geocodeLoading);

  // Trigger geocode search when query changes
  useEffect(() => {
    if (query.length >= 3 && !selected) {
      geocodeSearch(query);
    } else {
      geocodeClear();
    }
  }, [query, selected, geocodeSearch, geocodeClear]);

  const handleSelect = useCallback(
    (item: PickerItem) => {
      if (item.type === 'station' && item.station) {
        onSelect({ type: 'station', station: item.station });
        setQuery(item.station.name);
      } else if (item.type === 'address' && item.geocode) {
        onSelect({
          type: 'address',
          address: item.geocode.address,
          lat: item.geocode.lat,
          lng: item.geocode.lng,
        });
        setQuery(shortAddress(item.geocode.address));
      }
      setIsOpen(false);
      geocodeClear();
    },
    [onSelect, geocodeClear],
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery('');
    setIsOpen(false);
    geocodeClear();
    inputRef.current?.focus();
  }, [onSelect, geocodeClear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || allItems.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, allItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[highlightIndex]) handleSelect(allItems[highlightIndex]);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, allItems, highlightIndex, handleSelect],
  );

  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = selected
    ? selected.type === 'station'
      ? selected.station.name
      : shortAddress(selected.address)
    : query;

  const activeDescendantId = showListbox ? `${listboxId}-option-${highlightIndex}` : undefined;
  const stationCount = stationMatches.length;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Station ou adresse..."
          value={displayValue}
          onChange={(e) => {
            if (selected) onSelect(null);
            setQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
            setHighlightIndex(0);
          }}
          onFocus={() => {
            if (!selected && query.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showListbox}
          aria-controls={showListbox ? listboxId : undefined}
          aria-activedescendant={activeDescendantId}
          className="pr-8"
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la sélection"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showListbox && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border border-border shadow-md max-h-64 overflow-auto"
        >
          {/* Station section */}
          {stationCount > 0 && (
            <li className="px-3 py-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wide" role="presentation">
              <TrainIcon className="w-3 h-3" /> Stations
            </li>
          )}
          {allItems.slice(0, stationCount).map((item, i) => (
            <li
              key={`s-${item.station!.id}`}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
              className={cn(
                'px-3 py-2 cursor-pointer text-sm flex items-center justify-between gap-2 transition-colors',
                i === highlightIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              <span className="truncate">{item.station!.name}</span>
              <span className="flex gap-1 shrink-0">
                {item.station!.lines.map((line) => (
                  <LineBadge key={line.code} code={line.code} color={line.color} textColor={line.textColor} size="sm" />
                ))}
              </span>
            </li>
          ))}

          {/* Address section */}
          {addressItems.length > 0 && (
            <li
              className={cn(
                'px-3 py-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wide',
                stationCount > 0 && 'border-t border-border mt-1 pt-1.5',
              )}
              role="presentation"
            >
              <MapPin className="w-3 h-3" /> Adresses
            </li>
          )}
          {allItems.slice(stationCount).map((item, idx) => {
            const globalIdx = stationCount + idx;
            return (
              <li
                key={`a-${globalIdx}-${item.geocode!.lat}`}
                id={`${listboxId}-option-${globalIdx}`}
                role="option"
                aria-selected={globalIdx === highlightIndex}
                className={cn(
                  'px-3 py-2 cursor-pointer text-sm transition-colors',
                  globalIdx === highlightIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                )}
                onMouseEnter={() => setHighlightIndex(globalIdx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{shortAddress(item.geocode!.address)}</span>
                </div>
                <div className="text-xs text-muted-foreground ml-6 mt-0.5 truncate">
                  {item.geocode!.address}
                </div>
              </li>
            );
          })}

          {/* Loading indicator */}
          {geocodeLoading && (
            <li className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2" role="presentation">
              <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              Recherche d&apos;adresses...
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
