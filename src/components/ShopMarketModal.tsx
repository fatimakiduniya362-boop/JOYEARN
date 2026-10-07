import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Shield,
  Sparkles,
  Award,
  Flame,
  Check,
  Coins
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface ShopMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
  onPurchaseItem?: (cost: number, itemName: string) => void;
  seniorMode?: boolean;
}

export const ShopMarketModal: React.FC<ShopMarketModalProps> = ({
  isOpen,
  onClose,
  userPoints = 1250,
  onPurchaseItem,
  seniorMode = false
}) => {
  const [activeCategory, setActiveCategory] = useState<'boosts' | 'avatars' | 'badges'>('boosts');
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const { light, success } = useHaptics();

  if (!isOpen) return null;

  const catalog = [
    { id: 'shield_1', name: 'Streak Freeze Shield', category: 'boosts', cost: 150, icon: '🛡️', desc: 'Protects your streak if you miss a 5-activity day' },
    { id: 'boost_2x', name: '2x JoyPoints Booster (24h)', category: 'boosts', cost: 300, icon: '⚡', desc: 'Double points earned on all quizzes for 24 hours' },
    { id: 'avatar_gold', name: 'Golden Scholar Frame', category: 'avatars', cost: 200, icon: '👑', desc: 'Exclusive glowing gold border for your dashboard profile' },
    { id: 'avatar_flame', name: 'Streak Blaster Frame', category: 'avatars', cost: 250, icon: '🔥', desc: 'Fiery animated avatar ring celebrating long streaks' },
    { id: 'badge_mentor', name: 'Honorary Mentor Badge', category: 'badges', cost: 180, icon: '🎓', desc: 'Displays verified mentor badge in chat lounges' }
  ];

  const handleBuy = (item: typeof catalog[0]) => {
    if (purchasedIds.includes(item.id)) return;
    if (userPoints < item.cost) {
      alert(`You need ${item.cost} JoyPoints to purchase this item!`);
      return;
    }
    soundService.playCoin();
    success();
    setPurchasedIds((prev) => [...prev, item.id]);
    if (onPurchaseItem) onPurchaseItem(item.cost, item.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🛍️
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base leading-tight">
                {seniorMode ? 'جوائے مارکیٹ اور شاپ' : 'JoyMarket & Reward Shop'}
              </h2>
              <div className="text-[11px] text-amber-100 font-bold flex items-center gap-1">
                <span>Balance:</span>
                <span className="font-extrabold text-white">{userPoints.toLocaleString()} JoyPoints</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-black">
          <button
            onClick={() => setActiveCategory('boosts')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeCategory === 'boosts' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Streak Boosters
          </button>
          <button
            onClick={() => setActiveCategory('avatars')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeCategory === 'avatars' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Avatar Frames
          </button>
          <button
            onClick={() => setActiveCategory('badges')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeCategory === 'badges' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Badges
          </button>
        </div>

        {/* Item List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {catalog
            .filter((item) => item.category === activeCategory)
            .map((item) => {
              const isOwned = purchasedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-xs">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{item.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                      <div className="text-[11px] font-black text-amber-700 mt-0.5">
                        ⭐ {item.cost} JoyPoints
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(item)}
                    disabled={isOwned}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                      isOwned
                        ? 'bg-emerald-100 text-emerald-800'
                        : userPoints >= item.cost
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs tap-bounce'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isOwned ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Owned</span>
                      </span>
                    ) : (
                      <span>Redeem</span>
                    )}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
