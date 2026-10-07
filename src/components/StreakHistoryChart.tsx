import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend
} from 'recharts';
import { Flame, CheckCircle2, XCircle, TrendingUp, Calendar } from 'lucide-react';

export interface DayActivityData {
  day: string;
  urduDay: string;
  activities: number; // 0 to 5
  points: number;
  isActive: boolean;
  dateStr: string;
}

export interface StreakHistoryChartProps {
  seniorMode?: boolean;
  streakDays?: number;
  data?: DayActivityData[];
}

export const StreakHistoryChart: React.FC<StreakHistoryChartProps> = ({
  seniorMode = false,
  streakDays = 5,
  data,
}) => {
  // Generate representative weekly activity history based on user streak
  const weeklyData: DayActivityData[] = data || [
    {
      day: 'Mon',
      urduDay: 'پیر',
      activities: 5,
      points: 175,
      isActive: true,
      dateStr: 'Day 1'
    },
    {
      day: 'Tue',
      urduDay: 'منگل',
      activities: 5,
      points: 190,
      isActive: true,
      dateStr: 'Day 2'
    },
    {
      day: 'Wed',
      urduDay: 'بدھ',
      activities: 4,
      points: 140,
      isActive: true,
      dateStr: 'Day 3'
    },
    {
      day: 'Thu',
      urduDay: 'جمعرات',
      activities: 0,
      points: 0,
      isActive: false, // Missed day
      dateStr: 'Day 4'
    },
    {
      day: 'Fri',
      urduDay: 'جمعہ',
      activities: 5,
      points: 210,
      isActive: true,
      dateStr: 'Day 5'
    },
    {
      day: 'Sat',
      urduDay: 'ہفتہ',
      activities: 5,
      points: 185,
      isActive: true,
      dateStr: 'Day 6'
    },
    {
      day: 'Sun',
      urduDay: 'اتوار',
      activities: 5,
      points: 220,
      isActive: true, // Today
      dateStr: 'Today'
    },
  ];

  const activeDaysCount = weeklyData.filter((d) => d.isActive).length;
  const missedDaysCount = weeklyData.length - activeDaysCount;
  const consistencyRate = Math.round((activeDaysCount / weeklyData.length) * 100);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dayData: DayActivityData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-1">
            <span className="font-black text-amber-400">
              {seniorMode ? dayData.urduDay : dayData.day} ({dayData.dateStr})
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                dayData.isActive
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/30 text-rose-300'
              }`}
            >
              {dayData.isActive
                ? seniorMode
                  ? 'فعال دن ✓'
                  : 'Active Day ✓'
                : seniorMode
                ? 'چھوٹ گیا دن ✕'
                : 'Missed Day ✕'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] pt-0.5">
            <span className="text-slate-300">
              {seniorMode ? 'مکمل سرگرمیاں:' : 'Completed Activities:'}
            </span>
            <span className="font-extrabold text-white">{dayData.activities} / 5</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-300">
              {seniorMode ? 'کمائے گئے پوائنٹس:' : 'Points Earned:'}
            </span>
            <span className="font-extrabold text-amber-300">+{dayData.points} Pts</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-slate-700 rounded-3xl p-4 shadow-md space-y-3.5 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-lg shadow-sm">
            📈
          </div>
          <div>
            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{seniorMode ? 'ہفتہ وار اسٹریک مستقل مزاجی' : 'Weekly Activity Consistency'}</span>
              <span className="text-[9px] bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-extrabold px-2 py-0.2 rounded-full border border-orange-300">
                Recharts
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {seniorMode
                ? 'فعال بمقابلہ چھوٹ جانے والے دنوں کا بصری تجزیہ'
                : 'Days active vs. days missed consistency breakdown'}
            </p>
          </div>
        </div>

        {/* Consistency Metric Badge */}
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {seniorMode ? 'مستقل مزاجی' : 'Weekly Score'}
          </span>
          <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{consistencyRate}%</span>
          </span>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px]">
              {seniorMode ? 'فعال دن' : 'Days Active'}
            </span>
          </div>
          <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
            {activeDaysCount} / 7
          </span>
        </div>

        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-bold text-rose-900 dark:text-rose-200 text-[11px]">
              {seniorMode ? 'چھوٹے دن' : 'Days Missed'}
            </span>
          </div>
          <span className="font-black text-rose-700 dark:text-rose-300 text-sm">
            {missedDaysCount} / 7
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-44 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey={seniorMode ? 'urduDay' : 'day'}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 146, 60, 0.08)' }} />
            <Bar dataKey="activities" radius={[6, 6, 0, 0]} maxBarSize={32}>
              {weeklyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isActive
                      ? entry.activities >= 5
                        ? '#10b981' // emerald-500 (full target)
                        : '#f59e0b' // amber-500 (active)
                      : '#cbd5e1' // slate-300 (missed)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Explanation */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/80 pt-2 px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{seniorMode ? '5/5 ہدف مکمل' : 'Target Met (5/5)'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>{seniorMode ? 'فعال سرگرمی' : 'Active (1-4)'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
            <span>{seniorMode ? 'چھوٹا دن' : 'Missed'}</span>
          </span>
        </div>

        <span className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
          <Flame className="w-3 h-3 text-orange-500" />
          <span>{streakDays}d Streak</span>
        </span>
      </div>
    </div>
  );
};
