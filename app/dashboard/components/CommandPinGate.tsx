'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Lock, ArrowLeft, Check, AlertCircle, Sparkles } from 'lucide-react';

interface CommandPinGateProps {
  onUnlock: () => void;
  masterPin?: string;
}

export default function CommandPinGate({ onUnlock, masterPin = '620620' }: CommandPinGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = useCallback((enteredPin: string) => {
    setError(null);
    const clean = enteredPin.trim();

    // Check master pin
    const customMaster = typeof window !== 'undefined' ? localStorage.getItem('wardrunner_campaign_pin') : null;
    let isMatched = clean === masterPin || clean === '620620' || (customMaster && clean === customMaster);

    // Also check volunteer roster for authorized leadership pins
    if (!isMatched && typeof window !== 'undefined') {
      try {
        const rawVols = localStorage.getItem('wardrunner_volunteers');
        if (rawVols) {
          const vols = JSON.parse(rawVols);
          const authorized = vols.find((v: any) => v.active && v.pin === clean && (v.role === 'Field Director' || v.role === 'Precinct Captain'));
          if (authorized) isMatched = true;
        }
      } catch {
        // ignore
      }
    }

    if (isMatched) {
      setIsSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('wardrunner_field_command_auth', 'true');
        localStorage.setItem('wardrunner_field_command_auth', 'true');
      }
      setTimeout(() => {
        onUnlock();
      }, 450);
    } else {
      setShake(true);
      setError('Incorrect Master PIN. Access restricted to Field Command.');
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 600);
    }
  }, [masterPin, onUnlock]);

  const handleDigit = (digit: string) => {
    if (isSuccess) return;
    setError(null);
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        handleVerify(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isSuccess) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSuccess) return;
    setError(null);
    setPin('');
  };

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length > 0) {
          handleVerify(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, handleVerify]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 text-white select-none">
      {/* Background Ambient Glows */}
      <div className="absolute w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className={`w-full max-w-sm mx-auto flex flex-col items-center text-center transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}>
        
        {/* Header Icon Badge */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/40 flex items-center justify-center shadow-xl shadow-blue-500/10">
            {isSuccess ? (
              <Check className="w-8 h-8 text-emerald-400 stroke-[3] animate-bounce" />
            ) : (
              <Lock className="w-8 h-8 text-blue-400" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-blue-400/40 flex items-center justify-center text-blue-300 text-xs">
            <Shield className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Titles */}
        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Field Command Headquarters
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Security Gate
          </h1>
          <p className="text-xs text-slate-400 max-w-xs">
            Enter the 6-digit Master PIN to unlock Field Command operations for <strong className="text-slate-200">Bristol TN</strong>.
          </p>
        </div>

        {/* 6-Digit PIN Indicators */}
        <div className="flex items-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const hasDigit = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isSuccess
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 scale-110'
                    : hasDigit
                    ? 'bg-blue-400 shadow-md shadow-blue-400/50 scale-105'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Message */}
        <div className="h-6 mb-3 flex items-center justify-center">
          {error ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : isSuccess ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-fade-in">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Master Access Granted · Initializing...</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono tracking-wider">
              {pin.length > 0 ? `${pin.length} of 6 digits entered` : 'Type or tap PIN below'}
            </span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:bg-slate-800 active:scale-95 text-xl font-bold text-white transition flex items-center justify-center shadow-md hover:border-slate-700"
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/50 border border-slate-800/70 hover:bg-slate-800 text-xs font-bold text-slate-400 active:scale-95 transition flex items-center justify-center uppercase tracking-wider"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:bg-slate-800 active:scale-95 text-xl font-bold text-white transition flex items-center justify-center shadow-md hover:border-slate-700"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/50 border border-slate-800/70 hover:bg-slate-800 text-xs font-bold text-slate-400 active:scale-95 transition flex items-center justify-center uppercase tracking-wider"
          >
            Delete
          </button>
        </div>

        {/* Master Pin Hint & Return Home */}
        <div className="w-full flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <span className="text-[11px] text-slate-500 font-mono">
            Master PIN: 620620
          </span>
        </div>

      </div>
    </div>
  );
}
