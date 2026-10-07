import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  Flame,
  Calendar,
  CheckCircle2,
  XCircle,
  ShieldAlert
} from 'lucide-react';

export interface StreakDayRecord {
  dayIndex: number; // 1 to 30
  dateLabel: string;
  activitiesCount: number;
  goalHit: boolean; // activities >= 5
  consecutiveStreak: number;
  pointsEarned: number;
  isToday?: boolean;
  protectedByFreeze?: boolean;
}

interface StreakTrendChartProps {
  seniorMode?: boolean;
  currentStreakDays?: number;
  todayActivitiesCount?: number;
  onRenderComplete?: (metrics: { daysHit: number; totalDays: number; hitRate: number }) => void;
}

export const StreakTrendChart: React.FC<StreakTrendChartProps> = ({
  seniorMode = false,
  currentStreakDays = 24,
  todayActivitiesCount = 5,
  onRenderComplete
}) => {
  const [viewMode, setViewMode] = useState<'dual' | 'targetComparison' | 'streakGrowth'>('dual');
  const [filterMode, setFilterMode] = useState<'all' | 'hitOnly' | 'missedOnly'>('all');

  // Generate 30-day realistic historical sequence leading up to today
  const thirtyDaysData: StreakDayRecord[] = useMemo(() => {
    const list: StreakDayRecord[] = [];
    const baseDate = new Date();

    // 30 days of activity patterns: mostly 5-8 (hit), with a few 2-4 (missed, protected)
    const activitiesPattern = [
      5, 6, 5, 7, 5, 8, 6, // Days 1-7: all hit (streak 7)
      3, 5, 6, 7, 5, 4, 6, // Days 8-14: days 8 and 13 missed (streak shield used)
      5, 8, 6, 5, 7, 5, 5, // Days 15-21: all hit
      6, 5, 7, 6, 8, 5, 7, // Days 22-28: all hit
      6, Math.max(0, todayActivitiesCount) // Days 29-30: today
    ];

    let runningStreak = 1;
    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - (29 - i));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateLabel = `${monthNames[d.getMonth()]} ${d.getDate()}`;

      const acts = i === 29 ? todayActivitiesCount : activitiesPattern[i];
      const isHit = acts >= 5;
      const isProtected = !isHit && acts > 0;

      if (isHit || isProtected) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }

      list.push({
        dayIndex: i + 1,
        dateLabel: i === 29 ? (seniorMode ? 'آج' : 'Today') : dateLabel,
        activitiesCount: acts,
        goalHit: isHit,
        consecutiveStreak: Math.min(runningStreak, currentStreakDays),
        pointsEarned: acts * 30 + (isHit ? 100 : 20),
        isToday: i === 29,
        protectedByFreeze: isProtected
      });
    }

    return list;
  }, [currentStreakDays, todayActivitiesCount, seniorMode]);

  // Statistics
  const totalDays = thirtyDaysData.length;
  const daysHit = thirtyDaysData.filter((d) => d.goalHit).length;
  const daysMissed = totalDays - daysHit;
  const hitRatePercentage = Math.round((daysHit / totalDays) * 100);

  // Trigger streak-flame render complete event after chart animations finalize
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onRenderComplete) {
        onRenderComplete({
          daysHit,
          totalDays,
          hitRate: hitRatePercentage
        });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [onRenderComplete, daysHit, totalDays, hitRatePercentage]);

  // Filtered dataset
  const displayData = useMemo(() => {
    if (filterMode === 'hitOnly') return thirtyDaysData.filter((d) => d.goalHit);
    if (filterMode === 'missedOnly') return thirtyDaysData.filter((d) => !d.goalHit);
    return thirtyDaysData;
  }, [thirtyDaysData, filterMode]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: StreakDayRecord = payload[0].payload;
      return (
        <div className="bg-slate-950/95 text-white p-3 rounded-2xl shadow-xl border border-white/20 text-xs backdrop-blur-md space-y-1.5 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="font-black text-amber-300">
              Day {item.dayIndex}: {item.dateLabel}
            </span>
            {item.isToday && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-black rounded-md">
                {seniorMode ? 'آج' : 'Today'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">{seniorMode ? '5 ہدف کی حیثیت' : '5-Activity Goal'}:</span>
            {item.goalHit ? (
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{seniorMode ? 'ہدف حاصل ہوا' : 'Hit (≥5)'}</span>
              </span>
            ) : (
              <span className="text-rose-400 font-black flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                <span>{seniorMode ? 'نامکمل' : 'Missed (<5)'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">{seniorMode ? 'سرگرمیاں' : 'Activities Solved'}:</span>
            <span className="font-extrabold text-white">{item.activitiesCount} / 5</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">{seniorMode ? 'اسٹریک کا دن' : 'Streak Day'}:</span>
            <span className="font-black text-amber-400 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-400" />
              <span>Day {item.consecutiveStreak}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/10">
            <span className="text-slate-300">{seniorMode ? 'حاصل کردہ پوائنٹس' : 'Points Earned'}:</span>
            <span className="font-black text-amber-300">+{item.pointsEarned} Pts</span>
          </div>

          {item.protectedByFreeze && (
            <div className="pt-1 text-[10px] text-cyan-300 flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3 h-3" />
              <span>Protected by Daily Streak Shield</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-amber-300 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
            🔥
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span>{seniorMode ? '30 روزہ اسٹریک ٹرینڈ چارٹ' : '30-Day Consecutive Streak Trend'}</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full border border-amber-200">
                Past 30 Days
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {seniorMode
                ? 'گزشتہ 30 دنوں کا لاگ ان اور 5 سرگرمیوں کا ہدف حاصل بمقابلہ نامکمل'
                : 'Visualizing consecutive logins & 5-activity daily targets hit vs. missed'}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-[10px] font-black self-start sm:self-auto">
          <button
            onClick={() => setViewMode('dual')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              viewMode === 'dual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {seniorMode ? 'مشترکہ' : 'Dual View'}
          </button>
          <button
            onClick={() => setViewMode('targetComparison')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              viewMode === 'targetComparison'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {seniorMode ? 'ہدف مقابلہ' : 'Hit vs Missed'}
          </button>
          <button
            onClick={() => setViewMode('streakGrowth')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              viewMode === 'streakGrowth'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {seniorMode ? 'اسٹریک اضافہ' : 'Streak Growth'}
          </button>
        </div>
      </div>

      {/* 30-Day Quick Stats Cards */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="text-sm sm:text-base font-black text-emerald-700 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{daysHit}</span>
          </div>
          <div className="text-[9px] text-emerald-800 font-extrabold uppercase">
            {seniorMode ? 'ہدف حاصل' : 'Goal Hit'}
          </div>
        </div>

        <div className="p-2 bg-rose-50 border border-rose-200 rounded-2xl">
          <div className="text-sm sm:text-base font-black text-rose-700 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>{daysMissed}</span>
          </div>
          <div className="text-[9px] text-rose-800 font-extrabold uppercase">
            {seniorMode ? 'ہدف نامکمل' : 'Goal Missed'}
          </div>
        </div>

        <div className="p-2 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="text-sm sm:text-base font-black text-amber-700 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{currentStreakDays}d</span>
          </div>
          <div className="text-[9px] text-amber-800 font-extrabold uppercase">
            {seniorMode ? 'موجودہ اسٹریک' : 'Active Streak'}
          </div>
        </div>

        <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <div className="text-sm sm:text-base font-black text-indigo-700">
            {hitRatePercentage}%
          </div>
          <div className="text-[9px] text-indigo-800 font-extrabold uppercase">
            {seniorMode ? 'کامیابی شرح' : 'Consistency'}
          </div>
        </div>
      </div>

      {/* RECHARTS COMPOSED CHART */}
      <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/90 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600 px-1">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>30-Day Activity & Consecutive Streak Timeline</span>
          </span>
          <span className="text-emerald-700 font-black">
            {daysHit} of 30 Days Target Hit
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={displayData}
              margin={{ top: 12, right: 0, left: -22, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="dayIndex"
                stroke="#64748b"
                fontSize={9}
                fontWeight={700}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                interval={4}
                tickFormatter={(val) => `D${val}`}
              />
              <YAxis
                yAxisId="left"
                stroke="#059669"
                fontSize={9}
                fontWeight={700}
                domain={[0, 9]}
                ticks={[0, 2, 4, 5, 8]}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#d97706"
                fontSize={9}
                fontWeight={700}
                domain={[0, 30]}
                ticks={[5, 10, 15, 20, 25, 30]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />

              {/* 5-Activity Target Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={5}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: '🎯 Goal (5)',
                  fill: '#d97706',
                  fontSize: 9,
                  fontWeight: 800,
                  position: 'insideTopLeft'
                }}
              />

              {/* BARS: Activities completed with distinct color coding */}
              {(viewMode === 'dual' || viewMode === 'targetComparison') && (
                <Bar
                  yAxisId="left"
                  dataKey="activitiesCount"
                  radius={[4, 4, 1, 1]}
                  animationDuration={800}
                >
                  {displayData.map((entry, index) => {
                    const isHit = entry.goalHit;
                    const isToday = entry.isToday;

                    let fillColor = isHit ? '#10b981' : '#f43f5e'; // Emerald for hit, Coral Rose for missed
                    if (isToday) {
                      fillColor = isHit ? '#059669' : '#e11d48';
                    }

                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={fillColor}
                        stroke={isToday ? '#0f172a' : undefined}
                        strokeWidth={isToday ? 1.5 : 0}
                      />
                    );
                  })}
                </Bar>
              )}

              {/* LINE: Consecutive streak progression over the 30 days */}
              {(viewMode === 'dual' || viewMode === 'streakGrowth') && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="consecutiveStreak"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#ea580c', stroke: '#fef3c7', strokeWidth: 2 }}
                  animationDuration={1000}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] font-bold text-slate-600 border-t border-slate-200/60 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>5-Activity Goal Hit (≥ 5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Goal Missed / Login Only (&lt; 5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded-full" />
            <span>Consecutive Streak Days (Right Axis)</span>
          </div>
        </div>
      </div>

      {/* 30-DAY MINI DOT MATRIX / HEATMAP OVERVIEW */}
      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600 px-0.5">
          <span>{seniorMode ? '30 روزہ سرگرمی میٹرکس' : '30-Day Activity Matrix'}</span>
          <span className="text-slate-500">Day 1 → Day 30 (Today)</span>
        </div>
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
          {thirtyDaysData.map((d) => (
            <div
              key={d.dayIndex}
              title={`Day ${d.dayIndex} (${d.dateLabel}): ${d.activitiesCount} activities - ${d.goalHit ? 'Goal Hit' : 'Missed'}`}
              className={`h-5 rounded-md flex items-center justify-center text-[8px] font-black cursor-pointer transition-transform hover:scale-110 ${
                d.isToday
                  ? 'ring-2 ring-slate-900 ' + (d.goalHit ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')
                  : d.goalHit
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-400 text-white'
              }`}
            >
              {d.dayIndex}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
