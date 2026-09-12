'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDraggableOptions {
  disabled?: boolean;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (options.disabled) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, inputs, or interactive controls
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;

    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, [options.disabled, position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const maxX = typeof window !== 'undefined' ? window.innerWidth / 2 - 40 : 500;
    const maxY = typeof window !== 'undefined' ? window.innerHeight / 2 - 40 : 500;

    const newX = Math.max(-maxX, Math.min(maxX, dragRef.current.initialX + dx));
    const newY = Math.max(-maxY, Math.min(maxY, dragRef.current.initialY + dy));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isDragging]);

  return {
    position,
    isDragging,
    resetPosition,
    dragProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
    style: {
      transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: isDragging ? 'transform' : 'auto',
    },
  };
}
