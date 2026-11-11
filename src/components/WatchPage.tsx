import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Search,
  Palette,
  BookOpen,
  Smile,
  ListPlus,
  Flag,
  ExternalLink,
  Flame,
  Film,
  Compass,
  Utensils,
  Leaf,
  Atom,
  Check
} from 'lucide-react';
import { VideoContent, CustomPlaylist } from '../types';
import { getMergedVideos, extractYouTubeId } from '../services/videoAdminService';
import { quarantineVideo } from '../services/contentSafetyService';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { VideoHistory } from './VideoHistory';
import { PlaylistBar } from './PlaylistBar';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { playlistService } from '../services/playlistService';

interface WatchPageProps {
  videos?: VideoContent[];
  onEarnPoints: (points: number, reason: string) => void;
  onToggleOffline?: (videoId: string) => void;
  seniorMode: boolean;
  watchedVideoIds?: string[];
  onCompleteVideo?: (videoId: string) => void;
  onBackToHome?: () => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  All: <Sparkles className="w-3.5 h-3.5" />,
  Science: <Atom className="w-3.5 h-3.5" />,
  Arts: <Palette className="w-3.5 h-3.5" />,
  Art: <Palette className="w-3.5 h-3.5" />,
  'Art and Craft': <Palette className="w-3.5 h-3.5" />,
  Cooking: <Utensils className="w-3.5 h-3.5" />,
  Nature: <Leaf className="w-3.5 h-3.5" />,
  'Science & Nature': <Leaf className="w-3.5 h-3.5" />,
  Stories: <BookOpen className="w-3.5 h-3.5" />,
  Kids: <Smile className="w-3.5 h-3.5" />,
  Math: <Atom className="w-3.5 h-3.5" />,
};

