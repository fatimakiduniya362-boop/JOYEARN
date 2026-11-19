import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Flag,
  Ban,
  Camera,
  Plus,
  Send,
  X,
  CheckCircle2,
  Sparkles,
  Music2,
  ExternalLink,
} from 'lucide-react';
import { AppUser } from '../types';
import {
  VlogItem,
  ReelComment,
  getPlayableVlogUrl,
  getLikedReelIds,
  getEffectiveReelLikeCount,
  toggleReelLike,
  toggleVlogLike,
  getUserLikedVlogIds,
  getSavedReelIds,
  toggleReelSave,
  getReelComments,
  addReelComment,
  getReelsRewardedToday,
  recordReelWatchReward,
  MAX_DAILY_REEL_WATCH_REWARDS,
  REEL_WATCH_BONUS_POINTS,
} from '../services/vlogService';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import {
  getDataSaverPreferences,
  getNetworkProfile,
  resolveVideoPlaybackPolicy,
  buildYouTubeEmbedUrl,
} from '../services/dataSaverService';

interface ReelsViewerProps {
  reels: VlogItem[];
  currentUser: AppUser | null;
  seniorMode?: boolean;
  initialReelId?: string | null;
  onReportVlog: (vlog: VlogItem) => void;
  onBlockCreator: (uid: string, creatorName: string) => void;
  onCreateReel: () => void;
  onOpenCamera?: () => void;
  onOpenAuth?: () => void;
  onEarnPoints?: (points: number, reason: string) => void;
}

