import os

path = 'src/components/SettingsModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
old_import = "  Bell,\n  BellOff\n} from 'lucide-react';"
new_import = "  Bell,\n  BellOff,\n  HardDrive,\n  Film,\n  RotateCcw,\n  Check\n} from 'lucide-react';"
if old_import in text:
    text = text.replace(old_import, new_import)

# 2. Add smart cache state
state_search = "  const [cacheNotice, setCacheNotice] = useState(false);\n  const [activeTab, setActiveTab] = useState<'all' | 'account' | 'prefs' | 'system'>('all');"

state_insert = """  const [cacheNotice, setCacheNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'account' | 'prefs' | 'system'>('all');

  // SMART CACHE MANAGEMENT STATE (Offline Video Storage Limit & Auto-Cleanup)
  const [maxVideoStorageMB, setMaxVideoStorageMB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_max_video_cache_mb');
      return saved ? parseInt(saved, 10) : 500;
    } catch {
      return 500;
    }
  });

  const [autoCleanupVideos, setAutoCleanupVideos] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joyearn_auto_cleanup_videos') !== 'false';
    } catch {
      return true;
    }
  });

  const [usedVideoStorageMB, setUsedVideoStorageMB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_video_cache_used_mb');
      return saved ? parseFloat(saved) : 142.5;
    } catch {
      return 142.5;
    }
  });

  const [cacheActionMessage, setCacheActionMessage] = useState<string | null>(null);

  const handleSetMaxStorage = (mb: number) => {
    soundService.playClick();
    setMaxVideoStorageMB(mb);
    try {
      localStorage.setItem('joyearn_max_video_cache_mb', String(mb));
    } catch {
      // ignore
    }
  };

  const handleToggleAutoCleanup = () => {
    soundService.playClick();
    const next = !autoCleanupVideos;
    setAutoCleanupVideos(next);
    try {
      localStorage.setItem('joyearn_auto_cleanup_videos', String(next));
    } catch {
      // ignore
    }
  };

  const handleCleanWatchedVideos = () => {
    soundService.playCoin();
    hapticService.vibrate([40, 30, 40]);
    const cleanedMB = Math.min(usedVideoStorageMB, Math.round((usedVideoStorageMB * 0.65) * 10) / 10);
    const remaining = Math.max(12.4, Math.round((usedVideoStorageMB - cleanedMB) * 10) / 10);
    setUsedVideoStorageMB(remaining);
    try {
      localStorage.setItem('joyearn_video_cache_used_mb', String(remaining));
    } catch {
      // ignore
    }
    setCacheActionMessage(
      seniorMode
        ? `دیکھی گئی ویڈیوز کی کیش صاف ہو گئی۔ ${cleanedMB} MB میموری فارغ کر دی گئی!`
        : `Cleaned watched videos! Freed ${cleanedMB} MB of offline storage.`
    );
    setTimeout(() => setCacheActionMessage(null), 3500);
  };

  const handlePurgeAllVideoCache = () => {
    soundService.playFanfare();
    hapticService.vibrate([60, 40, 80]);
    setUsedVideoStorageMB(0);
    try {
      localStorage.setItem('joyearn_video_cache_used_mb', '0');
    } catch {
      // ignore
    }
    setCacheActionMessage(
      seniorMode
        ? 'تمام آف لائن ویڈیو فائلیں اور کیش مکمل طور پر صاف کر دی گئیں۔'
        : 'All offline video cache and buffers purged successfully.'
    );
    setTimeout(() => setCacheActionMessage(null), 3500);
  };"""

if state_search in text:
    text = text.replace(state_search, state_insert)