export const WatchPage: React.FC<WatchPageProps> = ({
  videos: propVideos,
  onEarnPoints,
  seniorMode,
  watchedVideoIds = [],
  onCompleteVideo,
  onBackToHome,
}) => {
  const { light, success, selection } = useHaptics();

  // All merged videos state
  const [allVideos, setAllVideos] = useState<VideoContent[]>(() => {
    try {
      const cached = localStorage.getItem('joyearn_merged_videos_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return propVideos && propVideos.length > 0 ? propVideos : [];
  });
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Load merged videos from Firestore & clean curriculum on mount
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingVideos(true);
      try {
        const merged = await getMergedVideos();
        if (active && merged.length > 0) {
          setAllVideos(merged);
        }
      } catch (err) {
        console.warn('Could not load merged videos:', err);
      } finally {
        if (active) setLoadingVideos(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Filter approved videos only
  const approvedVideos = useMemo(() => {
    return allVideos.filter((v) => v.approved !== false);
  }, [allVideos]);

  // Keep all standard categories visible (Science, Arts, Cooking, Nature) plus any Firestore categories
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    approvedVideos.forEach((v) => {
      if (v.category) {
        set.add(v.category.trim());
      }
    });

    const standardCategories = ['Science', 'Arts', 'Cooking', 'Nature'];
    const otherCats = Array.from(set).filter((c) => !standardCategories.includes(c)).sort();

    return ['All', ...standardCategories, ...otherCats];
  }, [approvedVideos]);

  // Active Category filter
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected video for dedicated player view
  const [activeVideo, setActiveVideo] = useState<VideoContent | null>(null);

  // Scroll retention for the video list
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollPosition = useRef<number>(0);

  // Player state
  const [watchProgressSeconds, setWatchProgressSeconds] = useState(0);
  const [reported, setReported] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Playlist State
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>(() => playlistService.getPlaylists());
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [videoToAddToPlaylist, setVideoToAddToPlaylist] = useState<VideoContent | null>(null);

  // History State
  const [historyVideoIds, setHistoryVideoIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('joyearn_video_history_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const recordToHistory = (videoId: string) => {
    setHistoryVideoIds((prev) => {
      const filtered = prev.filter((id) => id !== videoId);
      const next = [videoId, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('joyearn_video_history_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistoryVideoIds([]);
    try {
      localStorage.removeItem('joyearn_video_history_ids');
    } catch {}
  };

  const activePlaylist = useMemo(() => {
    if (!activePlaylistId) return null;
    return playlists.find((p) => p.id === activePlaylistId) || null;
  }, [activePlaylistId, playlists]);

  const playlistVideos = useMemo(() => {
    if (!activePlaylist) return [];
    return approvedVideos.filter((v) => activePlaylist.videoIds.includes(v.id));
  }, [activePlaylist, approvedVideos]);

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const [watchedRewardClaimedToday, setWatchedRewardClaimedToday] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    approvedVideos.forEach((v) => {
      try {
        if (localStorage.getItem(`joyearn_video_claimed_${v.id}_${todayDateStr}`) === 'true') {
          map[v.id] = true;
        }
      } catch {}
    });
    return map;
  });

  const isVideoRewardClaimedToday = (videoId: string): boolean => {
    if (watchedRewardClaimedToday[videoId]) return true;
    try {
      return localStorage.getItem(`joyearn_video_claimed_${videoId}_${todayDateStr}`) === 'true';
    } catch {
      return false;
    }
  };

  // Filter videos based on Playlist, Category, and Search Query
  const filteredVideos = useMemo(() => {
    let source = activePlaylist ? playlistVideos : approvedVideos;
    if (activeCategory !== 'All') {
      source = source.filter((v) => v.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      source = source.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.category.toLowerCase().includes(query) ||
          (v.author && v.author.toLowerCase().includes(query)) ||
          (v.summary && v.summary.toLowerCase().includes(query))
      );
    }
    return source;
  }, [activePlaylist, playlistVideos, approvedVideos, activeCategory, searchQuery]);

  // Stable references for reward callbacks
  const onEarnPointsRef = useRef(onEarnPoints);
  onEarnPointsRef.current = onEarnPoints;
  const onCompleteVideoRef = useRef(onCompleteVideo);
  onCompleteVideoRef.current = onCompleteVideo;
  const successRef = useRef(success);
  successRef.current = success;

  // Handle selecting a video to watch
  const handleOpenVideo = (video: VideoContent) => {
    if (listScrollRef.current) {
      savedScrollPosition.current = listScrollRef.current.scrollTop;
    } else {
      savedScrollPosition.current = window.scrollY;
    }
    soundService.playClick();
    selection();
    setActiveVideo(video);
    recordToHistory(video.id);
    setWatchProgressSeconds(0);
    setIframeLoaded(false);
    setReported(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Return back to video discovery list
  const handleBackToWatchList = () => {
    soundService.playClick();
    setActiveVideo(null);
    requestAnimationFrame(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = savedScrollPosition.current;
      } else {
        window.scrollTo({ top: savedScrollPosition.current, behavior: 'instant' });
      }
    });
  };

  // 10-Second Verified Learning Reward Timer
  const REQUIRED_WATCH_SECONDS = 10;
  const watchProgressPct = Math.min(100, Math.round((watchProgressSeconds / REQUIRED_WATCH_SECONDS) * 100));

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeVideo) {
      interval = setInterval(() => {
        setWatchProgressSeconds((prev) => {
          const next = prev + 1;
          if (next >= REQUIRED_WATCH_SECONDS && activeVideo) {
            const alreadyClaimed = isVideoRewardClaimedToday(activeVideo.id);
            if (!alreadyClaimed) {
              try {
                localStorage.setItem(`joyearn_video_claimed_${activeVideo.id}_${todayDateStr}`, 'true');
              } catch {}
              setWatchedRewardClaimedToday((map) => ({ ...map, [activeVideo.id]: true }));
              onCompleteVideoRef.current?.(activeVideo.id);
              onEarnPointsRef.current?.(activeVideo.points || 25, `Watched: ${activeVideo.title}`);
              soundService.playFanfare();
              successRef.current();
            }
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeVideo, todayDateStr]);

  const activeVideoClaimed = activeVideo ? isVideoRewardClaimedToday(activeVideo.id) : false;
  const isVideoCompleted = (id: string) => watchedVideoIds.includes(id) || isVideoRewardClaimedToday(id);

  const historyVideos = useMemo(() => {
    return historyVideoIds
      .map((id) => approvedVideos.find((v) => v.id === id))
      .filter((v): v is VideoContent => Boolean(v));
  }, [historyVideoIds, approvedVideos]);

  // Extract YouTube ID for active video
  const activeVideoId = useMemo(() => {
    if (!activeVideo) return null;
    return activeVideo.videoId || extractYouTubeId(activeVideo.videoUrl || '');
  }, [activeVideo]);

  return (
    <div ref={listScrollRef} className="w-full flex flex-col bg-slate-50 min-h-full pb-28">
      {/* =========================================================================
          VIEW A: DEDICATED SMOOTH YOUTUBE-NOCOOKIE EMBED PLAYER
         ========================================================================= */}
      {activeVideo ? (
        <div className="flex flex-col w-full p-4 space-y-4 animate-in fade-in duration-200 max-w-xl mx-auto">
          {/* Top Bar with Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToWatchList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-xs shadow-2xs hover:bg-slate-100 tap-bounce"
            >
              <ArrowLeft className="w-4 h-4 text-pink-600" />
              <span>{seniorMode ? 'تمام ویڈیوز' : 'Back to Videos'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                {activeVideo.category}
              </span>
              <button
                onClick={() => setVideoToAddToPlaylist(activeVideo)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-pink-600 tap-bounce"
                title="Add to Playlist"
              >
                <ListPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Smooth YouTube Player Container */}
          <div className="w-full bg-slate-950 rounded-3xl overflow-hidden shadow-xl border border-slate-900 relative aspect-video">
            {activeVideoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?rel=0&autoplay=1&modestbranding=1`}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => setIframeLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center space-y-2">
                <span className="text-3xl">🌿</span>
                <p className="text-xs text-slate-300">
                  Video stream is being refreshed.
                </p>
                <button
                  onClick={handleBackToWatchList}
                  className="px-3 py-1.5 bg-pink-600 text-white rounded-xl text-xs font-bold"
                >
                  Choose Another Video
                </button>
              </div>
            )}
          </div>

          {/* 10-Second Verified Learning Reward Progress Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Verified Watch Reward</span>
              </span>
              <span className="font-extrabold text-amber-600">
                {activeVideoClaimed
                  ? '✓ Claimed (+25 Pts)'
                  : `Watching: ${watchProgressSeconds}s / ${REQUIRED_WATCH_SECONDS}s (${watchProgressPct}%)`}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  activeVideoClaimed
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500'
                }`}
                style={{ width: `${activeVideoClaimed ? 100 : watchProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>
                {activeVideoClaimed
                  ? `You claimed +${activeVideo.points || 25} JoyPoints today for learning!`
                  : `Watch ${Math.max(0, REQUIRED_WATCH_SECONDS - watchProgressSeconds)} more seconds to unlock +${activeVideo.points || 25} JoyPoints`}
              </span>

              {!activeVideoClaimed && watchProgressSeconds >= REQUIRED_WATCH_SECONDS && (
                <button
                  onClick={() => {
                    setWatchedRewardClaimedToday((m) => ({ ...m, [activeVideo.id]: true }));
                    onCompleteVideo?.(activeVideo.id);
                    onEarnPoints(activeVideo.points || 25, `Watched: ${activeVideo.title}`);
                    soundService.playFanfare();
                    success();
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs tap-bounce animate-pulse"
                >
                  Claim +{activeVideo.points || 25} Pts
                </button>
              )}
            </div>
          </div>

          {/* Video Metadata & Description Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-600">
                  {activeVideo.category}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {activeVideo.duration}
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                {activeVideo.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Creator: <strong className="text-slate-800">{activeVideo.author}</strong>
              </p>
            </div>

            {activeVideo.summary && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {activeVideo.summary}
              </p>
            )}

            {/* External YouTube Option if available */}
            {activeVideoId && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Also available on YouTube</span>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-pink-600 text-xs font-bold flex items-center gap-1 tap-bounce"
                >
                  <span>Open in YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Family Safety & Report Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold text-slate-700">100% Family Friendly Guarantee</span>
              </div>
              <button
                onClick={() => {
                  if (activeVideo) {
                    quarantineVideo(activeVideo.id);
                    setReported(true);
                    try {
                      alert('Thank you! This video has been quarantined and removed.');
                    } catch {}
                    handleBackToWatchList();
                  }
                }}
                disabled={reported}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline flex items-center gap-1"
                title="Report content if it violates family safety"
              >
                <Flag className="w-3 h-3" />
                <span>{reported ? '✓ Quarantined' : 'Report video'}</span>
              </button>
            </div>
          </div>

          {/* More in Category */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              More In {activeVideo.category}
            </h3>
            <div className="space-y-2">
              {approvedVideos
                .filter((v) => v.category === activeVideo.category && v.id !== activeVideo.id)
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenVideo(item)}
                    className="p-3 bg-white rounded-2xl border border-slate-200/90 hover:border-pink-300 transition-all flex items-center gap-3 cursor-pointer tap-bounce shadow-2xs"
                  >
                    <div className="w-20 aspect-video rounded-xl overflow-hidden shrink-0 shadow-2xs relative bg-slate-900">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.author} • {item.duration}</p>
                    </div>
                    <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 shrink-0">
                      +{item.points || 25} Pts
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: VIDEO DISCOVERY WITH CATEGORY FILTER
           ========================================================================= */
        <div className="flex flex-col w-full space-y-4 max-w-xl mx-auto">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-4 shadow-md sm:rounded-b-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBackToHome && (
                  <button
                    onClick={onBackToHome}
                    className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white tap-bounce shrink-0"
                    title="Back to Home"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0">
                  🎬
                </div>
                <div>
                  <h1 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                    {seniorMode ? 'ویڈیو لرننگ حب' : 'Watch & Learn'}
                  </h1>
                  <p className="text-xs text-pink-100 font-medium">
                    Verified Family-Friendly Video Streams
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>+25 Pts / video</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-200" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={seniorMode ? 'ویڈیوز تلاش کریں...' : 'Search tutorials, crafts, science...'}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white/20 placeholder-pink-200 text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-white/40 border border-white/25"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pink-200 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DYNAMIC CATEGORY FILTER PILLS - Empty categories are hidden */}
          {dynamicCategories.length > 1 && (
            <div className="px-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
                {dynamicCategories.map((category) => {
                  const isSelected = activeCategory === category;
                  const icon = CATEGORY_ICON_MAP[category] || <Sparkles className="w-3.5 h-3.5" />;
                  const count =
                    category === 'All'
                      ? approvedVideos.length
                      : approvedVideos.filter((v) => v.category === category).length;

                  return (
                    <button
                      key={category}
                      onClick={() => {
                        soundService.playClick();
                        selection();
                        setActiveCategory(category);
                      }}
                      className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all tap-bounce ${
                        isSelected
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20 scale-102'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90 shadow-2xs'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{category}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Custom Playlist Bar */}
          <div className="px-4">
            <PlaylistBar
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              onSelectPlaylist={(id: string | null) => {
                soundService.playClick();
                setActivePlaylistId(id);
              }}
              onPlayAll={(vids: VideoContent[]) => {
                if (vids.length > 0) handleOpenVideo(vids[0]);
              }}
              onCreateNewPlaylist={(name: string, emoji?: string) => {
                const created = playlistService.createPlaylist(name, emoji);
                setPlaylists(playlistService.getPlaylists());
                setActivePlaylistId(created.id);
                soundService.playFanfare();
              }}
              onDeletePlaylist={(id: string) => {
                playlistService.deletePlaylist(id);
                setPlaylists(playlistService.getPlaylists());
                if (activePlaylistId === id) setActivePlaylistId(null);
                soundService.playClick();
              }}
              playlistVideos={playlistVideos}
            />
          </div>


          {/* Recently Watched Videos Strip */}
          {historyVideos.length > 0 && !activePlaylistId && (
            <div className="px-4">
              <VideoHistory
                historyVideos={historyVideos}
                onSelectVideo={handleOpenVideo}
                seniorMode={seniorMode}
                onClearHistory={handleClearHistory}
              />
            </div>
          )}

          {/* Video Grid or Friendly Empty State */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>
                {activeCategory === 'All' ? 'All Verified Videos' : activeCategory} ({filteredVideos.length})
              </span>
              <span className="text-[11px] text-pink-600 font-black">
                Tap Any Video to Play
              </span>
            </div>

            {approvedVideos.length === 0 ? (
              /* If no videos exist at all, show friendly message */
              <div className="p-8 text-center bg-white rounded-3xl border border-pink-100 shadow-xs space-y-3">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-pink-50 text-pink-500 flex items-center justify-center text-2xl shadow-inner">
                  🎬
                </div>
                <h3 className="font-black text-slate-800 text-base">
                  New videos are coming soon
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Our educational team is curating new safe video lessons. In the meantime, your daily quiz and tasks are active and ready!
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
                    ✓ Daily Quiz Active
                  </span>
                  <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-700 rounded-xl text-xs font-bold">
                    ✓ Tasks Active
                  </span>
                </div>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-pink-100 shadow-xs space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-pink-500" />
                </div>
                <h3 className="font-black text-slate-800 text-sm">New videos coming soon</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No playable videos in &ldquo;{activeCategory}&rdquo; yet. New educational videos are coming soon!
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All');
                  }}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold tap-bounce"
                >
                  View All Videos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredVideos.map((video) => {
                  const completed = isVideoCompleted(video.id);

                  return (
                    <div
                      key={video.id}
                      onClick={() => handleOpenVideo(video)}
                      className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer tap-bounce flex flex-col group"
                    >
                      {/* Video Thumbnail with Badges */}
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            // Guaranteed fallback thumbnail if image fails to load
                            const target = e.currentTarget;
                            const vId = video.videoId || extractYouTubeId(video.videoUrl || '');
                            if (vId && !target.src.includes('hqdefault.jpg')) {
                              target.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                            }
                          }}
                        />

                        {/* Duration pill */}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-black backdrop-blur-xs">
                          {video.duration || '3:30'}
                        </span>

                        {/* Points pill */}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          +{video.points || 25} Pts
                        </span>

                        {/* Completed pill */}
                        {completed && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {/* Center Play Overlay */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 flex items-center justify-center transition-colors">
                          <div className="w-11 h-11 rounded-full bg-white/95 text-pink-600 flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform">
                            <Play className="w-5 h-5 ml-0.5 fill-pink-600" />
                          </div>
                        </div>
                      </div>

                      {/* Video Details */}
                      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black text-pink-600 uppercase tracking-wider">
                            <span>{video.category}</span>
                            <span className="text-slate-400 font-semibold">{video.author}</span>
                          </div>
                          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2 leading-snug">
                            {video.title}
                          </h3>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">10s Learning Goal</span>
                          <span className="font-extrabold text-pink-600 group-hover:translate-x-0.5 transition-transform">
                            Watch Now →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add To Playlist Modal Dialog */}
      {videoToAddToPlaylist && (
        <AddToPlaylistModal
          video={videoToAddToPlaylist}
          playlists={playlists}
          onPlaylistsChange={(updated) => setPlaylists(updated)}
          onClose={() => setVideoToAddToPlaylist(null)}
        />
      )}
    </div>
  );
};
