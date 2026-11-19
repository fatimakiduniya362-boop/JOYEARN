import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Download,
  CheckCircle2,
  Trash2,
  WifiOff,
  RefreshCw,
  HardDrive,
  BookOpen,
  Pause,
  Play,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  X,
  CloudUpload,
} from 'lucide-react';
import { QuizItem } from '../types';
import { soundService } from '../services/soundService';
import {
  OfflinePackCatalogEntry,
  DownloadedOfflinePack,
  DownloadCheckpoint,
  StorageQuotaInfo,
  buildAuthorizedOfflineCatalog,
  listDownloadedPacks,
  listDownloadCheckpoints,
  getDownloadedPack,
  verifyDownloadedPackIntegrity,
  downloadOrResumeOfflinePack,
  removeDownloadedPack,
  getOfflineStorageQuotaInfo,
  formatStorageBytes,
  getOfflineCompletedLessonIds,
  getOfflineProgressQueue,
  recordOfflineLessonCompletion,
  syncOfflineLearningProgress,
  loadSyncedOfflineProgress,
} from '../services/offlineLearningService';

interface OfflineLearningPanelProps {
  quizzes: QuizItem[];
  userUid: string;
  seniorMode: boolean;
  onCompleteLesson?: (lessonId: string) => void;
  onRecordStreakActivity?: (label: string) => void;
}

