import React from 'react';
import {
  Sparkles,
  Atom,
  Calculator,
  Palette,
  BookOpen
} from 'lucide-react';
import { soundService } from '../services/soundService';

export const CATEGORIES = ['All', 'Science', 'Math', 'Art', 'Stories'] as const;
export type VideoCategory = (typeof CATEGORIES)[number] | string;

export const DEFAULT_VIDEO_CATEGORIES = ['All', 'Science', 'Math', 'Art', 'Stories'];

export interface CategoryFilterProps {
  categories?: string[];
  activeCategory?: string;
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
  className?: string;
  videoCounts?: Record<string, number>;
}

interface CategoryMeta {
  label: string;
  icon: React.ReactNode;
  emoji: string;
  description: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  All: {
    label: 'All',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    emoji: '✨',
    description: 'Browse all educational family videos',
  },
  Science: {
    label: 'Science',
    icon: <Atom className="w-3.5 h-3.5" />,
    emoji: '🔬',
    description: 'Planetary science, biology & nature discovery',
  },
  Math: {
    label: 'Math',
    icon: <Calculator className="w-3.5 h-3.5" />,
    emoji: '📐',
    description: 'Mental math, arithmetic & problem solving',
  },
  Art: {
    label: 'Art',
    icon: <Palette className="w-3.5 h-3.5" />,
    emoji: '🎨',
    description: 'Origami crafts, creative art & paper folding',
  },
  Stories: {
    label: 'Stories',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    emoji: '📖',
    description: 'Wholesome moral stories & character building',
  },
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories = DEFAULT_VIDEO_CATEGORIES,
  activeCategory,
  selectedCategory,
  onSelectCategory,
  className = '',
  videoCounts,
}) => {
  const currentCategory = activeCategory || selectedCategory || 'All';

  const handleSelect = (category: string) => {
    soundService.playClick();
    onSelectCategory(category);
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 border-b border-rose-100 dark:border-slate-800 shrink-0 ${className}`}
      role="tablist"
      aria-label="Educational Video Categories"
    >
      {categories.map((cat) => {
        const isActive = currentCategory.toLowerCase() === cat.toLowerCase();
        const meta = CATEGORY_META[cat] || {
          label: cat,
          icon: <Sparkles className="w-3.5 h-3.5" />,
          emoji: '🏷️',
          description: `${cat} educational videos`,
        };
        const count = videoCounts?.[cat];

        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(cat)}
            title={meta.description}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
              isActive
                ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-300 dark:ring-rose-700 font-black'
                : 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-rose-100 dark:border-slate-700'
            }`}
          >
            <span className="text-xs" aria-hidden="true">
              {meta.emoji}
            </span>
            <span>{cat}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-rose-200/60 dark:bg-slate-700 text-rose-800 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
