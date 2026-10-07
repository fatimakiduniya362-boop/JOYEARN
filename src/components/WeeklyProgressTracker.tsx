import React, { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';
import {
  Calendar,
  CheckCircle2,
  Flame,
  Target,
  Trophy,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Layers,
  BarChart2
} from 'lucide-react';

export interface DayActivityData {
  day: string;
  urduDay: string;
  dateStr: string;
  activities: number;
  pointsEarned: number;
  rollingAvgPoints: number; // 7-day rolling average of total points
  targetMet: boolean;
  isToday?: boolean;
}

interface WeeklyProgressTrackerProps {
  seniorMode?: boolean;
  todayActivitiesCount?: number;
  streakDays?: number;
  customWeeklyData?: DayActivityData[];
}

export const WeeklyProgressTracker: React.FC<WeeklyProgressTrackerProps> = ({
  seniorMode = false,
  todayActivitiesCount = 5,
  streakDays = 4,
  customWeeklyData
}) => {
  const [chartView, setChartView] = useState<'combined' | 'bars' | 'rollingAvg'>('combined');

  // Preceding 7 days history before Monday: [180, 195, 210, 175, 220, 205, 190]
  const priorHistory = [180, 195, 210, 175, 220, 205, 190];

  const currentDayPoints = todayActivitiesCount * 35 + (todayActivitiesCount >= 5 ? 100 : 25);

  const rawDays = [
    { day: 'Mon', urduDay: 'پیر', dateStr: 'Sep 25', activities: 5, points: 190, isToday: false },
    { day: 'Tue', urduDay: 'منگل', dateStr: 'Sep 26', activities: 6, points: 220, isToday: false },
    { day: 'Wed', urduDay: 'بدھ', dateStr: 'Sep 27', activities: 5, points: 185, isToday: false },
    { day: 'Thu', urduDay: 'جمعرات', dateStr: 'Sep 28', activities: 7, points: 260, isToday: false },
    {
      day: 'Fri',
      urduDay: 'جمعہ',
      dateStr: 'Today',
      activities: Math.max(0, todayActivitiesCount),
      points: currentDayPoints,
      isToday: true
    },
    { day: 'Sat', urduDay: 'ہفتہ', dateStr: 'Tomorrow', activities: 0, points: 0, isToday: false },
    { day: 'Sun', urduDay: 'اتوار', dateStr: 'Oct 01', activities: 0, points: 0, isToday: false }
  ];

  // Calculate 7-day rolling average for each day
  const fullPointsSeries = [...priorHistory];
  const defaultWeeklyData: DayActivityData[] = rawDays.map((d, index) => {
    fullPointsSeries.push(d.points);
    // Take previous 7 days window up to this day
    const windowStart = fullPointsSeries.length - 7;
    const windowSlice = fullPointsSeries.slice(windowStart, fullPointsSeries.length);
    // If upcoming day with 0 points, extrapolate previous rolling avg
    let rollingAvg = Math.round(windowSlice.reduce((a, b) => a + b, 0) / 7);
    if (index >= 5 && d.points === 0) {
      rollingAvg = Math.round(
        rawDays.slice(0, 5).reduce((a, b) => a + b.points, 0) / 5
      );
    }

    return {
      day: d.day,
      urduDay: d.urduDay,
      dateStr: d.dateStr,
      activities: d.activities,
      pointsEarned: d.points,
      rollingAvgPoints: rollingAvg,
      targetMet: d.activities >= 5,
      isToday: d.isToday
    };
  });

  const data = customWeeklyData || defaultWeeklyData;

  const targetThreshold = 5;
  const daysHitTarget = data.filter((d) => d.activities >= targetThreshold).length;
  const totalWeeklyActivities = data.reduce((acc, curr) => acc + curr.activities, 0);
  const consistencyRate = Math.round((daysHitTarget / 7) * 100);

  // Active average of points earned across logged days
  const activeDays = data.filter((d) => d.activities > 0);
  const currentRollingAvg =
    data.find((d) => d.isToday)?.rollingAvgPoints ||
    (activeDays.length > 0
      ? Math.round(activeDays.reduce((a, b) => a + b.pointsEarned, 0) / activeDays.length)
      : 205);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: DayActivityData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-white/20 text-xs backdrop-blur-md space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
            <span className="font-black text-amber-300">
              {seniorMode ? item.urduDay : item.day} ({item.dateStr})
            </span>
            {item.isToday && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-black rounded-md">
                {seniorMode ? 'آج' : 'Today'}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-300">{seniorMode ? 'سرگرمیاں' : 'Daily Activities'}:</span>
            <span className="font-extrabold text-emerald-400">{item.activities} / 5</span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-300">{seniorMode ? 'حاصل پوائنٹس' : 'Day Points'}:</span>
            <span className="font-extrabold text-amber-400">+{item.pointsEarned} Pts</span>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-white/10">
            <span className="text-purple-300">{seniorMode ? '7 روزہ اوسط' : '7-Day Rolling Avg'}:</span>
            <span className="font-black text-purple-300">{item.rollingAvgPoints} Pts/day</span>
          </div>

          <div className="pt-1 border-t border-white/10 flex items-center gap-1.5 text-[10px] font-black">
            {item.activities >= targetThreshold ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{seniorMode ? '5 کا ہدف حاصل ہوا ✓' : '5-Activity Goal Hit! ✓'}</span>
              </span>
            ) : item.isToday ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{targetThreshold - item.activities} {seniorMode ? 'مزید درکار ہیں' : 'more to hit target'}</span>
              </span>
            ) : (
              <span className="text-slate-400">
                {item.activities === 0 ? (seniorMode ? 'آنے والا دن' : 'Upcoming day') : (seniorMode ? 'ہدف نامکمل' : 'Target missed')}
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-emerald-200 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span>{seniorMode ? 'ہفتہ وار کارکردگی اور 7 روزہ اوسط' : 'Weekly Activity & 7-Day Rolling Points'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {seniorMode
                ? 'روزانہ 5 سرگرمیوں کا تسلسل اور 7 روزہ اوسط پوائنٹس چارٹ'
                : 'Daily goal consistency bars with 7-day rolling average points trend'}
            </p>
          </div>
        </div>

        {/* View Switcher Chips */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-[10px] font-black self-start sm:self-auto">
          <button
            onClick={() => setChartView('combined')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              chartView === 'combined'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>{seniorMode ? 'مشترکہ' : 'Dual View'}</span>
          </button>
          <button
            onClick={() => setChartView('bars')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              chartView === 'bars'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3 h-3 text-emerald-600" />
            <span>{seniorMode ? 'صرف بارز' : 'Bars'}</span>
          </button>
          <button
            onClick={() => setChartView('rollingAvg')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
              chartView === 'rollingAvg'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-purple-600" />
            <span>{seniorMode ? '7 روزہ اوسط' : '7-Day Avg'}</span>
          </button>
        </div>
      </div>

      {/* RECHARTS CHART CONTAINER */}
      <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
        {/* Top metrics summary banner */}
        <div className="flex items-center justify-between mb-2 text-[11px] font-extrabold text-slate-600 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Target: 5 Activities</span>
            </span>
            {(chartView === 'combined' || chartView === 'rollingAvg') && (
              <span className="flex items-center gap-1 text-purple-700">
                <span className="w-2.5 h-1 bg-purple-500 rounded-full inline-block" />
                <span>7-Day Rolling Avg: ~{currentRollingAvg} Pts</span>
              </span>
            )}
          </div>
          <span className="text-slate-800 font-black">
            {daysHitTarget} / 7 {seniorMode ? 'دن ہدف حاصل' : 'Days Hit'} ({consistencyRate}%)
          </span>
        </div>

        {/* CHART 1: DUAL-AXIS COMPOSED CHART (Bars + 7-Day Rolling Avg Line) */}
        {chartView === 'combined' && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 12, right: 0, left: -22, bottom: 0 }}
              >
                <XAxis
                  dataKey={seniorMode ? 'urduDay' : 'day'}
                  stroke="#64748b"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                {/* Left Y-Axis: Daily Activities (0 to 8) */}
                <YAxis
                  yAxisId="left"
                  stroke="#059669"
                  fontSize={10}
                  fontWeight={700}
                  domain={[0, 8]}
                  ticks={[0, 2, 4, 5, 8]}
                  tickLine={false}
                  axisLine={false}
                />
                {/* Right Y-Axis: 7-Day Rolling Average Points (0 to 300 Pts) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#8b5cf6"
                  fontSize={9}
                  fontWeight={700}
                  domain={[100, 300]}
                  ticks={[150, 200, 250, 300]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                {/* Reference Line for 5 activities goal */}
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
                {/* Activity Bars */}
                <Bar
                  yAxisId="left"
                  dataKey="activities"
                  radius={[6, 6, 2, 2]}
                  animationDuration={800}
                >
                  {data.map((entry, index) => {
                    const isMet = entry.activities >= targetThreshold;
                    const isCurrent = entry.isToday;
                    let fillColor = '#94a3b8';
                    if (isMet) {
                      fillColor = isCurrent ? '#059669' : '#10b981';
                    } else if (entry.activities > 0) {
                      fillColor = '#f59e0b';
                    } else {
                      fillColor = '#e2e8f0';
                    }
                    return (
                      <Cell
                        key={index}
                        fill={fillColor}
                        stroke={isCurrent ? '#047857' : undefined}
                        strokeWidth={isCurrent ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
                {/* 7-Day Rolling Average Trend Line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rollingAvgPoints"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#7c3aed', stroke: '#ede9fe', strokeWidth: 2 }}
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CHART 2: PURE BARS (Daily Activities) */}
        {chartView === 'bars' && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
              >
                <XAxis
                  dataKey={seniorMode ? 'urduDay' : 'day'}
                  stroke="#64748b"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight={600}
                  domain={[0, 8]}
                  ticks={[0, 2, 4, 5, 8]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '🎯 Goal (5)',
                    fill: '#d97706',
                    fontSize: 10,
                    fontWeight: 800,
                    position: 'insideTopRight'
                  }}
                />
                <Bar
                  dataKey="activities"
                  radius={[8, 8, 4, 4]}
                  animationDuration={800}
                >
                  {data.map((entry, index) => {
                    const isMet = entry.activities >= targetThreshold;
                    const isCurrent = entry.isToday;
                    let fillColor = '#94a3b8';
                    if (isMet) {
                      fillColor = isCurrent ? '#059669' : '#10b981';
                    } else if (entry.activities > 0) {
                      fillColor = '#f59e0b';
                    } else {
                      fillColor = '#e2e8f0';
                    }
                    return (
                      <Cell
                        key={index}
                        fill={fillColor}
                        stroke={isCurrent ? '#047857' : undefined}
                        strokeWidth={isCurrent ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CHART 3: 7-DAY ROLLING AVERAGE POINTS AREA CHART */}
        {chartView === 'rollingAvg' && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 8, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rollingAvgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey={seniorMode ? 'urduDay' : 'day'}
                  stroke="#64748b"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  stroke="#8b5cf6"
                  fontSize={10}
                  fontWeight={700}
                  domain={[120, 280]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={200}
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  label={{
                    value: '200 Pts Baseline',
                    fill: '#7c3aed',
                    fontSize: 9,
                    fontWeight: 700,
                    position: 'insideTopLeft'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rollingAvgPoints"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#rollingAvgGrad)"
                  dot={{ r: 4, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#7c3aed' }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[10px] font-bold text-slate-600 mt-2 border-t border-slate-200/60 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Target Hit (≥ 5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>In Progress (&lt; 5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-purple-500 rounded-full" />
            <span>7-Day Rolling Avg (Pts)</span>
          </div>
        </div>
      </div>

      {/* DAY-BY-DAY STATUS PILLS */}
      <div className="grid grid-cols-7 gap-1">
        {data.map((item, idx) => {
          const isMet = item.activities >= targetThreshold;
          return (
            <div
              key={idx}
              className={`p-1.5 rounded-xl border text-center transition-all ${
                item.isToday
                  ? isMet
                    ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30'
                  : isMet
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-black uppercase">
                {seniorMode ? item.urduDay : item.day}
              </div>
              <div className="text-xs my-0.5">
                {isMet ? (
                  <span className="text-emerald-600 font-black">✓</span>
                ) : item.activities > 0 ? (
                  <span className="text-amber-600 font-bold">{item.activities}</span>
                ) : (
                  <span className="text-slate-300 font-light">-</span>
                )}
              </div>
              <div className="text-[8px] font-extrabold text-purple-700 truncate">
                ~{item.rollingAvgPoints}p
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMMARY STATS STRIP */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="text-base font-black text-emerald-900">{totalWeeklyActivities}</div>
          <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">
            {seniorMode ? 'کل سرگرمیاں' : 'Weekly Solved'}
          </div>
        </div>

        <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-2xl">
          <div className="text-base font-black text-purple-900 flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>{currentRollingAvg} Pts</span>
          </div>
          <div className="text-[9px] text-purple-700 font-bold uppercase tracking-wider">
            {seniorMode ? '7 روزہ اوسط' : '7-Day Rolling Avg'}
          </div>
        </div>

        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="text-base font-black text-amber-900 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{streakDays}d Streak</span>
          </div>
          <div className="text-[9px] text-amber-800 font-bold uppercase tracking-wider">
            {seniorMode ? 'روزانہ تسلسل' : 'Target Streak'}
          </div>
        </div>
      </div>
    </div>
  );
};
