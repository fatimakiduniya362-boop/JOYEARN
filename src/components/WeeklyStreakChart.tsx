import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Flame, Trophy, Sparkles, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

interface WeeklyStreakChartProps {
  streakDays: number;
  seniorMode?: boolean;
  totalActivitiesCount?: number;
}

interface DayData {
  day: string;
  urduDay: string;
  fullDay: string;
  activities: number;
  points: number;
  isCompleted: boolean;
  isToday: boolean;
  status: string;
}

export const WeeklyStreakChart: React.FC<WeeklyStreakChartProps> = ({
  streakDays,
  seniorMode = false,
  totalActivitiesCount = 12,
}) => {
  const [metric, setMetric] = useState<'activities' | 'points'>('activities');

  // Generate 7-day activity completion data matching user's streak
  const streakData: DayData[] = [
    {
      day: 'Mon',
      urduDay: 'پیر',
      fullDay: 'Monday',
      activities: 3,
      points: 140,
      isCompleted: streakDays >= 1,
      isToday: streakDays === 1,
      status: streakDays >= 1 ? 'Completed' : 'Skipped',
    },
    {
      day: 'Tue',
      urduDay: 'منگل',
      fullDay: 'Tuesday',
      activities: 4,
      points: 175,
      isCompleted: streakDays >= 2,
      isToday: streakDays === 2,
      status: streakDays >= 2 ? 'Completed' : 'Skipped',
    },
    {
      day: 'Wed',
      urduDay: 'بدھ',
      fullDay: 'Wednesday',
      activities: 3,
      points: 160,
      isCompleted: streakDays >= 3,
      isToday: streakDays === 3,
      status: streakDays >= 3 ? 'Completed' : 'Skipped',
    },
    {
      day: 'Thu',
      urduDay: 'جمعرات',
      fullDay: 'Thursday',
      activities: Math.max(2, Math.min(6, Math.floor(totalActivitiesCount / 2))),
      points: 185,
      isCompleted: streakDays >= 4,
      isToday: streakDays === 4,
      status: streakDays === 4 ? 'Today (Active)' : streakDays > 4 ? 'Completed' : 'Upcoming',
    },
    {
      day: 'Fri',
      urduDay: 'جمعہ',
      fullDay: 'Friday',
      activities: streakDays >= 5 ? 3 : 0,
      points: streakDays >= 5 ? 150 : 0,
      isCompleted: streakDays >= 5,
      isToday: streakDays === 5,
      status: streakDays >= 5 ? 'Completed' : 'Upcoming Target',
    },
    {
      day: 'Sat',
      urduDay: 'ہفتہ',
      fullDay: 'Saturday',
      activities: streakDays >= 6 ? 4 : 0,
      points: streakDays >= 6 ? 180 : 0,
      isCompleted: streakDays >= 6,
      isToday: streakDays === 6,
      status: streakDays >= 6 ? 'Completed' : 'Upcoming Target',
    },
    {
      day: 'Sun',
      urduDay: 'اتوار',
      fullDay: 'Sunday',
      activities: streakDays >= 7 ? 5 : 0,
      points: streakDays >= 7 ? 220 : 0,
      isCompleted: streakDays >= 7,
      isToday: streakDays === 7,
      status: streakDays >= 7 ? 'Completed' : 'Grand Chest Bonus',
    },
  ];

  const totalCompletedDays = streakData.filter((d) => d.isCompleted).length;
  const consistencyPct = Math.round((totalCompletedDays / 7) * 100);
  const totalWeekActivities = streakData.reduce((acc, d) => acc + d.activities, 0);
  const totalWeekPoints = streakData.reduce((acc, d) => acc + d.points, 0);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-2xl p-2.5 shadow-xl border border-slate-700 text-xs space-y-1 z-50 pointer-events-none">
          <div className="flex items-center justify-between gap-3">
            <span className="font-extrabold text-amber-300">
              {data.fullDay} {seniorMode && `(${data.urduDay})`}
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                data.isToday
                  ? 'bg-rose-500 text-white'
                  : data.isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {data.status}
            </span>
          </div>
          <div className="text-[11px] text-gray-200 flex justify-between gap-4 pt-1 border-t border-slate-800">
            <span>Activities Completed:</span>
            <strong className="text-emerald-400 font-bold">{data.activities}</strong>
          </div>
          <div className="text-[11px] text-gray-200 flex justify-between gap-4">
            <span>Points Earned:</span>
            <strong className="text-amber-400 font-bold">+{data.points} Pts</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-rose-50/80 border-2 border-amber-200/90 rounded-3xl p-3.5 shadow-sm space-y-3">
      {/* Chart Top Header & Metric Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white flex items-center justify-center text-base shadow-sm animate-pulse-subtle">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className={`font-black text-gray-900 ${seniorMode ? 'text-base' : 'text-xs'}`}>
                {seniorMode ? 'ہفتہ وار تسلسل چارٹ (Recharts)' : 'Weekly Streak Consistency'}
              </h3>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-1.5 py-0.2 rounded-full">
                {streakDays} Days
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">
              {seniorMode
                ? 'پچھلے 7 دنوں کی سرگرمیوں کا تسلسل'
                : 'Last 7 days activity completion chart'}
            </p>
          </div>
        </div>

        {/* Metric Switcher Toggle Buttons */}
        <div className="flex items-center bg-white/90 p-0.5 rounded-xl border border-amber-200 text-[10px] font-bold shadow-2xs">
          <button
            onClick={() => setMetric('activities')}
            className={`px-2 py-1 rounded-lg transition-all ${
              metric === 'activities'
                ? 'bg-rose-500 text-white font-black shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Activities
          </button>
          <button
            onClick={() => setMetric('points')}
            className={`px-2 py-1 rounded-lg transition-all ${
              metric === 'points'
                ? 'bg-amber-500 text-white font-black shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Points
          </button>
        </div>
      </div>

      {/* RECHARTS VISUALIZATION CONTAINER */}
      <div className="bg-white/95 rounded-2xl p-2 pt-3 border border-amber-200/60 shadow-inner">
        <div className="w-full h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={streakData}
              margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
            >
              <XAxis
                dataKey={seniorMode ? 'urduDay' : 'day'}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={metric === 'activities' ? 3 : 150}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: 'Goal',
                  position: 'right',
                  fill: '#d97706',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey={metric}
                radius={[8, 8, 4, 4]}
                maxBarSize={32}
              >
                {streakData.map((entry, index) => {
                  let fillColor = '#cbd5e1'; // gray for upcoming
                  if (entry.isToday) {
                    fillColor = '#f43f5e'; // rose-500 for today
                  } else if (entry.isCompleted) {
                    fillColor = '#10b981'; // emerald-500 for completed
                  }
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={entry.isToday ? '#be123c' : undefined}
                      strokeWidth={entry.isToday ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Status Strip */}
        <div className="flex items-center justify-between text-[10px] pt-1.5 px-2 border-t border-gray-100 text-gray-500 font-semibold">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Completed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Today</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              <span>Upcoming</span>
            </span>
          </div>

          <span className="text-amber-800 font-extrabold">
            {consistencyPct}% Consistency
          </span>
        </div>
      </div>

      {/* Weekly Stats Summary Pill Banner */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-white/80 p-2 rounded-2xl border border-amber-200/60 shadow-2xs">
          <p className="text-[10px] text-gray-400 font-semibold">Days Active</p>
          <p className="font-black text-amber-700 text-xs mt-0.5">
            {totalCompletedDays} / 7 Days
          </p>
        </div>
        <div className="bg-white/80 p-2 rounded-2xl border border-amber-200/60 shadow-2xs">
          <p className="text-[10px] text-gray-400 font-semibold">Activities</p>
          <p className="font-black text-emerald-700 text-xs mt-0.5">
            {totalWeekActivities} Done
          </p>
        </div>
        <div className="bg-white/80 p-2 rounded-2xl border border-amber-200/60 shadow-2xs">
          <p className="text-[10px] text-gray-400 font-semibold">Week Points</p>
          <p className="font-black text-rose-600 text-xs mt-0.5">
            +{totalWeekPoints} Pts
          </p>
        </div>
      </div>

      {/* Milestone Footer */}
      <div className="flex items-center justify-between text-[11px] bg-white/80 rounded-xl px-2.5 py-1.5 border border-amber-200/60 text-amber-950 font-bold">
        <span className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {streakDays >= 7
              ? '🏆 Weekly Master Streak Achieved! (+200 Pts)'
              : `${7 - Math.min(7, streakDays)} days until the 7-day consistency bonus!`}
          </span>
        </span>
        <span className="text-xs text-rose-600 font-black">+200 Pts</span>
      </div>
    </div>
  );
};
