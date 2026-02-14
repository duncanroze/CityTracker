import { useState, useRef, useEffect, useCallback } from 'react';
import type { Station } from '../types';
import LineBadge from './LineBadge';

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

  const filtered = query.length > 0
    ? stations.filter((s) => normalize(s.name).includes(normalize(query))).slice(0, 8)
    : [];

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

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
          placeholder="Search station..."
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
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-100 shadow-lg max-h-64 overflow-auto"
        >
          {filtered.map((station, i) => (
            <li
              key={station.id}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between gap-2 ${
                i === highlightIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(station)}
            >
              <span className="truncate text-gray-900">{station.name}</span>
              <span className="flex gap-1 shrink-0">
                {station.lines.map((line) => (
                  <LineBadge key={line.code} code={line.code} color={line.color} textColor={line.textColor} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
