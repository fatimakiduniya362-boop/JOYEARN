import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Bookmark,
  CheckCircle,
  Flag,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  SkipForward,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Award
} from 'lucide-react';
import { VideoContent } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import { soundService } from '../services/soundService';
import { VideoThumbnail, extractYouTubeId } from './VideoThumbnail';
import { submitContentReport } from '../services/firestoreService';
import { RotatingSponsorAdCard } from './SponsorAdCard';

interface WatchModalProps {
  videos: VideoContent[];
  onEarnPoints: (points: number, reason: string) => void;
  onToggleOffline: (videoId: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  watchedVideoIds?: string[];
  onCompleteVideo?: (videoId: string) => void;
}

export const WatchModal: React.FC<WatchModalProps> = ({
  videos,
  onEarnPoints,
  onToggleOffline,
  onClose,
  seniorMode,
  watchedVideoIds = [],
  onCompleteVideo,
}) => {
  const { light, success, selection, warning } = useHaptics();

  // Strictly filter to working videos only (hide any containing PASTE_YOUR_CUSTOM_LINK_HERE or invalid link)
  const workingVideos: VideoContent[] = useMemo(() => {
    return videos.filter((v: VideoContent) => {
      if (!v || !v.videoUrl) return false;
      const url = v.videoUrl.trim();
      if (url.includes('PASTE_YOUR_CUSTOM_LINK_HERE')) return false;
      if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
      return true;
    });
  }, [videos]);

  const [selectedVideo, setSelectedVideo] = useState<VideoContent>(
    () => workingVideos[workingVideos.length - 1] || workingVideos[0] || {
      id: 'v_day_1',
      title: 'Day 1: How To Start A Home Organic Garden',
      category: 'Nature',
      duration: '3:15',
      points: 25,
      author: 'JoyEarn Nature Studio',
      thumbnail: '🌿',
      isOffline: true,
      fileSize: '18 MB',
      summary: 'Day 1 feature: explore gardening and growing herbs with family-safe visuals.',
      videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    }
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [reported, setReported] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerBoxRef = useRef<HTMLDivElement | null>(null);

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const [watchedRewardClaimedToday, setWatchedRewardClaimedToday] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    workingVideos.forEach((v) => {
      try {
        if (localStorage.getItem(`joyearn_video_claimed_${v.id}_${todayDateStr}`) === 'true') {
          init[v.id] = true;
        }
      } catch {}
    });
    return init;
  });

  const isVideoRewardClaimedToday = (videoId: string): boolean => {
    if (watchedRewardClaimedToday[videoId]) return true;
    try {
      return localStorage.getItem(`joyearn_video_claimed_${videoId}_${todayDateStr}`) === 'true';
    } catch {
      return false;
    }
  };

  const currentVideoId = extractYouTubeId(selectedVideo.videoUrl);

