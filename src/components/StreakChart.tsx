import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  Flame,
  Calendar,
  TrendingUp,
  Zap,
  CheckCircle2,
  Sparkles,
  Award,
  Filter,
} from 'lucide-react';

export interface StreakChartProps {
  streakDays: number;
  seniorMode?: boolean;
  totalActivitiesCount?: number;
}

export interface DayStreakRecord {
  dayIndex: number; // 1 to 30
  dateLabel: string; // e.g., "Sep 2"
  shortDate: string; // e.g., "02"
  fullDate: string; // e.g., "September 2, 2026"
  dayOfWeek: string; // e.g., "Wed"
  activities: number;
  points: number;
  isCompleted: boolean;
  isToday: boolean;
  inCurrentStreak: boolean;
}

export const StreakChart: React.FC<StreakChartProps> = ({
  streakDays = 5,
  seniorMode = false,
  totalActivitiesCount = 12,
}) => {
  const [chartView, setChartView] = useState<'area' | 'bar'>('area');
  const [metric, setMetric] = useState<'activities' | 'points'>('activities');
  const [timeRange, setTimeRange] = useState<'30d' | '14d' | '7d'>('30d');

  // Generate 30 days of historical activity data leading up to today
  const full30DayData = useMemo<DayStreakRecord[]>(() => {
    const records: DayStreakRecord[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const isToday = i === 0;
      const inCurrentStreak = i < streakDays;

      // Realistic activity distribution based on current streak and user profile
      let activities = 0;
      let points = 0;

      if (inCurrentStreak) {
        // High engaged activity during active streak
        activities = isToday
          ? Math.max(2, Math.min(6, Math.floor(totalActivitiesCount / 2)))
          : 3 + ((i * 3 + 1) % 4);
        points = activities * 35 + ((i * 17) % 30);
      } else {
        // Past activity with periodic high completion days
        const patternVal = (i * 7 + 3) % 10;
        if (patternVal > 3) {
          activities = 1 + (patternVal % 4);
          points = activities * 30 + 15;
        } else {
          activities = 0;
          points = 0;
        }
      }

      const isCompleted = activities > 0;
      const dayOfMonth = d.getDate();
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      records.push({
        dayIndex: 30 - i,
        dateLabel: `${monthNames[d.getMonth()]} ${dayOfMonth}`,
        shortDate: `${dayOfMonth}`,
        fullDate: `${weekdayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${dayOfMonth}`,
        dayOfWeek: weekdayNames[d.getDay()],
        activities,
        points,
        isCompleted,
        isToday,
        inCurrentStreak,
      });
    }

    return records;
  }, [streakDays, totalActivitiesCount]);

  // Sliced data based on selected time filter (7d, 14d, 30d)
  const displayData = useMemo(() => {
    if (timeRange === '7d') return full30DayData.slice(-7);
    if (timeRange === '14d') return full30DayData.slice(-14);
    return full30DayData;
  }, [full30DayData, timeRange]);

  // Aggregate stats over past 30 days
  const stats = useMemo(() => {
    const total30dActivities = full30DayData.reduce((acc, cur) => acc + cur.activities, 0);
    const total30dPoints = full30DayData.reduce((acc, cur) => acc + cur.points, 0);
    const completedDays = full30DayData.filter((d) => d.isCompleted).length;
    const consistencyRate = Math.round((completedDays / 30) * 100);

    return {
      total30dActivities,
      total30dPoints,
      completedDays,
      consistencyRate,
    };
  }, [full30DayData]);

  // Custom Recharts Tooltip with Tailwind styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayStreakRecord = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs min-w-40 z-50 animate-fade-in pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
            <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>{data.fullDate}</span>
            </span>
            {data.isToday && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                Today
              </span>
            )}
          </div>

          <div className="space-y-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Completed Activities:</span>
              <span className="font-black text-emerald-400">{data.activities} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">JoyPoints Earned:</span>
              <span className="font-black text-amber-300">+{data.points} Pts</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-400">Streak Status:</span>
              <span
                className={`font-black flex items-center gap-0.5 ${
                  data.inCurrentStreak
                    ? 'text-orange-400'
                    : data.isCompleted
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                {data.inCurrentStreak ? (
                  <>
                    <Flame className="w-3 h-3 fill-orange-400 text-orange-400" /> Active Streak
                  </>
                ) : data.isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                  </>
                ) : (
                  'Rest Day'
                )}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-3.5 border-2 border-amber-200/90 shadow-sm space-y-3">
      {/* Header with Title and Streak Flame */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
            <Flame className="w-4 h-4 fill-white text-white animate-pulse" />
          </div>
          <div>
            <h3 className={`font-black text-gray-900 leading-tight ${seniorMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
              30-Day Activity Streak Timeline
            </h3>
            <p className="text-[10px] text-gray-500 font-medium">
              Consistent daily learning & rewards tracking
            </p>
          </div>
        </div>

        {/* Current Active Streak Badge */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-2.5 py-1 rounded-xl shadow-2xs">
          <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
          <div className="text-right">
            <span className="text-xs font-black text-orange-900 block leading-none">
              {streakDays} Days
            </span>
            <span className="text-[8px] font-bold text-orange-600 uppercase tracking-wider">
              Active Streak
            </span>
          </div>
        </div>
      </div>

      {/* 30-Day Performance Stat Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 text-center">
          <span className="text-[9px] font-bold text-gray-500 block uppercase">30D Consistency</span>
          <span className="text-sm font-black text-indigo-900 block mt-0.5">
            {stats.consistencyRate}%
          </span>
          <span className="text-[8px] text-gray-400 font-semibold">{stats.completedDays}/30 Days</span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2 text-center">
          <span className="text-[9px] font-bold text-emerald-700 block uppercase">Activities</span>
          <span className="text-sm font-black text-emerald-900 block mt-0.5">
            {stats.total30dActivities}
          </span>
          <span className="text-[8px] text-emerald-600 font-semibold">Tasks & Quizzes</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2 text-center">
          <span className="text-[9px] font-bold text-amber-700 block uppercase">30D JoyPoints</span>
          <span className="text-sm font-black text-amber-900 block mt-0.5">
            +{stats.total30dPoints}
          </span>
          <span className="text-[8px] text-amber-600 font-semibold">Earned Points</span>
        </div>
      </div>

      {/* Control Filters Toolbar */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        {/* Metric Selector */}
        <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-[10px] font-bold">
          <button
            onClick={() => setMetric('activities')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              metric === 'activities'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Activities
          </button>
          <button
            onClick={() => setMetric('points')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              metric === 'points'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Points
          </button>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 text-[10px] font-bold">
          {(['7d', '14d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                timeRange === r
                  ? 'bg-amber-500 text-white font-black shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
          {/* Chart style toggle */}
          <button
            onClick={() => setChartView((v) => (v === 'area' ? 'bar' : 'area'))}
            className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg ml-0.5"
            title="Toggle between Area and Bar chart"
          >
            <TrendingUp className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="w-full h-44 sm:h-48 pt-1 select-none" style={{ minHeight: '176px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'area' ? (
            <AreaChart data={displayData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="streakAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric === 'activities' ? '#10b981' : '#f59e0b'} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={metric === 'activities' ? '#10b981' : '#f59e0b'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                interval={timeRange === '30d' ? 5 : timeRange === '14d' ? 2 : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={metric === 'activities' ? 3 : 100}
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: metric === 'activities' ? 'Goal (3)' : 'Goal (100 Pts)',
                  fill: '#f97316',
                  fontSize: 8,
                  position: 'top',
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={metric === 'activities' ? '#059669' : '#d97706'}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#streakAreaGrad)"
                dot={{
                  r: timeRange === '7d' ? 4 : 2,
                  fill: metric === 'activities' ? '#059669' : '#d97706',
                  strokeWidth: 1,
                  stroke: '#ffffff',
                }}
                activeDot={{
                  r: 6,
                  fill: '#f97316',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : (
            <BarChart data={displayData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                interval={timeRange === '30d' ? 5 : timeRange === '14d' ? 2 : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={metric === 'activities' ? 3 : 100}
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Bar
                dataKey={metric}
                fill={metric === 'activities' ? '#10b981' : '#f59e0b'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Milestone Hint */}
      <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-2.5 flex items-center justify-between text-[10px] text-amber-900">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold">
            {streakDays >= 7
              ? `🔥 Outstanding! You are on a ${streakDays}-day active learning streak!`
              : `Complete 1 activity today to keep your streak blazing! Current: ${streakDays} days.`}
          </span>
        </div>
        <span className="font-black text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs shrink-0">
          Target: 30 Days 🏅
        </span>
      </div>
    </div>
  );
};
