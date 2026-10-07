import React from 'react';
import { Home, Play, BookOpen, CheckSquare, Wallet, Trophy, Sparkles } from 'lucide-react';
import { hapticService } from '../services/haptics';

interface AndroidBottomNavProps {
  activeTab: 'home' | 'watch' | 'learn' | 'tasks' | 'wallet' | 'badges';
  onSelectTab: (tab: 'home' | 'watch' | 'learn' | 'tasks' | 'wallet' | 'badges') => void;
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
      id: 'watch' as const,
      label: 'Watch',
      urduLabel: 'ویڈیو',
      icon: Play,
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

  const handleTabClick = (tabId: 'home' | 'watch' | 'learn' | 'tasks' | 'wallet' | 'badges') => {
    hapticService.selection();
    onSelectTab(tabId);
  };

  return (
    <nav className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around z-30 shadow-lg">
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
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-rose-100 text-rose-600 scale-105 shadow-xs'
                  : 'text-gray-500 group-hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.badge && (
                <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] mt-0.5 font-bold transition-colors ${
                isActive ? 'text-rose-600 font-extrabold' : 'text-gray-500'
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
