import React from 'react';
import { THEMES } from '../data/mockData';
import { ThemeKey } from '../types';
import { Check } from 'lucide-react';

interface ThemeSelectorModalProps {
  currentTheme: ThemeKey;
  onSelectTheme: (theme: ThemeKey) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-4 border-pink-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-1.5">
              <span>🎨</span> Choose Your Happy Theme
            </h3>
            <p className="text-xs text-pink-100">14 Lightweight, luxury & battery-friendly color styles</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2.5">
          {THEMES.map((th) => {
            const isSelected = th.id === currentTheme;
            return (
              <button
                key={th.id}
                onClick={() => {
                  onSelectTheme(th.id);
                  onClose();
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all tap-bounce relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-pink-500 bg-pink-50/80 shadow-md ring-2 ring-pink-300'
                    : 'border-gray-200 bg-white hover:border-pink-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-2xl">{th.emoji}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <h4 className="font-bold text-xs text-gray-900">{th.name}</h4>
                  <div className="flex gap-1 text-[10px] mt-1 opacity-70">
                    {th.ambientEmoji.slice(0, 3).map((e, idx) => (
                      <span key={idx}>{e}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
