'use client';

import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Station } from '@/types';
import LineBadge from './LineBadge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface StationPickerProps {
  label: string;
  stations: Station[];
  selected: Station | null;
  onSelect: (station: Station | null) => void;
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function StationPicker({ label, stations, selected, onSelect }: StationPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const filtered = useMemo(
    () => query.length > 0
      ? stations.filter((s) => normalize(s.name).includes(normalize(query))).slice(0, 8)
      : [],
    [query, stations],
  );

  const showListbox = isOpen && filtered.length > 0;

  const handleSelect = useCallback((station: Station) => {
    onSelect(station);
    setQuery(station.name);
    setIsOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) handleSelect(filtered[highlightIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filtered, highlightIndex, handleSelect]);

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

  const activeDescendantId = showListbox ? `${listboxId}-option-${highlightIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Rechercher une station..."
          value={selected ? selected.name : query}
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
          {filtered.map((station, i) => (
            <li
              key={station.id}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
              className={cn(
                'px-3 py-2 cursor-pointer text-sm flex items-center justify-between gap-2 transition-colors',
                i === highlightIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(station)}
            >
              <span className="truncate">{station.name}</span>
              <span className="flex gap-1 shrink-0">
                {station.lines.map((line) => (
                  <LineBadge key={line.code} code={line.code} color={line.color} textColor={line.textColor} size="sm" />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
