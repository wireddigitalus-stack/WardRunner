'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Check } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  highlightColor?: 'emerald' | 'cyan' | 'teal' | 'purple' | 'amber' | 'rose';
  accentColor?: 'emerald' | 'cyan' | 'teal' | 'purple' | 'amber' | 'rose';
}

interface TacticalOnboardingTourProps {
  tourKey: string;
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  forceCentered?: boolean;
}

export default function TacticalOnboardingTour({
  tourKey,
  steps,
  isOpen,
  onClose,
  forceCentered = false,
}: TacticalOnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  // Sound chime helper
  const playStepTone = useCallback((toneType: 'step' | 'complete') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = toneType === 'complete' ? 880 : 587.33;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (toneType === 'complete') {
        osc.frequency.setValueAtTime(1174.66, now + 0.12);
      }

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (toneType === 'complete' ? 0.45 : 0.25));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (toneType === 'complete' ? 0.45 : 0.25));
    } catch {
      // safe ignore
    }
  }, []);

  // Update target bounding box
  const updateRect = useCallback(() => {
    if (!isOpen || !step) {
      setTargetRect(null);
      return;
    }

    const ids = step.targetId.split(',').map((s) => s.trim());
    let el: HTMLElement | null = null;
    for (const id of ids) {
      const found = document.getElementById(id);
      if (found && (found.offsetParent !== null || found.getBoundingClientRect().width > 0)) {
        el = found;
        break;
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      setTargetRect(r);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    updateRect();
    const timer = setTimeout(updateRect, 200);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLast) handleNext();
        else handleFinish();
      } else if (e.key === 'ArrowLeft') {
        if (!isFirst) handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLast, isFirst, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      playStepTone('step');
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      playStepTone('step');
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem(tourKey, 'completed');
    } catch {}
    playStepTone('complete');
    onClose();
    // Reset index for next time user clicks tour
    setTimeout(() => setCurrentStepIndex(0), 300);
  };

  if (!isOpen || !step) return null;

  // Color schemes
  const colorMap = {
    emerald: {
      ring: 'ring-emerald-400',
      border: 'border-emerald-500/50',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      btn: 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950',
    },
    cyan: {
      ring: 'ring-cyan-400',
      border: 'border-cyan-500/50',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      btn: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950',
    },
    teal: {
      ring: 'ring-teal-400',
      border: 'border-teal-500/50',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      btn: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950',
    },
    purple: {
      ring: 'ring-purple-400',
      border: 'border-purple-500/50',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      btn: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
    },
    amber: {
      ring: 'ring-amber-400',
      border: 'border-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      btn: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950',
    },
    rose: {
      ring: 'ring-rose-400',
      border: 'border-rose-500/50',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      btn: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white',
    },
  };

  const activeColor = colorMap[step.highlightColor || step.accentColor || 'emerald'];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto select-none">
      {/* 1. Transparent Cutout Mask with Gentle Vignette (Zero Blur, Zero Opacity over Target) */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={handleFinish}
      >
        <defs>
          <mask id={`tour-mask-${tourKey}`}>
            {/* White covers the screen with backdrop */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cutout punches a 100% transparent clear aperture over the button */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={16}
                ry={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Lighter, crisp 45% black tint without any blur filter so surrounding UI is readable */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.45)"
          mask={`url(#tour-mask-${tourKey})`}
        />
      </svg>

      {/* 2. Spotlight Aperture Ring (Vibrant glowing frame around the crystal-clear button) */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className={`rounded-2xl pointer-events-none transition-all duration-300 ring-4 ${activeColor.ring} shadow-[0_0_35px_rgba(255,255,255,0.35)] animate-pulse`}
        />
      )}

      {/* 3. Floating Briefing Tooltip Card - Always dead center for rock-solid stability */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center p-4 z-50">
        <div
          className={`w-full max-w-[420px] bg-slate-950/95 backdrop-blur-md border-2 ${activeColor.border} rounded-3xl p-5 sm:p-6 shadow-2xl pointer-events-auto animate-scale-in flex flex-col justify-between`}
        >
          {/* Header & Step Counter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${activeColor.badge}`}>
                  {step.badge || `STEP ${currentStepIndex + 1} OF ${steps.length}`}
                </span>
                <span className="text-xs text-slate-400 font-bold">Mission Briefing</span>
              </div>
              <button
                type="button"
                onClick={handleFinish}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Skip tour"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Icon */}
            <div className="flex items-start gap-3 mt-1">
              {step.icon && (
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  {step.icon}
                </div>
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight uppercase tracking-tight">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Indicators & Navigation Controls */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
            {/* Step Indicators: Compact Dots if <= 6, sleek progress bar if > 6 to prevent wrapping */}
            {steps.length <= 6 ? (
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      playStepTone('step');
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStepIndex
                        ? 'w-6 bg-emerald-400'
                        : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1 min-w-[90px]">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono">
                  <span>Step {currentStepIndex + 1}/{steps.length}</span>
                  <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
                </div>
                <div className="w-24 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={isLast ? handleFinish : handleNext}
                className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition ${activeColor.btn}`}
              >
                {isLast ? (
                  <>
                    <span>GOT IT ✓</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </>
                ) : (
                  <>
                    <span>NEXT</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
