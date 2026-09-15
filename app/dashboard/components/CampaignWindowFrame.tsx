'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Maximize2, Minimize2, Minus, X, Move } from 'lucide-react';

export interface CampaignWindowFrameProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  defaultWidth?: number;      // e.g. 380 or 420
  doubleWidth?: number;       // e.g. 760 or 820
  minWidth?: number;          // e.g. 320
  minHeight?: number;         // e.g. 260
  accentGradient?: string;    // e.g. 'from-emerald-400 to-teal-400'
  children: (props: { isDoubleSize: boolean; isCustomResized: boolean; width: number }) => React.ReactNode;
}

export default function CampaignWindowFrame({
  title,
  subtitle,
  badge,
  badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  icon,
  onClose,
  defaultWidth = 400,
  doubleWidth = 780,
  minWidth = 320,
  minHeight = 260,
  accentGradient = 'from-emerald-400 via-teal-400 to-cyan-400',
  children,
}: CampaignWindowFrameProps) {
  // Window states
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDoubleSize, setIsDoubleSize] = useState(false);
  
  // Custom resize state (via corner drag)
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);

  // Position state (via titlebar drag)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Calculate current target width
  const currentTargetWidth = customSize ? customSize.width : (isDoubleSize ? doubleWidth : defaultWidth);

  // Reset custom size if double size is toggled
  const handleToggleDoubleSize = useCallback(() => {
    if (isMinimized) setIsMinimized(false);
    setCustomSize(null);
    setIsDoubleSize((prev) => !prev);
  }, [isMinimized]);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // --- TITLEBAR DRAGGING LOGIC ---
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag with primary pointer (left click / touch)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, or window control dots
    if (target.closest('button, a, input, [role="button"]')) return;

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
  }, [position]);

  const handleDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const maxX = typeof window !== 'undefined' ? window.innerWidth / 2 - 40 : 600;
    const maxY = typeof window !== 'undefined' ? window.innerHeight / 2 - 40 : 500;

    const newX = Math.max(-maxX, Math.min(maxX, dragRef.current.initialX + dx));
    const newY = Math.max(-maxY, Math.min(maxY, dragRef.current.initialY + dy));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isDragging]);

  // --- CORNER RESIZING LOGIC ---
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = cardRef.current?.getBoundingClientRect();
    const startW = rect ? rect.width : (customSize?.width || (isDoubleSize ? doubleWidth : defaultWidth));
    const startH = rect ? rect.height : (customSize?.height || 420);

    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW,
      startH,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, [customSize, isDoubleSize, doubleWidth, defaultWidth]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;

    const maxWidth = typeof window !== 'undefined' ? Math.min(1020, window.innerWidth - 32) : 1000;
    const maxHeight = typeof window !== 'undefined' ? Math.min(920, window.innerHeight - 80) : 850;

    const newW = Math.max(minWidth, Math.min(maxWidth, Math.round(resizeRef.current.startW + dx)));
    const newH = Math.max(minHeight, Math.min(maxHeight, Math.round(resizeRef.current.startH + dy)));

    setCustomSize({ width: newW, height: newH });
    if (newW >= doubleWidth - 40) {
      setIsDoubleSize(true);
    } else if (newW <= defaultWidth + 40) {
      setIsDoubleSize(false);
    }
  }, [isResizing, minWidth, minHeight, doubleWidth, defaultWidth]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      resizeRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isResizing]);

  // Esc key closes popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // MINIMIZED PILL VIEW
  if (isMinimized) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 pointer-events-none">
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="pointer-events-auto select-none animate-slide-up"
        >
          <div
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
            className="group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl glass-heavy border border-amber-500/30 shadow-2xl shadow-black/80 cursor-grab active:cursor-grabbing hover:border-amber-400/50 transition-all backdrop-blur-2xl"
            title="CampaignOS Window Minimized • Drag to move • Click to restore"
          >
            {/* Traffic Light Dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 border border-rose-400/40 shadow-sm shadow-rose-500/50 flex items-center justify-center group/dot transition-transform hover:scale-110"
                title="Close Window"
              >
                <X className="w-2 h-2 text-rose-950 font-bold opacity-0 group-hover/dot:opacity-100 transition-opacity" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleMinimize(); }}
                className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-300/40 shadow-sm shadow-amber-400/50 flex items-center justify-center group/dot transition-transform hover:scale-110"
                title="Restore Window"
              >
                <Minus className="w-2 h-2 text-amber-950 font-bold opacity-0 group-hover/dot:opacity-100 transition-opacity" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleDoubleSize(); }}
                className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-300 border border-emerald-300/40 shadow-sm shadow-emerald-400/50 flex items-center justify-center group/dot transition-transform hover:scale-110"
                title="Double Size & Restore"
              >
                <Maximize2 className="w-2 h-2 text-emerald-950 font-bold opacity-0 group-hover/dot:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Minimized Content Preview */}
            <div
              onClick={handleToggleMinimize}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {icon && <span className="text-sm shrink-0">{icon}</span>}
              <div className="min-w-0 max-w-[220px]">
                <span className="font-extrabold text-xs text-white block truncate">{title}</span>
                {subtitle && <span className="text-[10px] text-amber-300/80 block truncate font-medium">{subtitle}</span>}
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                Minimized
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD / DOUBLE / CUSTOM EXPANDED VIEW
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div
        ref={cardRef}
        style={{
          width: currentTargetWidth ? `${Math.min(currentTargetWidth, typeof window !== 'undefined' ? window.innerWidth - 24 : currentTargetWidth)}px` : undefined,
          height: customSize?.height ? `${customSize.height}px` : undefined,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging || isResizing ? 'none' : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="max-w-[96vw] max-h-[88vh] flex flex-col pointer-events-auto select-auto animate-slide-up"
      >
        <div className="glass-heavy rounded-3xl relative overflow-hidden shadow-2xl shadow-black/80 border border-white/15 flex flex-col h-full backdrop-blur-2xl">
          {/* Top Brand Accent Line */}
          <div className={`h-[3px] w-full bg-gradient-to-r ${accentGradient} shrink-0`} />

          {/* CampaignOS Window Header Bar (macOS style traffic lights + drag handle) */}
          <div
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
            onDoubleClick={handleToggleDoubleSize}
            className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-950/40 select-none cursor-grab active:cursor-grabbing shrink-0"
            title="CampaignOS Window • Drag titlebar to move over map • Double-click to toggle Double-Size"
          >
            {/* Traffic Light Window Controls */}
            <div className="flex items-center gap-2 shrink-0 group/dots">
              {/* 🔴 Close Dot */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-400 border border-rose-400/50 shadow-sm shadow-rose-500/60 flex items-center justify-center group/btn transition-transform hover:scale-110 active:scale-95"
                title="Close Window (Esc)"
              >
                <X className="w-2.5 h-2.5 text-rose-950 stroke-[3] opacity-0 group-hover/dots:opacity-100 transition-opacity" />
              </button>

              {/* 🟡 Minimize Dot */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleMinimize(); }}
                className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-300/50 shadow-sm shadow-amber-400/60 flex items-center justify-center group/btn transition-transform hover:scale-110 active:scale-95"
                title="Minimize Window"
              >
                <Minus className="w-2.5 h-2.5 text-amber-950 stroke-[3] opacity-0 group-hover/dots:opacity-100 transition-opacity" />
              </button>

              {/* 🟢 Double Size / Expand Dot */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleDoubleSize(); }}
                className="w-3.5 h-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 border border-emerald-300/50 shadow-sm shadow-emerald-400/60 flex items-center justify-center group/btn transition-transform hover:scale-110 active:scale-95"
                title={isDoubleSize ? 'Restore Standard Size' : 'Double Size (Dual-Column)'}
              >
                {isDoubleSize ? (
                  <Minimize2 className="w-2.5 h-2.5 text-emerald-950 stroke-[3] opacity-0 group-hover/dots:opacity-100 transition-opacity" />
                ) : (
                  <Maximize2 className="w-2.5 h-2.5 text-emerald-950 stroke-[3] opacity-0 group-hover/dots:opacity-100 transition-opacity" />
                )}
              </button>
            </div>

            {/* Center Window Title & Drag Indicator */}
            <div className="flex items-center gap-2 min-w-0 px-2 flex-1 justify-center">
              <Move className="w-3 h-3 text-slate-500 opacity-60 hidden sm:block shrink-0" />
              <div className="text-center min-w-0 truncate">
                <span className="text-xs font-black tracking-wide text-slate-200">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-[10px] text-slate-400 font-mono ml-2 hidden sm:inline truncate">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Right Status Badge / Double-Size indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              {badge && (
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                  {badge}
                </span>
              )}
              <button
                type="button"
                onClick={handleToggleDoubleSize}
                className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-emerald-400 px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/10 border border-white/10 transition-colors"
                title="Toggle Dual-Column Double Size"
              >
                {isDoubleSize ? '1× Standard' : '2× Double'}
              </button>
            </div>
          </div>

          {/* Window Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5">
            {children({
              isDoubleSize,
              isCustomResized: customSize !== null,
              width: currentTargetWidth,
            })}
          </div>

          {/* Bottom Window Footer & Interactive Corner Resize Grip */}
          <div className="relative border-t border-white/5 px-4 py-1.5 bg-slate-950/30 flex items-center justify-between text-[10px] text-slate-500 select-none shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-slate-400">CampaignOS v2</span>
              <span className="text-slate-600">•</span>
              <span className="text-[9px] text-slate-500 hidden sm:inline">Drag header to move • Pull corner to resize</span>
            </div>

            {/* Corner Resize Grip */}
            <div
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              className="absolute bottom-0 right-0 w-6 h-6 flex items-end justify-end p-1 cursor-nwse-resize hover:opacity-100 opacity-60 transition-opacity touch-none group/grip"
              title="Pull corner to stretch window width & height"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" className="fill-slate-400 group-hover/grip:fill-emerald-400 transition-colors">
                <circle cx="10" cy="10" r="1.2" />
                <circle cx="6" cy="10" r="1.2" />
                <circle cx="10" cy="6" r="1.2" />
                <circle cx="2" cy="10" r="1.2" />
                <circle cx="6" cy="6" r="1.2" />
                <circle cx="10" cy="2" r="1.2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