  // Background pause/resume handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBackgrounded(true);
        setIsPlaying(false);
      } else {
        setIsBackgrounded(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen to fullscreenchange events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset progress and states when switching video or retrying
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setProgress(0);
    setIsPlaying(true);
    setReported(false);

    // Timeout safety for slow networks: if iframe doesn't load in 10s, show retry option
    const loadTimeout = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          // If still loading after 10s, dismiss spinner but don't hard fail
          return false;
        }
        return loading;
      });
    }, 8000);

    return () => clearTimeout(loadTimeout);
  }, [selectedVideo.id, retryKey]);

  // Video progress timer for verified 10-second learning reward
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !hasError && !isBackgrounded) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (interval) clearInterval(interval);
            const alreadyClaimed = isVideoRewardClaimedToday(selectedVideo.id);
            if (!alreadyClaimed) {
              try {
                localStorage.setItem(`joyearn_video_claimed_${selectedVideo.id}_${todayDateStr}`, 'true');
              } catch {}
              setWatchedRewardClaimedToday((map) => ({ ...map, [selectedVideo.id]: true }));
              onCompleteVideo?.(selectedVideo.id);
              onEarnPoints(selectedVideo.points, `Watched: ${selectedVideo.title}`);
              soundService.playFanfare();
              success();
            }
            return 100;
          }
          return prev + 10;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, hasError, isBackgrounded, selectedVideo, watchedRewardClaimedToday, onCompleteVideo, onEarnPoints, success]);

  const handleSelectVideo = (video: VideoContent) => {
    selection();
    soundService.playClick();
    setSelectedVideo(video);
  };

  const handleRetry = () => {
    soundService.playClick();
    light();
    setHasError(false);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  };

  const handleSkipNext = () => {
    soundService.playClick();
    selection();
    const currentIndex = workingVideos.findIndex((v) => v.id === selectedVideo.id);
    const nextIndex = (currentIndex + 1) % workingVideos.length;
    setSelectedVideo(workingVideos[nextIndex] || workingVideos[0]);
  };

  const toggleFullscreen = () => {
    light();
    if (!playerBoxRef.current) return;

    if (!document.fullscreenElement) {
      playerBoxRef.current.requestFullscreen?.().catch(() => {
        // Fullscreen API may be blocked in some iframe contexts
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const categories = ['All', 'Skills', 'Crafts', 'Nature', 'Cooking', 'Stories'];
  const filteredVideos =
    activeCategory === 'All'
      ? workingVideos
      : workingVideos.filter((v) => v.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border-4 border-rose-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
              📺
            </div>
            <div>
              <h2 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-base sm:text-lg'}`}>
                Safe Family Video Hub
              </h2>
              <p className="text-xs text-rose-100 font-medium">100% wholesome & educational YouTube embeds</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold tap-bounce shadow-xs"
            title="Close Videos"
          >
            ✕
          </button>
        </div>

        {/* Video Player Canvas with YouTube IFrame */}
        <div
          ref={playerBoxRef}
          className="relative bg-slate-950 text-white flex flex-col items-center justify-center min-h-[220px] max-h-[250px] aspect-video w-full overflow-hidden select-none"
        >
          {/* Official YouTube Embed Iframe with Privacy-Enhanced No-Cookie Domain & rel=0 */}
          {!hasError && (
            <iframe
              key={`${currentVideoId}-${retryKey}`}
              src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
              title={selectedVideo.title}
              className="w-full h-full border-0 absolute inset-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
                warning();
              }}
            />
          )}

          {/* Loading Spinner Overlay */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-10 space-y-2 pointer-events-none">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-rose-200 font-bold">Connecting to educational stream...</p>
              <span className="text-[10px] text-slate-400">{selectedVideo.title}</span>
            </div>
          )}

          {/* Error Message with Friendly Retry / Skip */}
          {hasError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center z-20 space-y-3">
              <AlertTriangle className="w-9 h-9 text-amber-400" />
              <div>
                <h4 className="font-bold text-sm text-white">Video Stream Unavailable</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  The network connection was interrupted or video playback timed out.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRetry}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl tap-bounce flex items-center gap-1 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Video</span>
                </button>
                <button
                  onClick={handleSkipNext}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl tap-bounce flex items-center gap-1 shadow-md"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip Video</span>
                </button>
              </div>

              {/* Direct points credit bypass on network failure */}
              <button
                onClick={() => {
                  if (!isVideoRewardClaimedToday(selectedVideo.id)) {
                    try {
                      localStorage.setItem(`joyearn_video_claimed_${selectedVideo.id}_${todayDateStr}`, 'true');
                    } catch {}
                    setWatchedRewardClaimedToday((map) => ({ ...map, [selectedVideo.id]: true }));
                    onCompleteVideo?.(selectedVideo.id);
                    onEarnPoints(selectedVideo.points, `Credited Video: ${selectedVideo.title}`);
                    soundService.playFanfare();
                    success();
                  }
                  handleSkipNext();
                }}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold"
              >
                Claim Points ({selectedVideo.points} Pts) & Continue
              </button>
            </div>
          )}

          {/* Background Paused Banner */}
          {isBackgrounded && (
            <div className="absolute top-2 left-2 z-30 bg-black/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Pause className="w-3 h-3" />
              <span>Paused in Background</span>
            </div>
          )}

          {/* Quick Overlay Controls (Fullscreen Toggle) */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-xs tap-bounce transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800/80 z-20">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Video Info & Points Reward Status Banner */}
        <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full font-black text-xs shadow-2xs">
              +{selectedVideo.points} JoyPoints
            </span>
            <span className="text-gray-700 font-bold">
              {isVideoRewardClaimedToday(selectedVideo.id) ? (
                <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Playing • Daily reward claimed today (+{selectedVideo.points} Pts)</span>
                </span>
              ) : progress >= 100 ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Points Credited! ✅</span>
                </span>
              ) : isPlaying ? (
                `Watching: ${Math.round((progress / 100) * 10)}s / 10s`
              ) : (
                'Watch 10s to earn points'
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                light();
                onToggleOffline(selectedVideo.id);
              }}
              className={`p-1.5 rounded-xl flex items-center gap-1 font-bold text-xs transition-all tap-bounce ${
                selectedVideo.isOffline
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="Bookmark for Family Watchlist"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{selectedVideo.isOffline ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={async () => {
                setReported(true);
                warning();
                await submitContentReport('video', selectedVideo.id, selectedVideo.title, 'User submitted video report');
              }}
              disabled={reported}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all tap-bounce ${
                reported
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-white border-gray-300 text-gray-600 hover:text-rose-600'
              }`}
              title="Report this video for review"
            >
              <Flag className={`w-3.5 h-3.5 ${reported ? 'fill-rose-600 text-rose-600' : ''}`} />
              <span>{reported ? 'Reported' : 'Report Video'}</span>
            </button>
          </div>
        </div>

        {reported && (
          <div className="bg-rose-100 px-4 py-1.5 text-xs text-rose-900 font-bold border-b border-rose-200 flex items-center justify-between">
            <span>✓ Thank you! Video report recorded for safety review.</span>
          </div>
        )}

        {/* Categories Bar */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-gray-100 bg-white shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundService.playClick();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
                activeCategory === cat
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
          {/* Rotating Sponsor Card in Video List */}
          <div className="pb-1">
            <RotatingSponsorAdCard variant="compact" />
          </div>

          {filteredVideos.map((video, idx) => {
            const isCurrent = video.id === selectedVideo.id;
            const isClaimed = isVideoRewardClaimedToday(video.id);

            return (
              <React.Fragment key={video.id}>
                {idx === 3 && (
                  <div className="my-1">
                    <RotatingSponsorAdCard variant="card" />
                  </div>
                )}
                <div
                  onClick={() => handleSelectVideo(video)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 tap-bounce ${
                  isCurrent
                    ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-rose-200 shadow-2xs'
                }`}
              >
                <div className="w-24 shrink-0 rounded-xl overflow-hidden shadow-xs">
                  <VideoThumbnail
                    videoUrl={video.videoUrl}
                    title={video.title}
                    duration={video.duration}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs text-gray-900 truncate">{video.title}</h4>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{video.summary}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className="text-gray-400 font-semibold">{video.duration}</span>
                    <span className="text-rose-600 font-extrabold">+{video.points} JoyPoints</span>
                    {video.isOffline && (
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                        Offline Ready
                      </span>
                    )}
                  </div>
                </div>
                {isClaimed && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </div>
            </React.Fragment>
          );
        })}
        </div>
      </div>
    </div>
  );
};
