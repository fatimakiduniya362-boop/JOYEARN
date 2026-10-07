import React, { useState } from 'react';
import { Gift, Sparkles, CheckCircle2, Award, Shield } from 'lucide-react';
import { hapticService } from '../services/haptics';
import { VirtualCurrencyDisclaimer } from './VirtualCurrencyDisclaimer';
import { getTodayDailyBonusReward } from '../utils/dailyRotation';

interface DailyChestModalProps {
  streak: number;
  onClaimDaily: (points: number, seed: string) => void;
  claimedToday: boolean;
  onClose: () => void;
}

export const DailyChestModal: React.FC<DailyChestModalProps> = ({
  streak,
  onClaimDaily,
  claimedToday,
  onClose,
}) => {
  const [opened, setOpened] = useState(claimedToday);
  const [rewardWon, setRewardWon] = useState<{ points: number; seed: string } | null>(null);

  const todayBonus = getTodayDailyBonusReward();

  const handleOpenChest = () => {
    if (opened || claimedToday) return;

    hapticService.heavy();
    // Deterministic daily rotation: base points + today's bonus + streak bonus
    const isDay7 = streak > 0 && streak % 7 === 0;
    const weeklyBonus = isDay7 ? 100 : 0;
    const pointsGained = todayBonus.basePoints + todayBonus.bonusPoints + streak * 5 + weeklyBonus;
    const seeds = ['Rose', 'Sunflower', 'Tulip', 'Lavender', 'Apple Tree'];
    const chosenSeed = seeds[(streak + todayBonus.dayNumber) % seeds.length];

    setRewardWon({ points: pointsGained, seed: chosenSeed });
    setOpened(true);
    onClaimDaily(pointsGained, chosenSeed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 text-center shadow-2xl border-4 border-amber-300 relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
        >
          ✕
        </button>

        {/* Mascot & Streak */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 rounded-full text-amber-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Day {streak} Daily Streak
          </div>
          <h3 className="font-extrabold text-xl text-gray-900">Daily Reward Chest</h3>
          <p className="text-xs text-gray-500">
            A free daily gift to thank our active community members!
          </p>
        </div>

        {/* Chest Visual */}
        <div className="py-4">
          <div
            onClick={handleOpenChest}
            className={`cursor-pointer transition-all duration-300 transform select-none ${
              !opened && !claimedToday
                ? 'hover:scale-110 animate-bounce-subtle'
                : 'scale-105'
            }`}
          >
            <span className="text-7xl block drop-shadow-md">
              {opened || claimedToday ? '🎁✨' : '📦'}
            </span>
          </div>
        </div>

        {/* Reward Result */}
        {opened || claimedToday ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-2">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
              Today's Gift Unlocked!
            </span>
            <div className="text-lg font-black text-gray-900">
              +{rewardWon ? rewardWon.points : 35} JoyPoints ⭐
            </div>
            <p className="text-xs text-emerald-700">
              + 1x Fresh {rewardWon ? rewardWon.seed : 'Flower'} Seed for your Virtual Garden 🌸
            </p>
            <p className="text-[10px] text-gray-400 pt-1">
              Come back tomorrow for Day {streak + 1} rewards!
            </p>
          </div>
        ) : (
          <button
            onClick={handleOpenChest}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg tap-bounce text-sm"
          >
            Tap to Open Chest!
          </button>
        )}

        {/* Prominently positioned policy disclaimer below reward claim section */}
        <VirtualCurrencyDisclaimer variant="badge" className="rounded-2xl py-2 px-3 bg-slate-950 border border-amber-400/80 shadow-md" />

        <div className="text-[10px] text-gray-400">
          Non-gambling guarantee • Zero real money required
        </div>
      </div>
    </div>
  );
};
