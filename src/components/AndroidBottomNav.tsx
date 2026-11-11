import React from 'react';
import { Home, Play, BookOpen, CheckSquare, Wallet, Trophy, Sparkles, Video } from 'lucide-react';
import { hapticService } from '../services/haptics';

interface AndroidBottomNavProps {
  activeTab: 'home' | 'watch' | 'vlogs' | 'learn' | 'tasks' | 'wallet' | 'badges';
  onSelectTab: (tab: 'home' | 'watch' | 'vlogs' | 'learn' | 'tasks' | 'wallet' | 'badges') => void;
  seniorMode: boolean;
  uncompletedTasksCount: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  seniorMode,
  uncompletedTasksCount,
}) => {
  const tabs = [
    {
      id: 'home' as const,
      label: 'Home',
      urduLabel: 'ہوم',
      icon: Home,
    },
    {
      id: 'vlogs' as const,
      label: 'Vlogs',
      urduLabel: 'وی لاگز',
      icon: Video,
    },
    {
      id: 'learn' as const,
      label: 'Learn',
      urduLabel: 'کوئز',
      icon: BookOpen,
    },
    {
      id: 'tasks' as const,
      label: 'Tasks',
      urduLabel: 'ٹاسک',
      icon: CheckSquare,
      badge: uncompletedTasksCount > 0 ? uncompletedTasksCount : undefined,
    },
    {
      id: 'wallet' as const,
      label: 'Wallet',
      urduLabel: 'والیٹ',
      icon: Wallet,
    },
  ];

  const handleTabClick = (tabId: 'home' | 'watch' | 'vlogs' | 'learn' | 'tasks' | 'wallet' | 'badges') => {
    hapticService.selection();
    onSelectTab(tabId);
  };

  return (
    <nav className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-800 px-1 py-1.5 grid grid-cols-5 z-30 shadow-lg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="flex-1 flex flex-col items-center justify-center relative py-1 transition-all select-none tap-bounce group"
          >
            {/* Material 3 active pill indicator */}
            <div
              className={`w-13 h-7.5 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 scale-105 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 hover:bg-gray-100/60'
              }`}
            >
              <IconComponent className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {tab.badge && (
                <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[11px] mt-0.5 font-bold transition-colors tracking-tight ${
                isActive ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {seniorMode ? tab.urduLabel : tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
