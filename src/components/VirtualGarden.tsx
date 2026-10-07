import React, { useState } from 'react';
import { Droplet, Sun, Sparkles, Plus, Flower2, Heart } from 'lucide-react';
import { GardenPlant } from '../types';

interface VirtualGardenProps {
  onClose: () => void;
  seniorMode: boolean;
}

const AVAILABLE_SEEDS = [
  { type: 'Rose', emoji: '🌹', cost: 'Free Daily' },
  { type: 'Sunflower', emoji: '🌻', cost: 'Free Daily' },
  { type: 'Tulip', emoji: '🌷', cost: 'Free Daily' },
  { type: 'Lavender', emoji: '🪻', cost: 'Free Daily' },
  { type: 'Apple Tree', emoji: '🌳', cost: 'Free Daily' },
] as const;

export const VirtualGarden: React.FC<VirtualGardenProps> = ({ onClose, seniorMode }) => {
  const [plots, setPlots] = useState<GardenPlant[]>([
    { id: 1, seedType: 'Sunflower', emoji: '🌻', growthStage: 2, waterCount: 3, unlockedAt: '2 days ago' },
    { id: 2, seedType: 'Rose', emoji: '🌹', growthStage: 2, waterCount: 4, unlockedAt: 'Yesterday' },
    { id: 3, seedType: 'Tulip', emoji: '🌷', growthStage: 1, waterCount: 1, unlockedAt: 'Today' },
    { id: 4, seedType: 'Lavender', emoji: '🪻', growthStage: 0, waterCount: 0, unlockedAt: 'Just now' },
  ]);

  const [waterCan, setWaterCan] = useState(5);
  const [decorations, setDecorations] = useState(['🏡 Cute Cottage', '🌉 Wooden Bridge', '🌈 Morning Rainbow', '🦋 Blue Butterfly']);
  const [showSeedPicker, setShowSeedPicker] = useState(false);

  const waterPlant = (id: number) => {
    if (waterCan <= 0) return;
    setPlots((prev) =>
      prev.map((plant) => {
        if (plant.id === id) {
          const nextStage = Math.min(2, plant.growthStage + (plant.waterCount >= 1 ? 1 : 0));
          return {
            ...plant,
            waterCount: plant.waterCount + 1,
            growthStage: nextStage,
          };
        }
        return plant;
      })
    );
    setWaterCan((w) => Math.max(0, w - 1));
  };

  const plantNewSeed = (seedType: 'Rose' | 'Sunflower' | 'Tulip' | 'Lavender' | 'Apple Tree') => {
    if (plots.length >= 8) return;
    const emojiMap: Record<string, string> = {
      Rose: '🌹',
      Sunflower: '🌻',
      Tulip: '🌷',
      Lavender: '🪻',
      'Apple Tree': '🌳',
    };
    const newPlant: GardenPlant = {
      id: Date.now(),
      seedType,
      emoji: emojiMap[seedType] || '🌱',
      growthStage: 0,
      waterCount: 0,
      unlockedAt: 'Just now',
    };
    setPlots([...plots, newPlant]);
    setShowSeedPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-emerald-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌸</span>
            <div>
              <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                Joy Virtual Garden
              </h2>
              <p className="text-xs text-emerald-100">100% Free cosmetic haven • Relax & grow flowers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Garden Landscape View */}
        <div className="relative bg-gradient-to-b from-sky-200 via-emerald-100 to-emerald-300 p-4 min-h-[170px] border-b-2 border-emerald-300 overflow-hidden flex flex-col justify-between">
          {/* Sky & Clouds & Rainbow */}
          <div className="flex justify-between items-start">
            <div className="text-2xl animate-float">🌈 ☁️</div>
            <div className="text-xs bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-emerald-800 font-bold shadow-sm flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Sunny Bloom
            </div>
            <div className="text-2xl animate-float delay-1000">☁️ 🎈 🐥</div>
          </div>

          {/* Floating butterflies & scenery */}
          <div className="flex justify-around items-end text-3xl">
            <span className="animate-bounce">🦋</span>
            <span className="text-4xl">🏡</span>
            <span className="animate-pulse">🐝</span>
            <span className="text-3xl">🌉</span>
            <span className="text-3xl">🌳</span>
            <span className="text-2xl">🚗</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <Droplet className="w-4 h-4 text-cyan-600 fill-cyan-500" />
            <span>Water Can: {waterCan} drops</span>
          </div>
          <button
            onClick={() => setWaterCan(5)}
            className="px-2 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-md font-semibold text-[11px]"
          >
            Refill Stream 🌊
          </button>
        </div>

        {/* Garden Plots Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm">Your Flower Bed ({plots.length}/8 Plots)</h3>
            {plots.length < 8 && (
              <button
                onClick={() => setShowSeedPicker(true)}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 tap-bounce"
              >
                <Plus className="w-3.5 h-3.5" /> Plant Seed
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {plots.map((plant) => (
              <div
                key={plant.id}
                className="bg-gradient-to-b from-white to-emerald-50/50 border-2 border-emerald-200 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-between relative"
              >
                <span className="text-[10px] text-gray-400 self-start">{plant.unlockedAt}</span>

                {/* Plant Visual */}
                <div className="my-2 text-center">
                  <div className="text-4xl animate-bounce-subtle">
                    {plant.growthStage === 0 ? '🌱' : plant.growthStage === 1 ? '🌿' : plant.emoji}
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-1">{plant.seedType}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {plant.growthStage === 0
                      ? 'Just Sprouting'
                      : plant.growthStage === 1
                      ? 'Budding Strong'
                      : 'Full Bloom! 🌸'}
                  </p>
                </div>

                {/* Water action */}
                <button
                  onClick={() => waterPlant(plant.id)}
                  disabled={plant.growthStage >= 2 || waterCan <= 0}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    plant.growthStage >= 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : waterCan > 0
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white tap-bounce'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5" />
                  {plant.growthStage >= 2 ? 'Blooming' : 'Water Plot'}
                </button>
              </div>
            ))}
          </div>

          {/* Harmless Cosmetic Nature Info */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <span>🏡</span> Safe Cosmetic Decor
            </p>
            <p>
              Your virtual garden is a peaceful, harmless hobby area. It requires zero money to grow, unlocks with daily check-ins, and brings smiles to all ages.
            </p>
          </div>
        </div>

        {/* Seed Picker Modal */}
        {showSeedPicker && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-4 w-full max-w-xs space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-sm">Select a Seed to Plant</h4>
                <button onClick={() => setShowSeedPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SEEDS.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => plantNewSeed(s.type as any)}
                    className="p-3 border border-emerald-200 rounded-2xl hover:bg-emerald-50 text-center tap-bounce"
                  >
                    <div className="text-3xl">{s.emoji}</div>
                    <div className="text-xs font-bold text-gray-800 mt-1">{s.type}</div>
                    <div className="text-[10px] text-emerald-600">Free Seed</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
