'use client';

import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechDictation } from '@/lib/useSpeechDictation';

interface DictateButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export default function DictateButton({
  onTranscript,
  className = '',
  size = 'md',
  title = 'Push to dictate (voice-to-text)',
}: DictateButtonProps) {
  const { isListening, isSupported, toggleListening } = useSpeechDictation({
    onTranscript: (transcript) => {
      onTranscript(transcript);
    },
  });

  if (!isSupported) return null;

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleListening();
      }}
      className={`rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 ${sizeClasses} ${
        isListening
          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-400 animate-pulse'
          : 'text-slate-400 hover:text-white hover:bg-white/10 active:scale-95'
      } ${className}`}
      title={isListening ? 'Listening... Speak now (tap to stop)' : title}
      aria-label={isListening ? 'Stop dictation' : title}
    >
      {isListening ? (
        <MicOff className={`${iconSizes} animate-bounce`} />
      ) : (
        <Mic className={iconSizes} />
      )}
    </button>
  );
}
