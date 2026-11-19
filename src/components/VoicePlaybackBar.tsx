import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { soundService, VoicePlaybackState } from '../services/soundService';

export const VoicePlaybackBar: React.FC = () => {
  const [voiceState, setVoiceState] = useState<VoicePlaybackState>(() =>
    soundService.getVoiceState()
  );

  useEffect(() => {
    return soundService.subscribeVoiceState(setVoiceState);
  }, []);

  if (voiceState.status === 'idle' || !voiceState.text) {
    return null;
  }

  const isPlaying = voiceState.status === 'playing';

  return (
    <div
      role="region"
      aria-label="Voice playback controls"
      className="mx-3 mb-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-200 dark:border-rose-900/60 shadow-lg px-3 py-2 flex items-center justify-between gap-2.5 z-40"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isPlaying
              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide leading-none">
            {isPlaying ? 'Voice Playing' : 'Voice Paused'}
          </p>
          <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate mt-0.5">
            {voiceState.title || voiceState.text}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isPlaying ? (
          <button
            type="button"
            onClick={() => soundService.pauseVoice()}
            aria-label="Pause voice"
            className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 text-rose-600 dark:text-rose-300 flex items-center justify-center tap-bounce"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => soundService.resumeVoice()}
            aria-label="Resume voice"
            className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center tap-bounce"
          >
            <Play className="w-4 h-4 ml-0.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => soundService.stopVoice()}
          aria-label="Stop voice"
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-200 flex items-center justify-center tap-bounce"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    </div>
  );
};
