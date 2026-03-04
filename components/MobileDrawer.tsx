'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { useMapContext } from '@/contexts/MapContext';
import AppNav from '@/components/AppNav';

interface MobileDrawerProps {
  children: ReactNode;
}

const SNAP_FRACTIONS = [0.08, 0.5, 0.92];
const DEFAULT_SNAP = 1; // index → 0.5

export default function MobileDrawer({ children }: MobileDrawerProps) {
  const [snapIdx, setSnapIdx] = useState(DEFAULT_SNAP);
  const [translateY, setTranslateY] = useState(0); // px offset during drag
  const dragging = useRef(false);
  const startY = useRef(0);
  const translateYRef = useRef(0); // ref for stale-closure-safe reads in onPointerUp
  const { drawerSnap, setDrawerSnap } = useMapContext();

  // Consume external drawer snap commands (e.g. auto-expand on route results)
  useEffect(() => {
    if (drawerSnap !== null) {
      setSnapIdx(drawerSnap);
      setDrawerSnap(null);
    }
  }, [drawerSnap, setDrawerSnap]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    startY.current = e.clientY;
    translateYRef.current = 0;
    setTranslateY(0);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    translateYRef.current = dy;
    setTranslateY(dy);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const vh = window.innerHeight;
    const currentSnapH = SNAP_FRACTIONS[snapIdx] * vh;
    const draggedH = currentSnapH - translateYRef.current;

    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < SNAP_FRACTIONS.length; i++) {
      const dist = Math.abs(draggedH - SNAP_FRACTIONS[i] * vh);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }

    setSnapIdx(nearest);
    setTranslateY(0);
    translateYRef.current = 0;
  }, [snapIdx]);

  // Prevent body scroll when expanded
  useEffect(() => {
    if (snapIdx >= 2) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [snapIdx]);

  // CSS height: snap fraction as dvh, translate for drag offset
  const snapDvh = `${SNAP_FRACTIONS[snapIdx] * 100}dvh`;
  const isBeingDragged = translateY !== 0;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border-t border-border bg-background',
        'shadow-[0_-2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.3)]',
        !isBeingDragged && 'transition-[height] duration-300 ease-out',
      )}
      style={{
        height: isBeingDragged ? `calc(${snapDvh} - ${translateY}px)` : snapDvh,
        maxHeight: '92dvh',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Redimensionner le panneau"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={snapIdx}
        tabIndex={0}
      >
        <div className="h-1.5 w-[60px] rounded-full bg-muted-foreground/25" />
      </div>

      {/* Navigation tabs */}
      <nav className="px-4 pb-2 shrink-0">
        <AppNav showLabels />
      </nav>

      {/* Content */}
      <div className={cn(
        'flex-1 min-h-0 overflow-y-auto px-4 pb-4',
        snapIdx === 0 && 'overflow-hidden',
      )} style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {children}
      </div>
    </div>
  );
}