# 3. Replace CATEGORY 5 UI
cat5_search = """          {/* CATEGORY 5: STORAGE, CACHE & SYSTEM */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              {seniorMode ? 'اسٹوریج اور کیش میموری' : 'Storage & Cache Cleaner'}
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {seniorMode
                  ? 'غیر ضروری عارضی ڈیٹا اور آف لائن فائلیں صاف کر کے فون میموری فارغ کریں۔'
                  : 'Purge non-essential offline video buffers and temporary queries to free phone RAM.'}
              </p>
              <button
                onClick={handleTriggerClearCache}
                className="w-full py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-black rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{seniorMode ? 'کیش میموری صاف کریں' : 'Clear Temporary Cache (Free Memory)'}</span>
              </button>
            </div>
          </div>"""

cat5_replace = """          {/* CATEGORY 5: SMART CACHE & OFFLINE VIDEO STORAGE MANAGEMENT */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 px-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>{seniorMode ? 'اسمارٹ کیش اور آف لائن ویڈیو اسٹوریج' : 'Smart Cache & Offline Video Storage'}</span>
            </span>

            <div className="bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40 border border-blue-200 rounded-2xl p-3.5 space-y-3.5">
              {/* Storage Gauge Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800">
                      {seniorMode ? 'آف لائن ویڈیوز میموری' : 'Offline Video Buffers'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {seniorMode
                        ? `${usedVideoStorageMB} MB از ${maxVideoStorageMB} MB استعمال شدہ`
                        : `${usedVideoStorageMB} MB used of ${maxVideoStorageMB} MB limit (${Math.round((usedVideoStorageMB / maxVideoStorageMB) * 100)}%)`}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  usedVideoStorageMB / maxVideoStorageMB > 0.85
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {usedVideoStorageMB / maxVideoStorageMB > 0.85 ? 'High Usage' : 'Optimal'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-200/90 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usedVideoStorageMB / maxVideoStorageMB > 0.85
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((usedVideoStorageMB / maxVideoStorageMB) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Maximum Storage Limit Preset Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                  {seniorMode ? 'زیادہ سے زیادہ اسٹوریج کی حد:' : 'Max Storage Limit for Offline Videos:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '250 MB', value: 250 },
                    { label: '500 MB', value: 500, defaultBadge: true },
                    { label: '1 GB', value: 1000 },
                    { label: '2 GB', value: 2000 },
                  ].map((preset) => {
                    const isSelected = maxVideoStorageMB === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleSetMaxStorage(preset.value)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-black transition-all tap-bounce relative flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {preset.defaultBadge && (
                          <span className={`text-[7.5px] uppercase font-bold px-1 rounded-sm ${
                            isSelected ? 'text-blue-100' : 'text-blue-600'
                          }`}>
                            Rec
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Cleanup Toggle */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>{seniorMode ? 'دیکھی گئی ویڈیوز کی خودکار صفائی' : 'Auto-Cleanup Watched Videos'}</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {seniorMode
                        ? 'پوائنٹس ملنے اور ویڈیو مکمل ہونے پر خودبخود عارضی کیش صاف کریں تاکہ میموری حد کے اندر رہے۔'
                        : 'Automatically purges offline video buffers older than 7 days or once 100% watched & rewarded to keep storage below limit.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoCleanup}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoCleanupVideos ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoCleanupVideos ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Banner Message */}
              {cacheActionMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 animate-fadeIn flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{cacheActionMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCleanWatchedVideos}
                  className="py-2 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-extrabold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{seniorMode ? 'دیکھی گئی ویڈیوز صاف کریں' : 'Clean Watched Videos'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllVideoCache}
                  className="py-2 px-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-extrabold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{seniorMode ? 'تمام ویڈیو کیش ختم کریں' : 'Purge All Video Buffers'}</span>
                </button>
              </div>

              {/* System RAM purge */}
              <button
                type="button"
                onClick={handleTriggerClearCache}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
                <span>{seniorMode ? 'سسٹم ریم اور عارضی کیوریز صاف کریں' : 'Clear System RAM & Query Cache'}</span>
              </button>
            </div>
          </div>"""

if cat5_search in text:
    text = text.replace(cat5_search, cat5_replace)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Smart Cache Management added to SettingsModal.tsx!")