export const OfflineLearningPanel: React.FC<OfflineLearningPanelProps> = ({
  quizzes,
  userUid,
  seniorMode,
  onCompleteLesson,
  onRecordStreakActivity,
}) => {
  const catalog = useMemo(() => buildAuthorizedOfflineCatalog(quizzes), [quizzes]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadedMap, setDownloadedMap] = useState<Record<string, DownloadedOfflinePack>>({});
  const [checkpointMap, setCheckpointMap] = useState<Record<string, DownloadCheckpoint>>({});
  const [corruptedIds, setCorruptedIds] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [packErrorMap, setPackErrorMap] = useState<Record<string, string>>({});
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null);

  const [completedIds, setCompletedIds] = useState<string[]>(() =>
    getOfflineCompletedLessonIds(userUid)
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(
    () =>
      getOfflineProgressQueue(userUid).filter((i) => i.status === 'pending_sync').length
  );
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(
    null
  );

  // Offline Lesson Study Player state
  const [activePack, setActivePack] = useState<DownloadedOfflinePack | null>(null);
  const [lessonIdx, setLessonIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshStorageState = useCallback(async () => {
    const [packs, cps, quota] = await Promise.all([
      listDownloadedPacks(),
      listDownloadCheckpoints(),
      getOfflineStorageQuotaInfo(),
    ]);

    const nextPacks: Record<string, DownloadedOfflinePack> = {};
    const nextCorrupted: Record<string, boolean> = {};
    for (const p of packs) {
      nextPacks[p.packId] = p;
      if (!verifyDownloadedPackIntegrity(p)) {
        nextCorrupted[p.packId] = true;
      }
    }

    const nextCps: Record<string, DownloadCheckpoint> = {};
    for (const c of cps) {
      nextCps[c.packId] = c;
    }

    setDownloadedMap(nextPacks);
    setCorruptedIds(nextCorrupted);
    setCheckpointMap(nextCps);
    setQuotaInfo(quota);
  }, []);

  const refreshProgressCounts = useCallback(() => {
    setCompletedIds(getOfflineCompletedLessonIds(userUid));
    setPendingSyncCount(
      getOfflineProgressQueue(userUid).filter((i) => i.status === 'pending_sync').length
    );
  }, [userUid]);

  const handleSyncNow = useCallback(
    async (silent = false) => {
      if (isSyncing) return;
      setIsSyncing(true);
      if (!silent) setSyncNotice(null);

      const res = await syncOfflineLearningProgress(userUid);
      setIsSyncing(false);
      refreshProgressCounts();

      if (res.success) {
        if (res.syncedCount > 0) {
          setSyncNotice({
            type: 'ok',
            text: `Synced ${res.syncedCount} offline lesson${res.syncedCount === 1 ? '' : 's'} to your account.`,
          });
        } else if (!silent) {
          setSyncNotice({ type: 'ok', text: 'All offline learning progress is up to date.' });
        }
      } else if (!silent && res.error) {
        setSyncNotice({ type: 'warn', text: res.error });
      }
    },
    [isSyncing, refreshProgressCounts, userUid]
  );

  // Initial load & cloud progress merge on login
  useEffect(() => {
    void refreshStorageState();
    refreshProgressCounts();
    loadSyncedOfflineProgress(userUid).then((merged) => {
      setCompletedIds(merged);
    });
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      void handleSyncNow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  // Auto-sync when connectivity returns
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOffline = () => {
      setIsOffline(true);
      setSyncNotice({
        type: 'warn',
        text: 'Offline mode active — downloaded lessons work without internet.',
      });
    };
    const onOnline = () => {
      setIsOffline(false);
      void handleSyncNow(false);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [handleSyncNow]);

  // Clean up any active abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleDownloadOrResume = async (entry: OfflinePackCatalogEntry) => {
    if (downloadingId) return;
    soundService.playClick();
    setDownloadingId(entry.packId);
    setPackErrorMap((prev) => {
      const next = { ...prev };
      delete next[entry.packId];
      return next;
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const result = await downloadOrResumeOfflinePack(entry, {
      signal: controller.signal,
      onProgress: (pct) => {
        setProgressMap((prev) => ({ ...prev, [entry.packId]: pct }));
      },
    });

    abortControllerRef.current = null;
    setDownloadingId(null);

    if (!result.success && result.error) {
      setPackErrorMap((prev) => ({ ...prev, [entry.packId]: result.error! }));
    } else if (result.success) {
      soundService.playCoin();
    }

    await refreshStorageState();
  };

  const handlePauseDownload = () => {
    soundService.playClick();
    abortControllerRef.current?.abort();
  };

  const handleRemovePack = async (packId: string) => {
    soundService.playClick();
    await removeDownloadedPack(packId);
    if (activePack?.packId === packId) {
      setActivePack(null);
    }
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[packId];
      return next;
    });
    setPackErrorMap((prev) => {
      const next = { ...prev };
      delete next[packId];
      return next;
    });
    await refreshStorageState();
  };

  const handleOpenOfflinePack = async (packId: string) => {
    soundService.playClick();
    const stored = await getDownloadedPack(packId);
    if (!stored || !verifyDownloadedPackIntegrity(stored)) {
      setCorruptedIds((prev) => ({ ...prev, [packId]: true }));
      setPackErrorMap((prev) => ({
        ...prev,
        [packId]: 'Downloaded pack appears incomplete or corrupted. Tap Retry to re-download.',
      }));
      return;
    }
    setActivePack(stored);
    setLessonIdx(0);
    setSelectedOption(null);
    setAnswered(false);
  };

  const handleAnswerOfflineLesson = (optionIdx: number) => {
    if (answered || !activePack) return;
    const currentItem = activePack.items[lessonIdx];
    if (!currentItem) return;

    setSelectedOption(optionIdx);
    setAnswered(true);

    const isCorrect = optionIdx === currentItem.correctIndex;
    if (isCorrect) {
      soundService.playCorrect();
      const rec = recordOfflineLessonCompletion(userUid, activePack.packId, currentItem.id);
      refreshProgressCounts();

      if (!rec.isDuplicate) {
        onCompleteLesson?.(currentItem.id);
        onRecordStreakActivity?.(`Offline Study: ${activePack.category}`);
        if (!isOffline) {
          void handleSyncNow(true);
        }
      }
    } else {
      soundService.playWrong();
    }
  };

  const handleNextOfflineLesson = () => {
    if (!activePack) return;
    soundService.playClick();
    if (lessonIdx < activePack.items.length - 1) {
      setLessonIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setActivePack(null);
    }
  };

  const downloadedCount = Object.keys(downloadedMap).filter((id) => !corruptedIds[id]).length;

  // =========================================================================
  // ACTIVE OFFLINE LESSON PLAYER VIEW (works completely offline)
  // =========================================================================
  if (activePack) {
    const item = activePack.items[lessonIdx];
    const alreadyDone = item ? completedIds.includes(item.id) : false;

    return (
      <div className="bg-white rounded-3xl border-2 border-rose-200 p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setActivePack(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs tap-bounce"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Packs</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-700">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isOffline ? 'Offline Ready' : 'Downloaded'}
            </span>
            <span>
              {lessonIdx + 1}/{activePack.items.length}
            </span>
          </div>
        </div>

        {item && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-black uppercase text-rose-600">
                {activePack.title}
              </span>
              {alreadyDone && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              )}
            </div>

            <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
              {seniorMode && item.urduQuestion ? item.urduQuestion : item.question}
            </h3>

            <div className="space-y-2">
              {item.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === item.correctIndex;
                let style = 'bg-slate-50 hover:bg-rose-50/50 border-slate-200 text-slate-800';
                if (answered) {
                  if (isCorrect) {
                    style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black';
                  } else if (isSelected) {
                    style = 'bg-rose-50 border-rose-400 text-rose-900 font-bold';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={answered}
                    onClick={() => handleAnswerOfflineLesson(idx)}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all tap-bounce ${style}`}
                  >
                    <span>{opt}</span>
                    {answered && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {answered && isSelected && !isCorrect && (
                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                {(item.fact || item.explanation) && (
                  <div className="p-2.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-slate-700 leading-relaxed">
                    <span className="font-black text-rose-800 block mb-0.5">Lesson Note:</span>
                    {item.fact || item.explanation}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>
                    {selectedOption === item.correctIndex
                      ? isOffline
                        ? 'Saved locally — queued for sync when online.'
                        : 'Progress saved.'
                      : 'Review the note above and continue.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextOfflineLesson}
                  className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs tap-bounce shadow-xs"
                >
                  {lessonIdx < activePack.items.length - 1
                    ? 'Next Offline Lesson →'
                    : 'Finish Study Pack'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // COMPACT OFFLINE LEARNING MODE BAR & EXPANDABLE PACK MANAGER
  // =========================================================================
  return (
    <div className="bg-white rounded-3xl border border-rose-200/90 shadow-xs overflow-hidden">
      {/* Compact Header Row */}
      <button
        type="button"
        onClick={() => {
          soundService.playClick();
          setIsExpanded((v) => !v);
        }}
        className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-rose-50/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs text-slate-900">
                {seniorMode ? 'آف لائن لرننگ موڈ' : 'Offline Learning Mode'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {downloadedCount} Saved
              </span>
              {pendingSyncCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingSyncCount} Pending Sync
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {isOffline
                ? 'Offline — open any downloaded study pack below'
                : 'Download study packs to learn without internet'}
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-rose-600 shrink-0">
          {isExpanded ? 'Hide' : 'Manage'}
        </span>
      </button>

      {/* Expandable Manager Body */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-rose-100 space-y-3">
          {/* Storage & Sync Bar */}
          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-2.5 flex items-center justify-between gap-2 flex-wrap text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <HardDrive className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                Used: {formatStorageBytes(quotaInfo?.offlinePacksBytes || 0)}
                {quotaInfo?.supported
                  ? ` • Free: ${formatStorageBytes(quotaInfo.remainingBytes)}`
                  : ''}
              </span>
            </div>

            {pendingSyncCount > 0 && (
              <button
                type="button"
                disabled={isSyncing || isOffline}
                onClick={() => handleSyncNow(false)}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black text-[10.5px] flex items-center gap-1 tap-bounce"
              >
                <CloudUpload className="w-3 h-3" />
                <span>{isSyncing ? 'Syncing...' : isOffline ? 'Queued (Offline)' : 'Sync Now'}</span>
              </button>
            )}
          </div>

          {quotaInfo?.lowStorage && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Low device storage detected. Remove old packs before downloading more.</span>
            </div>
          )}

          {syncNotice && (
            <div
              className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-2 border ${
                syncNotice.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : syncNotice.type === 'warn'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{syncNotice.text}</span>
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                className="font-bold opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Authorized Lesson Packs List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {catalog.map((entry) => {
              const savedPack = downloadedMap[entry.packId];
              const isCorrupted = Boolean(corruptedIds[entry.packId]);
              const isAvailableOffline = Boolean(savedPack && !isCorrupted);
              const checkpoint = checkpointMap[entry.packId];
              const isThisDownloading = downloadingId === entry.packId;
              const pct = isThisDownloading
                ? progressMap[entry.packId] ?? 0
                : checkpoint
                ? Math.round((checkpoint.savedItems.length / checkpoint.totalItems) * 100)
                : 0;
              const packError = packErrorMap[entry.packId];

              const packCompletedCount = entry.items.filter((i) =>
                completedIds.includes(i.id)
              ).length;

              return (
                <div
                  key={entry.packId}
                  className="p-2.5 rounded-2xl border border-slate-200/90 bg-white space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {entry.title}
                        </span>
                        {isAvailableOffline && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Offline ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">
                        {entry.itemCount} lessons • {formatStorageBytes(entry.estimatedBytes)} •{' '}
                        {packCompletedCount}/{entry.itemCount} done
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isThisDownloading ? (
                        <button
                          type="button"
                          onClick={handlePauseDownload}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-[11px] flex items-center gap-1 tap-bounce"
                        >
                          <Pause className="w-3 h-3" />
                          <span>{pct}%</span>
                        </button>
                      ) : isAvailableOffline ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenOfflinePack(entry.packId)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 tap-bounce"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Study</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePack(entry.packId)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 tap-bounce"
                            title="Remove downloaded pack"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(downloadingId) || isOffline}
                          onClick={() => handleDownloadOrResume(entry)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-black text-[11px] flex items-center gap-1 tap-bounce"
                        >
                          {isCorrupted ? (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </>
                          ) : checkpoint ? (
                            <>
                              <Play className="w-3 h-3 fill-rose-700" />
                              <span>Resume {pct}%</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {(isThisDownloading || checkpoint) && !isAvailableOffline && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 transition-all duration-150"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  )}

                  {packError && (
                    <p className="text-[10.5px] text-rose-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{packError}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