export const ReelsViewer: React.FC<ReelsViewerProps> = ({
  reels,
  currentUser,
  seniorMode = false,
  initialReelId = null,
  onReportVlog,
  onBlockCreator,
  onCreateReel,
  onOpenCamera,
  onOpenAuth,
  onEarnPoints,
}) => {
  const { light, success, warning } = useHaptics();
  const uid = currentUser?.uid || null;

  const [reelFilter, setReelFilter] = useState<'all' | 'saved'>('all');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [pausedMap, setPausedMap] = useState<Record<string, boolean>>({});
  const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});
  const [nativeUrlMap, setNativeUrlMap] = useState<Record<string, string>>({});
  const [videoProgressMap, setVideoProgressMap] = useState<Record<string, { current: number; duration: number }>>({});
  const [failedEmbedMap, setFailedEmbedMap] = useState<Record<string, boolean>>({});

  // Persistent engagement states
  const [likedIds, setLikedIds] = useState<string[]>(() => getLikedReelIds(uid));
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedReelIds(uid));
  const [rewardedTodayIds, setRewardedTodayIds] = useState<string[]>(() => getReelsRewardedToday(uid));

  // Comments bottom sheet state
  const [commentReel, setCommentReel] = useState<VlogItem | null>(null);
  const [commentsList, setCommentsList] = useState<ReelComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  // Micro-feedback overlays
  const [doubleTapHeartId, setDoubleTapHeartId] = useState<string | null>(null);
  const [tapPlayFeedbackId, setTapPlayFeedbackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [watchSecondsOnActive, setWatchSecondsOnActive] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // Sync user engagement states when account changes
  useEffect(() => {
    setLikedIds(getLikedReelIds(uid));
    setSavedIds(getSavedReelIds(uid));
    setRewardedTodayIds(getReelsRewardedToday(uid));
  }, [uid]);

  // Seed initial like counts map
  useEffect(() => {
    const nextCounts: Record<string, number> = {};
    reels.forEach((r) => {
      nextCounts[r.id] = getEffectiveReelLikeCount(r);
    });
    setLikeCounts(nextCounts);
  }, [reels]);

  const visibleReels = useMemo(() => {
    if (reelFilter === 'saved') {
      return reels.filter((r) => savedIds.includes(r.id));
    }
    return reels;
  }, [reels, reelFilter, savedIds]);

  // Clamp active index when filter changes
  useEffect(() => {
    if (activeIndex >= visibleReels.length) {
      setActiveIndex(0);
    }
  }, [visibleReels.length, activeIndex]);

  // Jump to initialReelId if passed from Feed
  useEffect(() => {
    if (!initialReelId || visibleReels.length === 0) return;
    const idx = visibleReels.findIndex((r) => r.id === initialReelId);
    if (idx >= 0) {
      setActiveIndex(idx);
      setTimeout(() => {
        slideRefs.current[idx]?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      }, 40);
    }
  }, [initialReelId, visibleReels.length]);

  const activeReel = visibleReels[activeIndex] || null;

  // Resolve native playable URL for active + adjacent reels
  useEffect(() => {
    const indices = [activeIndex - 1, activeIndex, activeIndex + 1].filter(
      (i) => i >= 0 && i < visibleReels.length
    );
    indices.forEach((i) => {
      const reel = visibleReels[i];
      if (!reel) return;
      const isNative =
        reel.videoType === 'upload' ||
        reel.videoType === 'recorded' ||
        Boolean(reel.nativeMediaId) ||
        !reel.videoId;

      if (isNative && !nativeUrlMap[reel.id]) {
        getPlayableVlogUrl(reel).then((url) => {
          if (url) {
            setNativeUrlMap((prev) => (prev[reel.id] ? prev : { ...prev, [reel.id]: url }));
          }
        });
      }
    });
  }, [activeIndex, visibleReels, nativeUrlMap]);

  // Observe visible reel slide cleanly on vertical snap scroll
  useEffect(() => {
    const root = containerRef.current;
    if (!root || visibleReels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            const idxAttr = entry.target.getAttribute('data-reel-index');
            if (idxAttr !== null) {
              const idx = parseInt(idxAttr, 10);
              if (!Number.isNaN(idx)) {
                setActiveIndex(idx);
              }
            }
          }
        });
      },
      { root, threshold: 0.65 }
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleReels]);

  // Autoplay / pause native video elements based on activeIndex & pausedMap
  useEffect(() => {
    visibleReels.forEach((reel, idx) => {
      const vid = videoRefs.current[reel.id];
      if (!vid) return;
      const shouldPlay = idx === activeIndex && !pausedMap[reel.id] && !commentReel;
      if (shouldPlay) {
        vid.muted = isMuted;
        vid.play().catch(() => {
          // Browser autoplay policy fallback: retry muted if blocked
          vid.muted = true;
          vid.play().catch(() => {});
        });
      } else {
        vid.pause();
      }
    });
  }, [activeIndex, pausedMap, isMuted, visibleReels, commentReel]);

  // Watch-to-Earn 5s progress tracker per active reel
  useEffect(() => {
    setWatchSecondsOnActive(0);
    if (!activeReel || pausedMap[activeReel.id] || commentReel) return;
    if (rewardedTodayIds.includes(activeReel.id)) return;
    if (rewardedTodayIds.length >= MAX_DAILY_REEL_WATCH_REWARDS) return;

    const interval = window.setInterval(() => {
      setWatchSecondsOnActive((prev) => {
        const next = prev + 1;
        if (next >= 5) {
          window.clearInterval(interval);
          const res = recordReelWatchReward(activeReel.id, uid);
          if (res.awarded) {
            setRewardedTodayIds((curr) => (curr.includes(activeReel.id) ? curr : [...curr, activeReel.id]));
            onEarnPoints?.(REEL_WATCH_BONUS_POINTS, `Watched Reel: ${activeReel.title}`);
            showToast(
              seniorMode
                ? `+${REEL_WATCH_BONUS_POINTS} جوائز پوائنٹس ملے!`
                : `+${REEL_WATCH_BONUS_POINTS} JP earned for watching Reel!`
            );
          }
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeReel?.id, pausedMap, commentReel, rewardedTodayIds, uid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  const scrollToIndex = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(visibleReels.length - 1, targetIdx));
    soundService.playClick();
    slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth' });
    setActiveIndex(clamped);
  };

  useEffect(() => {
    let active = true;
    if (uid && uid !== 'guest' && visibleReels.length > 0) {
      getUserLikedVlogIds(
        uid,
        visibleReels.map((r) => r.id)
      ).then((set) => {
        if (active) setLikedIds(Array.from(set));
      });
    }
    return () => {
      active = false;
    };
  }, [uid, visibleReels]);

  const handleToggleLike = async (reel: VlogItem) => {
    light();
    if (!uid || uid === 'guest') {
      showToast('Please sign in with Google to like videos.');
      return;
    }
    const cloudRes = await toggleVlogLike(reel.id, uid);
    if (!cloudRes.error) {
      setLikedIds((prev) =>
        cloudRes.liked ? Array.from(new Set([...prev, reel.id])) : prev.filter((id) => id !== reel.id)
      );
      setLikeCounts((prev) => ({ ...prev, [reel.id]: cloudRes.likeCount }));
    } else {
      showToast(cloudRes.error);
    }
  };

  const handleToggleSave = (reel: VlogItem) => {
    soundService.playClick();
    const saved = toggleReelSave(reel.id, uid);
    setSavedIds((prev) =>
      saved ? Array.from(new Set([...prev, reel.id])) : prev.filter((id) => id !== reel.id)
    );
    showToast(
      saved
        ? seniorMode ? 'ریل محفوظ ہوگئی' : 'Saved to your Reels'
        : seniorMode ? 'محفوظ فہرست سے ہٹایا گیا' : 'Removed from Saved Reels'
    );
  };

  const handleShareReel = async (reel: VlogItem) => {
    soundService.playClick();
    const shareText = `Watch "${reel.title}" by ${reel.creatorName} on JoyEarn Reels!`;
    const shareUrl = reel.videoId
      ? `https://youtu.be/${reel.videoId}`
      : typeof window !== 'undefined'
      ? window.location.href
      : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: reel.title, text: shareText, url: shareUrl });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`.trim());
      showToast(seniorMode ? 'لنک کاپی ہوگیا!' : 'Reel link copied to clipboard!');
    } catch {
      showToast(seniorMode ? 'شیئر کے لیے تیار' : 'Ready to share!');
    }
  };

  const handleVideoSurfaceTap = (reel: VlogItem) => {
    const now = Date.now();
    const prevTap = lastTapRef.current;

    if (prevTap && prevTap.id === reel.id && now - prevTap.time < 280) {
      // Double tap -> Like
      lastTapRef.current = null;
      if (!likedIds.includes(reel.id)) {
        handleToggleLike(reel);
      } else {
        light();
      }
      setDoubleTapHeartId(reel.id);
      window.setTimeout(() => {
        setDoubleTapHeartId((curr) => (curr === reel.id ? null : curr));
      }, 650);
      return;
    }

    lastTapRef.current = { id: reel.id, time: now };

    // Toggle play/pause on single tap (for native videos)
    setPausedMap((prev) => ({ ...prev, [reel.id]: !prev[reel.id] }));
    setTapPlayFeedbackId(reel.id);
    window.setTimeout(() => {
      setTapPlayFeedbackId((curr) => (curr === reel.id ? null : curr));
    }, 550);
  };

  const openCommentsForReel = (reel: VlogItem) => {
    soundService.playClick();
    setCommentError(null);
    setCommentInput('');
    setCommentsList(getReelComments(reel.id));
    setCommentReel(reel);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentReel) return;

    if (!currentUser) {
      onOpenAuth?.();
      return;
    }

    const res = addReelComment(
      commentReel.id,
      currentUser.uid,
      currentUser.displayName || 'Community Learner',
      commentInput
    );

    if (!res.success) {
      warning();
      setCommentError(res.error || 'Could not post comment.');
      return;
    }

    success();
    setCommentError(null);
    setCommentInput('');
    setCommentsList(getReelComments(commentReel.id));
  };

  const formatSeconds = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="relative w-full h-[calc(100vh-225px)] min-h-[490px] max-h-[700px] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl select-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          scrollToIndex(activeIndex + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          scrollToIndex(activeIndex - 1);
        }
      }}
    >
      {/* Top Overlay Controls (Compact, Clean Scrim) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2 pointer-events-none">
        {/* Filter Tabs: All Reels / Saved */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setReelFilter('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[34px] ${
              reelFilter === 'all'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {seniorMode ? 'تمام ریلز' : 'All Reels'} ({reels.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setReelFilter('saved');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[34px] ${
              reelFilter === 'saved'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {seniorMode ? 'محفوظ' : 'Saved'} ({savedIds.filter((id) => reels.some((r) => r.id === id)).length})
          </button>
        </div>

        {/* Right Top Actions: Camera & Post Reel */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {onOpenCamera && (
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenCamera();
              }}
              className="min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/15 flex items-center justify-center gap-1 text-xs font-bold whitespace-nowrap transition-colors"
              title="Record a 60s Reel with Camera Studio"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{seniorMode ? 'کیمرہ' : 'Record'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onCreateReel();
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 text-xs font-bold whitespace-nowrap shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'ریل بنائیں' : 'Post Reel'}</span>
          </button>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Empty State */}
      {visibleReels.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 space-y-4 bg-slate-950">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-3xl">
            🎞️
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-black text-white">
              {reelFilter === 'saved'
                ? seniorMode ? 'کوئی محفوظ ریل نہیں' : 'No Saved Reels Yet'
                : seniorMode ? 'ابھی کوئی ریل موجود نہیں' : 'No Community Reels Yet'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {reelFilter === 'saved'
                ? 'Tap the Bookmark button while watching any Reel to save it for quick offline access.'
                : 'Be the first creator to record a 60-second Reel or upload a short clip!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {reelFilter === 'saved' ? (
              <button
                type="button"
                onClick={() => setReelFilter('all')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Browse All Reels
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateReel}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Reel</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Vertical Snap-Scroll Reels Container */
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-none"
        >
          {visibleReels.map((reel, idx) => {
            const isActive = idx === activeIndex;
            const isNear = Math.abs(idx - activeIndex) <= 1;
            const isLiked = likedIds.includes(reel.id);
            const isSaved = savedIds.includes(reel.id);
            const isPaused = Boolean(pausedMap[reel.id]);
            const isNative =
              reel.videoType === 'upload' ||
              reel.videoType === 'recorded' ||
              Boolean(reel.nativeMediaId) ||
              !reel.videoId;
            const nativeSrc = nativeUrlMap[reel.id] || reel.videoUrl;
            const progress = videoProgressMap[reel.id];
            const progressPct =
              progress && progress.duration > 0
                ? Math.min(100, (progress.current / progress.duration) * 100)
                : 0;
            const totalLikes = likeCounts[reel.id] ?? (reel.likeCount || 0);
            const commentCount = getReelComments(reel.id).length || reel.commentCount || 0;
            const isRewarded = rewardedTodayIds.includes(reel.id);
            const canEarnReward =
              !isRewarded && rewardedTodayIds.length < MAX_DAILY_REEL_WATCH_REWARDS;

            return (
              <div
                key={reel.id}
                data-reel-index={idx}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                className="relative w-full h-full min-h-[490px] snap-start snap-always bg-slate-950 flex items-center justify-center overflow-hidden"
              >
                {/* Background blurred poster for visual richness around aspect ratios */}
                {reel.thumbnail && (
                  <img
                    src={reel.thumbnail}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-25 blur-2xl scale-110 pointer-events-none"
                  />
                )}

                {/* Main Video / Embed Layer */}
                {isNative && nativeSrc ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[reel.id] = el;
                    }}
                    src={nativeSrc}
                    poster={reel.thumbnail}
                    playsInline
                    loop
                    muted={isMuted}
                    preload={
                      resolveVideoPlaybackPolicy(getDataSaverPreferences(), getNetworkProfile(), 'direct_file').preloadMode === 'none'
                        ? 'none'
                        : isNear
                          ? 'metadata'
                          : 'none'
                    }
                    onClick={() => handleVideoSurfaceTap(reel)}
                    onTimeUpdate={(e) => {
                      const vid = e.currentTarget;
                      setVideoProgressMap((prev) => ({
                        ...prev,
                        [reel.id]: {
                          current: vid.currentTime || 0,
                          duration: vid.duration || 0,
                        },
                      }));
                    }}
                    className="relative z-10 w-full h-full object-contain bg-black cursor-pointer"
                  />
                ) : reel.videoId && isNear && !failedEmbedMap[reel.id] ? (() => {
                  const reelYtPolicy = resolveVideoPlaybackPolicy(
                    getDataSaverPreferences(),
                    getNetworkProfile(),
                    'youtube'
                  );
                  return (
                    <div className="relative z-10 w-full h-full flex items-center justify-center bg-black">
                      <iframe
                        src={buildYouTubeEmbedUrl(reel.videoId, {
                          ...reelYtPolicy,
                          shouldAutoplay: reelYtPolicy.shouldAutoplay && isActive && !isPaused,
                        }, { mute: isMuted, loop: true })}
                        title={reel.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        onError={() =>
                          setFailedEmbedMap((prev) => ({ ...prev, [reel.id]: true }))
                        }
                      />
                    </div>
                  );
                })() : (
                  /* Thumbnail Poster Fallback */
                  <div
                    onClick={() => handleVideoSurfaceTap(reel)}
                    className="relative z-10 w-full h-full flex items-center justify-center bg-slate-950 cursor-pointer"
                  >
                    {reel.thumbnail ? (
                      <img
                        src={reel.thumbnail}
                        alt={reel.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Play className="w-10 h-10 text-rose-400 mx-auto" />
                        <p className="text-xs text-slate-300 font-semibold">{reel.title}</p>
                      </div>
                    )}
                    {reel.videoId && failedEmbedMap[reel.id] && (
                      <a
                        href={`https://www.youtube.com/watch?v=${reel.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute z-20 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Video on YouTube</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Double-Tap Heart Animation */}
                {doubleTapHeartId === reel.id && (
                  <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none animate-ping">
                    <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                  </div>
                )}

                {/* Single-Tap Play/Pause Indicator */}
                {isNative && (tapPlayFeedbackId === reel.id || isPaused) && (
                  <button
                    type="button"
                    onClick={() => handleVideoSurfaceTap(reel)}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 transition-opacity"
                    aria-label={isPaused ? 'Play reel' : 'Pause reel'}
                  >
                    <div className="w-14 h-14 rounded-full bg-black/65 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center">
                      {isPaused ? (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      ) : (
                        <Pause className="w-6 h-6" />
                      )}
                    </div>
                  </button>
                )}

                {/* Bottom Measured Scrim + Creator & Metadata */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pr-16 bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none">
                  <div className="space-y-2 pointer-events-auto">
                    {/* Watch-to-Earn Compact Indicator */}
                    {(canEarnReward || isRewarded) && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 tabular-nums">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {isRewarded ? (
                          <span>+{REEL_WATCH_BONUS_POINTS} JP Claimed</span>
                        ) : (
                          <span>
                            Watch {Math.max(0, 5 - watchSecondsOnActive)}s for +{REEL_WATCH_BONUS_POINTS} JP
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-300">
                          {rewardedTodayIds.length}/{MAX_DAILY_REEL_WATCH_REWARDS} today
                        </span>
                      </div>
                    )}

                    {/* Creator Row & Clean Unboxed Metadata */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-xs font-black text-white shrink-0 border border-white/25">
                        {reel.creatorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {reel.creatorName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                          <span className="capitalize">{reel.category}</span>
                          {reel.duration && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{reel.duration}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {idx + 1}/{visibleReels.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Expandable Description */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDescMap((prev) => ({ ...prev, [reel.id]: !prev[reel.id] }))
                      }
                      className="text-left block w-full"
                    >
                      <h3 className="text-sm font-black text-white leading-snug">
                        {reel.title}
                      </h3>
                      {reel.description && (
                        <p
                          className={`text-xs text-slate-200/90 mt-1 leading-relaxed ${
                            expandedDescMap[reel.id] ? '' : 'line-clamp-2'
                          }`}
                        >
                          {reel.description}
                        </p>
                      )}
                    </button>

                    {/* Audio / Format Footer Line */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                      <Music2 className="w-3 h-3 text-pink-400 shrink-0" />
                      <span className="truncate">
                        {reel.audioTrack ||
                          (reel.videoType === 'recorded'
                            ? 'JoyEarn Studio Voice Audio · Original'
                            : 'Community Reel Audio')}
                      </span>
                    </div>

                    {/* Native Video Interactive Progress Bar */}
                    {isNative && nativeSrc && (
                      <div className="pt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={progress?.duration || 100}
                          step={0.1}
                          value={progress?.current || 0}
                          onChange={(e) => {
                            const vid = videoRefs.current[reel.id];
                            const val = parseFloat(e.target.value);
                            if (vid && Number.isFinite(val)) {
                              vid.currentTime = val;
                            }
                          }}
                          aria-label="Seek video progress"
                          className="w-full h-1 accent-rose-500 cursor-pointer"
                        />
                        {progress && progress.duration > 0 && (
                          <span className="text-[10px] font-mono tabular-nums text-slate-300 shrink-0">
                            {formatSeconds(progress.current)}/{formatSeconds(progress.duration)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Subtle thin progress bar if native video duration loaded */}
                    {!isNative && progressPct > 0 && (
                      <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Thumb-Zone Vertical Action Rail (44px+ touch targets) */}
                <div className="absolute right-2.5 bottom-16 z-30 flex flex-col items-center gap-2">
                  {/* Up / Down Reel Stepper (especially handy on desktop/trackpads) */}
                  <div className="flex flex-col items-center gap-1 mb-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => scrollToIndex(idx - 1)}
                      className="min-w-[40px] min-h-[40px] rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/15 flex items-center justify-center disabled:opacity-30 transition-colors"
                      title="Previous Reel"
                      aria-label="Previous Reel"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx >= visibleReels.length - 1}
                      onClick={() => scrollToIndex(idx + 1)}
                      className="min-w-[40px] min-h-[40px] rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/15 flex items-center justify-center disabled:opacity-30 transition-colors"
                      title="Next Reel"
                      aria-label="Next Reel"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Like */}
                  <button
                    type="button"
                    onClick={() => handleToggleLike(reel)}
                    className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white transition-transform active:scale-90"
                    aria-label={isLiked ? 'Unlike reel' : 'Like reel'}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm border ${
                        isLiked
                          ? 'bg-rose-600/90 border-rose-400 text-white'
                          : 'bg-black/55 border-white/15 text-white hover:bg-black/75'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums drop-shadow">
                      {totalLikes}
                    </span>
                  </button>

                  {/* Comments */}
                  <button
                    type="button"
                    onClick={() => openCommentsForReel(reel)}
                    className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white transition-transform active:scale-90"
                    aria-label="Open reel comments"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 backdrop-blur-sm flex items-center justify-center">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums drop-shadow">
                      {commentCount}
                    </span>
                  </button>

                  {/* Save / Bookmark */}
                  <button
                    type="button"
                    onClick={() => handleToggleSave(reel)}
                    className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white transition-transform active:scale-90"
                    aria-label={isSaved ? 'Remove saved reel' : 'Save reel'}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm border ${
                        isSaved
                          ? 'bg-amber-500/90 border-amber-300 text-slate-950'
                          : 'bg-black/55 border-white/15 text-white hover:bg-black/75'
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">
                      {isSaved ? 'Saved' : 'Save'}
                    </span>
                  </button>

                  {/* Share */}
                  <button
                    type="button"
                    onClick={() => handleShareReel(reel)}
                    className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-white transition-transform active:scale-90"
                    aria-label="Share reel"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 backdrop-blur-sm flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">Share</span>
                  </button>

                  {/* Mute Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setIsMuted((prev) => !prev);
                    }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
                    aria-label={isMuted ? 'Unmute reels' : 'Mute reels'}
                    title={isMuted ? 'Unmute audio' : 'Mute audio'}
                  >
                    <div className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 backdrop-blur-sm flex items-center justify-center">
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Safety Report & Block */}
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onReportVlog(reel)}
                      className="w-8 h-8 rounded-full bg-black/55 hover:bg-rose-950/90 border border-white/15 text-slate-300 hover:text-rose-300 flex items-center justify-center"
                      title="Report Reel"
                      aria-label="Report Reel"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBlockCreator(reel.uid, reel.creatorName)}
                      className="w-8 h-8 rounded-full bg-black/55 hover:bg-amber-950/90 border border-white/15 text-slate-300 hover:text-amber-300 flex items-center justify-center"
                      title="Block Creator"
                      aria-label="Block Creator"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Up Comments Bottom Sheet Drawer */}
      {commentReel && (
        <div
          className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setCommentReel(null)}
        >
          <div
            className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[75%] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-sm font-black text-white">
                  {seniorMode ? 'تبصرے' : 'Reel Comments'} ({commentsList.length})
                </h4>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  {commentReel.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommentReel(null)}
                className="min-w-[40px] min-h-[40px] rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center"
                aria-label="Close comments"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No comments yet. Share a friendly, encouraging comment!
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-black text-white shrink-0">
                      {c.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-200">{c.authorName}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Composer */}
            <form
              onSubmit={handleSubmitComment}
              className="p-3 border-t border-slate-800 bg-slate-950 space-y-2 shrink-0"
            >
              {commentError && (
                <p className="text-[11px] text-rose-400 font-semibold px-1">
                  {commentError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value.slice(0, 220))}
                  placeholder={
                    currentUser
                      ? 'Add a family-friendly comment...'
                      : 'Sign in to post a comment'
                  }
                  className="flex-1 min-h-[42px] bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-xl px-3 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[42px] min-w-[44px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
