import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Search,
  Bell,
  MoreVertical,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  Heart,
  X,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  Sparkles,
  Film,
  Video as VideoIcon,
  Camera,
  Images,
} from 'lucide-react';
import { AppUser, VideoContent } from '../types';
import {
  WATCH_PAGE_VIDEOS,
  DEFAULT_FALLBACK_VIDEO_STREAM,
} from '../data/watchVideosData';
import { getMergedVideos, extractYouTubeId } from '../services/videoAdminService';
import {
  getApprovedVlogs,
  getPlayableVlogUrl,
  reportVlog,
  VLOG_REPORT_REASONS,
  VlogItem,
  VlogReportReason,
} from '../services/vlogService';
import {
  getDataSaverPreferences,
  getNetworkProfile,
  resolveVideoPlaybackPolicy,
  buildYouTubeEmbedUrl,
} from '../services/dataSaverService';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

export const VLOG_FEED_CATEGORIES = [
  'All',
  'Vlogs',
  'Travel',
  'Lifestyle',
  'Entertainment',
] as const;

export type VlogFeedCategory = (typeof VLOG_FEED_CATEGORIES)[number];

export interface WatchFeedVideo {
  id: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  category: Exclude<VlogFeedCategory, 'All'>;
  viewsLabel: string;
  uploadedAtLabel: string;
  duration: string;
  thumbnail: string;
  summary?: string;
  points: number;
  videoType: 'native' | 'youtube';
  mediaUrl?: string;
  fallbackMediaUrl?: string;
  youtubeId?: string;
  vlogRef?: VlogItem;
}

const SAVED_PLAYLIST_KEY = 'joyearn_saved_vlogs_playlist';
const LIKED_VIDEOS_KEY = 'joyearn_liked_watch_videos';
const REPORTED_VIDEOS_KEY = 'joyearn_reported_watch_videos';
const DEFAULT_THUMBNAIL_FALLBACK =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';

// Featured real playable videos matching the exact JoyEarn Vlogs feed experience
export const FEATURED_VLOG_FEED_VIDEOS: WatchFeedVideo[] = [
  {
    id: 'featured_travel_northern_areas',
    title: 'My First Travel Vlog | Beautiful Northern Areas ❤️',
    creator: 'JoyEarn Vlogs',
    category: 'Travel',
    viewsLabel: '245K views',
    uploadedAtLabel: '1 day ago',
    duration: '12:45',
    thumbnail:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=85',
    summary:
      'A scenic mountain lake adventure through lush valleys, crisp alpine trails, and peaceful northern vistas.',
    points: 25,
    videoType: 'native',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/4/46/4K_Nature_Cinematography_recorded_with_Nikon_D5300.webm',
    fallbackMediaUrl: DEFAULT_FALLBACK_VIDEO_STREAM,
  },
  {
    id: 'featured_lifestyle_daily_routine',
    title: 'My Daily Routine | Study, Work & Fun ✨',
    creator: 'JoyEarn Vlogs',
    category: 'Lifestyle',
    viewsLabel: '189K views',
    uploadedAtLabel: '3 days ago',
    duration: '15:20',
    thumbnail:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&auto=format&fit=crop&q=85',
    summary:
      'Cozy desk setup, productive study sessions, creative breaks, and evening wind-down inspiration.',
    points: 25,
    videoType: 'native',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/83/11Fountains_-_Sloten.webm',
    fallbackMediaUrl: DEFAULT_FALLBACK_VIDEO_STREAM,
  },
  {
    id: 'featured_vlogs_family_day',
    title: 'A Day with Family | Happiness Vlog ❤️',
    creator: 'JoyEarn Vlogs',
    category: 'Vlogs',
    viewsLabel: '320K views',
    uploadedAtLabel: '5 days ago',
    duration: '14:12',
    thumbnail:
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=900&auto=format&fit=crop&q=85',
    summary:
      'Warm family picnic in the sunny park, laughter, nature walks, and joyful everyday memories.',
    points: 25,
    videoType: 'native',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/2/26/Bees_on_flowers.webm',
    fallbackMediaUrl: DEFAULT_FALLBACK_VIDEO_STREAM,
  },
  {
    id: 'featured_entertainment_animation',
    title: 'Forest Friends Adventure | Family Fun Short 🎬',
    creator: 'JoyEarn Entertainment',
    category: 'Entertainment',
    viewsLabel: '412K views',
    uploadedAtLabel: '1 week ago',
    duration: '09:56',
    thumbnail:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=85',
    summary:
      'Heartwarming open-source animated short packed with lighthearted comedy and wholesome adventure.',
    points: 30,
    videoType: 'native',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
    fallbackMediaUrl: DEFAULT_FALLBACK_VIDEO_STREAM,
  },
];

export function mapToFeedCategory(
  rawCategory?: string,
  title?: string
): Exclude<VlogFeedCategory, 'All'> {
  const combined = `${rawCategory || ''} ${title || ''}`.toLowerCase();
  if (
    combined.includes('travel') ||
    combined.includes('nature') ||
    combined.includes('outdoor') ||
    combined.includes('northern') ||
    combined.includes('wildlife') ||
    combined.includes('savannah') ||
    combined.includes('wetland') ||
    combined.includes('canal')
  ) {
    return 'Travel';
  }
  if (
    combined.includes('vlog') ||
    combined.includes('family') ||
    combined.includes('home and family') ||
    combined.includes('art and craft') ||
    combined.includes('handmade') ||
    combined.includes('farm')
  ) {
    return 'Vlogs';
  }
  if (
    combined.includes('lifestyle') ||
    combined.includes('routine') ||
    combined.includes('diy') ||
    combined.includes('garden') ||
    combined.includes('cooking') ||
    combined.includes('health') ||
    combined.includes('study') ||
    combined.includes('learning') ||
    combined.includes('educational')
  ) {
    return 'Lifestyle';
  }
  if (
    combined.includes('entertainment') ||
    combined.includes('funny') ||
    combined.includes('wholesome') ||
    combined.includes('creative') ||
    combined.includes('bunny') ||
    combined.includes('animated') ||
    combined.includes('drawing') ||
    combined.includes('painting') ||
    combined.includes('paper')
  ) {
    return 'Entertainment';
  }
  return 'Vlogs';
}

function formatRelativeDate(iso?: string, fallbackIndex = 0): string {
  if (iso) {
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) {
      const diffMs = Date.now() - parsed;
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      const weeks = Math.floor(diffDays / 7);
      if (weeks === 1) return '1 week ago';
      if (weeks < 5) return `${weeks} weeks ago`;
      const months = Math.floor(diffDays / 30);
      return months <= 1 ? '1 month ago' : `${months} months ago`;
    }
  }
  const presets = ['2 days ago', '4 days ago', '6 days ago', '1 week ago', '2 weeks ago'];
  return presets[fallbackIndex % presets.length];
}

function deriveViewsLabel(id: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 900;
  }
  const kViews = 42 + ((hash + index * 29) % 340);
  return `${kViews}K views`;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface WatchPageProps {
  videos?: VideoContent[];
  onEarnPoints: (points: number, reason: string) => void;
  onToggleOffline?: (videoId: string) => void;
  seniorMode?: boolean;
  watchedVideoIds?: string[];
  onCompleteVideo?: (videoId: string) => void;
  onBackToHome?: () => void;
  currentUser?: AppUser | null;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  unreadNotificationCount?: number;
  onOpenCommunityUpload?: () => void;
  onOpenLiveCamera?: () => void;
  onQuickVideoSelected?: (file: File, source: 'camera' | 'gallery') => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  videos: propVideos,
  onEarnPoints,
  seniorMode = false,
  watchedVideoIds = [],
  onCompleteVideo,
  currentUser = null,
  onOpenNotifications,
  onOpenProfile,
  unreadNotificationCount = 0,
  onOpenCommunityUpload,
  onOpenLiveCamera,
  onQuickVideoSelected,
}) => {
  const { light, success } = useHaptics();

  // Feed state
  const [selectedCategory, setSelectedCategory] = useState<VlogFeedCategory>('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryPickerInputRef = useRef<HTMLInputElement | null>(null);

  // Launch the device's real system camera app directly via native video capture input
  // (delegates to Android MediaStore.ACTION_VIDEO_CAPTURE without requesting unnecessary app-level CAMERA permission).
  const handleTopCameraClick = useCallback(() => {
    soundService.playClick();
    light();
    setMediaNotice(null);

    if (!cameraCaptureInputRef.current) {
      setMediaNotice('Video capture is not supported in this browser. Use Gallery to select an existing video.');
      return;
    }

    cameraCaptureInputRef.current.value = '';
    cameraCaptureInputRef.current.click();
  }, [light]);

  // Launch real Android System Photo / Video Picker (no broad storage permission required)
  const handleTopGalleryClick = useCallback(() => {
    soundService.playClick();
    light();
    setMediaNotice(null);
    if (!galleryPickerInputRef.current) {
      setMediaNotice('Video picker is unavailable on this browser.');
      return;
    }
    galleryPickerInputRef.current.value = '';
    galleryPickerInputRef.current.click();
  }, [light]);

  const handleNativeFileChange = useCallback(
    (source: 'camera' | 'gallery') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return; // User pressed Back / cancelled system camera or picker
      setMediaNotice(null);
      if (onQuickVideoSelected) {
        onQuickVideoSelected(file, source);
      } else {
        onOpenCommunityUpload?.();
      }
    },
    [onQuickVideoSelected, onOpenCommunityUpload]
  );

  const [catalogVideos, setCatalogVideos] = useState<VideoContent[]>(WATCH_PAGE_VIDEOS);
  const [communityVlogs, setCommunityVlogs] = useState<VlogItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Active in-app player state
  const [activeVideo, setActiveVideo] = useState<WatchFeedVideo | null>(null);
  const [resolvedNativeUrl, setResolvedNativeUrl] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [usedFallbackStream, setUsedFallbackStream] = useState(false);

  // Native player controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  // Watch reward tracking (preserves existing JoyEarn verified watch points)
  const [watchProgressSec, setWatchProgressSec] = useState(0);
  const [rewardClaimedIds, setRewardClaimedIds] = useState<Record<string, boolean>>({});
  const REQUIRED_WATCH_SECONDS = 15;

  // User interactions: saved playlist, likes, 3-dot menu, report modal, toast
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_PLAYLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LIKED_VIDEOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [openMenuVideoId, setOpenMenuVideoId] = useState<string | null>(null);
  const [reportingVideo, setReportingVideo] = useState<WatchFeedVideo | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<VlogReportReason>(
    VLOG_REPORT_REASONS[0]
  );
  const [submittingReport, setSubmittingReport] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Close 3-dot dropdown on outside click
  useEffect(() => {
    if (!openMenuVideoId) return;
    const closeMenu = () => setOpenMenuVideoId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [openMenuVideoId]);

  // Load real merged videos + approved community vlogs
  useEffect(() => {
    let active = true;
    setLoadingFeed(true);

    Promise.allSettled([getMergedVideos(), getApprovedVlogs()]).then(([mergedRes, vlogsRes]) => {
      if (!active) return;

      if (mergedRes.status === 'fulfilled' && Array.isArray(mergedRes.value) && mergedRes.value.length > 0) {
        const merged = [...WATCH_PAGE_VIDEOS];
        const existingIds = new Set(merged.map((v) => v.id));
        mergedRes.value.forEach((v) => {
          if (!existingIds.has(v.id)) {
            merged.push(v);
            existingIds.add(v.id);
          }
        });
        setCatalogVideos(merged);
      } else if (propVideos && propVideos.length > 0) {
        const merged = [...WATCH_PAGE_VIDEOS];
        const existingIds = new Set(merged.map((v) => v.id));
        propVideos.forEach((v) => {
          if (!existingIds.has(v.id)) {
            merged.push(v);
            existingIds.add(v.id);
          }
        });
        setCatalogVideos(merged);
      }

      if (vlogsRes.status === 'fulfilled' && Array.isArray(vlogsRes.value)) {
        setCommunityVlogs(vlogsRes.value);
      }
      setLoadingFeed(false);
    });

    return () => {
      active = false;
    };
  }, [propVideos]);

  // Build unified playable feed across All / Vlogs / Travel / Lifestyle / Entertainment
  const unifiedFeed: WatchFeedVideo[] = useMemo(() => {
    const items: WatchFeedVideo[] = [...FEATURED_VLOG_FEED_VIDEOS];
    const seenIds = new Set(items.map((item) => item.id));

    // Add approved community vlogs
    communityVlogs.forEach((vlog, idx) => {
      const id = `vlog_${vlog.id}`;
      if (seenIds.has(id)) return;
      const ytId = vlog.videoId ? extractYouTubeId(vlog.videoId) || vlog.videoId : undefined;
      const isYoutube = vlog.videoType === 'youtube' || (Boolean(ytId) && !vlog.videoUrl && !vlog.nativeMediaId);
      items.push({
        id,
        title: vlog.title,
        creator: vlog.creatorName || 'JoyEarn Creator',
        creatorAvatar: vlog.creatorPhotoURL,
        category: mapToFeedCategory(vlog.category, vlog.title),
        viewsLabel: deriveViewsLabel(vlog.id, idx),
        uploadedAtLabel: formatRelativeDate(vlog.createdAt, idx),
        duration: vlog.duration || '08:30',
        thumbnail: vlog.thumbnail || DEFAULT_THUMBNAIL_FALLBACK,
        summary: vlog.description,
        points: 25,
        videoType: isYoutube ? 'youtube' : 'native',
        mediaUrl: vlog.videoUrl || DEFAULT_FALLBACK_VIDEO_STREAM,
        fallbackMediaUrl: DEFAULT_FALLBACK_VIDEO_STREAM,
        youtubeId: isYoutube ? ytId : undefined,
        vlogRef: vlog,
      });
      seenIds.add(id);
    });

    // Add merged catalog videos
    catalogVideos.forEach((vid, idx) => {
      if (seenIds.has(vid.id)) return;
      const ytId =
        vid.videoType === 'embed' || (!vid.mediaUrl && vid.videoUrl?.includes('youtu'))
          ? extractYouTubeId(vid.videoUrl || vid.mediaUrl || '') || undefined
          : undefined;
      const isYoutube = Boolean(ytId) && vid.videoType !== 'native';
      items.push({
        id: vid.id,
        title: vid.title,
        creator: vid.author || 'JoyEarn Vlogs',
        category: mapToFeedCategory(vid.category, vid.title),
        viewsLabel: deriveViewsLabel(vid.id, idx + 4),
        uploadedAtLabel: formatRelativeDate(undefined, idx),
        duration: vid.duration || '04:15',
        thumbnail: vid.thumbnail || DEFAULT_THUMBNAIL_FALLBACK,
        summary: vid.summary,
        points: vid.points || 25,
        videoType: isYoutube ? 'youtube' : 'native',
        mediaUrl: vid.mediaUrl || vid.videoUrl || DEFAULT_FALLBACK_VIDEO_STREAM,
        fallbackMediaUrl: vid.fallbackMediaUrl || DEFAULT_FALLBACK_VIDEO_STREAM,
        youtubeId: ytId,
      });
      seenIds.add(vid.id);
    });

    return items;
  }, [communityVlogs, catalogVideos]);

  // Filtered list by category and live search query
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedFeed.filter((video) => {
      if (selectedCategory !== 'All' && video.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        video.title.toLowerCase().includes(q) ||
        video.creator.toLowerCase().includes(q) ||
        video.category.toLowerCase().includes(q)
      );
    });
  }, [unifiedFeed, selectedCategory, searchQuery]);

  // Open dedicated in-app player & preserve feed scroll position
  const handleSelectVideo = useCallback(
    async (video: WatchFeedVideo) => {
      soundService.playClick();
      light();
      savedScrollTopRef.current = window.scrollY || 0;
      setOpenMenuVideoId(null);
      setActiveVideo(video);
      setPlayerError(null);
      setUsedFallbackStream(false);
      setCurrentTime(0);
      setDurationSec(0);
      setWatchProgressSec(0);
      setIsPlaying(false);
      setIsBuffering(video.videoType === 'native');

      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

      if (video.videoType === 'native') {
        if (video.vlogRef) {
          const playable = await getPlayableVlogUrl(video.vlogRef);
          setResolvedNativeUrl(playable || video.mediaUrl || DEFAULT_FALLBACK_VIDEO_STREAM);
        } else {
          setResolvedNativeUrl(video.mediaUrl || DEFAULT_FALLBACK_VIDEO_STREAM);
        }
      } else {
        setResolvedNativeUrl(null);
      }
    },
    [light]
  );

  // Return to feed & restore exact scroll position
  const handleBackToFeed = useCallback(() => {
    soundService.playClick();
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setActiveVideo(null);
    setResolvedNativeUrl(null);
    setIsPlaying(false);
    setPlayerError(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollTopRef.current, behavior: 'instant' as ScrollBehavior });
    });
  }, []);

  // Verified watch reward timer (preserves existing JoyEarn points reward)
  useEffect(() => {
    if (!activeVideo) return;
    const alreadyWatched =
      watchedVideoIds.includes(activeVideo.id) || Boolean(rewardClaimedIds[activeVideo.id]);
    if (alreadyWatched) return;

    const shouldTick = activeVideo.videoType === 'youtube' || isPlaying;
    if (!shouldTick) return;

    const timer = setInterval(() => {
      setWatchProgressSec((prev) => {
        const next = prev + 1;
        if (next >= REQUIRED_WATCH_SECONDS) {
          clearInterval(timer);
          setRewardClaimedIds((map) => ({ ...map, [activeVideo.id]: true }));
          onEarnPoints(activeVideo.points, `Watched: ${activeVideo.title}`);
          onCompleteVideo?.(activeVideo.id);
          success();
          showToast(`+${activeVideo.points} Pts earned for watching!`);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeVideo,
    isPlaying,
    watchedVideoIds,
    rewardClaimedIds,
    onEarnPoints,
    onCompleteVideo,
    success,
    showToast,
  ]);

  // Native video player controls
  const togglePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {
        setPlayerError('Tap play again to start playback.');
      });
    } else {
      el.pause();
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    const nextTime = Number(e.target.value);
    if (el && Number.isFinite(nextTime)) {
      el.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleFullscreen = () => {
    const target = playerContainerRef.current || videoRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
    }
  };

  const handleVideoError = () => {
    if (!activeVideo) return;
    if (!usedFallbackStream && activeVideo.fallbackMediaUrl && resolvedNativeUrl !== activeVideo.fallbackMediaUrl) {
      setUsedFallbackStream(true);
      setResolvedNativeUrl(activeVideo.fallbackMediaUrl);
      setIsBuffering(true);
      return;
    }
    setIsBuffering(false);
    setPlayerError('Unable to load this video stream right now. Please check your connection and tap Retry.');
  };

  // Three-dot menu & player actions
  const toggleSavePlaylist = (video: WatchFeedVideo) => {
    soundService.playClick();
    light();
    setSavedIds((prev) => {
      const exists = prev.includes(video.id);
      const next = exists ? prev.filter((id) => id !== video.id) : [...prev, video.id];
      try {
        localStorage.setItem(SAVED_PLAYLIST_KEY, JSON.stringify(next));
      } catch {}
      showToast(exists ? 'Removed from your playlist' : 'Saved to your playlist');
      return next;
    });
    setOpenMenuVideoId(null);
  };

  const toggleLikeVideo = (video: WatchFeedVideo) => {
    soundService.playClick();
    light();
    setLikedIds((prev) => {
      const exists = prev.includes(video.id);
      const next = exists ? prev.filter((id) => id !== video.id) : [...prev, video.id];
      try {
        localStorage.setItem(LIKED_VIDEOS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleShareVideo = async (video: WatchFeedVideo) => {
    soundService.playClick();
    setOpenMenuVideoId(null);
    const shareText = `Watch "${video.title}" by ${video.creator} on JoyEarn!`;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, text: shareText, url: shareUrl });
        showToast('Shared successfully');
        return;
      } catch {
        // User cancelled or share unsupported — fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast('Video link copied to clipboard');
    } catch {
      showToast('Ready to share: ' + video.title);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportingVideo) return;
    setSubmittingReport(true);
    try {
      if (reportingVideo.vlogRef) {
        await reportVlog(
          reportingVideo.vlogRef.id,
          selectedReportReason,
          currentUser?.uid || 'guest_user'
        );
      } else {
        const raw = localStorage.getItem(REPORTED_VIDEOS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          videoId: reportingVideo.id,
          reason: selectedReportReason,
          reportedAt: new Date().toISOString(),
        });
        localStorage.setItem(REPORTED_VIDEOS_KEY, JSON.stringify(list));
      }
      showToast('Report submitted. Thank you for keeping JoyEarn safe.');
    } catch {
      showToast('Report saved for review.');
    } finally {
      setSubmittingReport(false);
      setReportingVideo(null);
    }
  };

  // Up-next videos when inside the player
  const upNextVideos = useMemo(() => {
    if (!activeVideo) return [];
    const sameCategory = unifiedFeed.filter(
      (v) => v.id !== activeVideo.id && v.category === activeVideo.category
    );
    const others = unifiedFeed.filter(
      (v) => v.id !== activeVideo.id && v.category !== activeVideo.category
    );
    return [...sameCategory, ...others].slice(0, 6);
  }, [activeVideo, unifiedFeed]);

  // Privacy-enhanced YouTube embed URL (respects Data Saver)
  const youtubeEmbedSrc = useMemo(() => {
    if (!activeVideo || activeVideo.videoType !== 'youtube' || !activeVideo.youtubeId) {
      return null;
    }
    const policy = resolveVideoPlaybackPolicy(getDataSaverPreferences(), getNetworkProfile());
    return buildYouTubeEmbedUrl(activeVideo.youtubeId, policy);
  }, [activeVideo]);

  const userInitial = (currentUser?.displayName || currentUser?.email || 'J')
    .charAt(0)
    .toUpperCase();

  // ============================================================================
  // DEDICATED IN-APP VIDEO PLAYER VIEW
  // ============================================================================
  if (activeVideo) {
    const isSaved = savedIds.includes(activeVideo.id);
    const isLiked = likedIds.includes(activeVideo.id);
    const isRewarded =
      watchedVideoIds.includes(activeVideo.id) || Boolean(rewardClaimedIds[activeVideo.id]);
    const rewardPct = isRewarded
      ? 100
      : Math.min(100, Math.round((watchProgressSec / REQUIRED_WATCH_SECONDS) * 100));

    return (
      <div className="min-h-screen bg-white text-slate-900 pb-24 max-w-lg mx-auto w-full">
        {/* Sticky Player Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToFeed}
            className="flex items-center gap-2 text-slate-900 hover:text-[#ec0078] font-bold text-sm tap-bounce"
            aria-label="Back to Vlogs feed"
          >
            <span className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center text-[#ec0078]">
              <ArrowLeft className="w-5 h-5" />
            </span>
            <span>Back</span>
          </button>

          <span className="px-3 py-1 rounded-full bg-[#fce7f3] text-[#831843] text-xs font-bold">
            {activeVideo.category}
          </span>

          <button
            type="button"
            onClick={() => handleShareVideo(activeVideo)}
            className="w-9 h-9 rounded-full bg-pink-50 hover:bg-pink-100 flex items-center justify-center text-slate-800 tap-bounce"
            aria-label="Share video"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </header>

        {/* 16:9 In-App Video Player Stage */}
        <div
          ref={playerContainerRef}
          className="relative w-full aspect-video bg-black overflow-hidden"
        >
          {activeVideo.videoType === 'youtube' && youtubeEmbedSrc ? (
            <iframe
              src={youtubeEmbedSrc}
              title={activeVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                key={resolvedNativeUrl || activeVideo.id}
                src={resolvedNativeUrl || DEFAULT_FALLBACK_VIDEO_STREAM}
                poster={activeVideo.thumbnail}
                playsInline
                autoPlay
                className="w-full h-full object-contain bg-black"
                onClick={togglePlayPause}
                onPlay={() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                  setPlayerError(null);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onLoadedMetadata={(e) => {
                  const target = e.currentTarget;
                  if (Number.isFinite(target.duration)) {
                    setDurationSec(target.duration);
                  }
                }}
                onTimeUpdate={(e) => {
                  setCurrentTime(e.currentTarget.currentTime);
                }}
                onError={handleVideoError}
              />

              {/* Buffering Overlay */}
              {isBuffering && !playerError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              )}

              {/* Error Fallback Overlay */}
              {playerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-5 text-center gap-3">
                  <p className="text-sm font-semibold max-w-xs">{playerError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerError(null);
                      setIsBuffering(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-[#ec0078] text-white text-xs font-bold flex items-center gap-1.5 tap-bounce"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Playback</span>
                  </button>
                </div>
              )}

              {/* Custom Bottom Controls Bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-6 pb-2.5 flex flex-col gap-1.5">
                <input
                  type="range"
                  min={0}
                  max={durationSec || 100}
                  step={0.1}
                  value={Math.min(currentTime, durationSec || 100)}
                  onChange={handleSeek}
                  aria-label="Seek video progress"
                  className="w-full h-1.5 accent-[#ec0078] cursor-pointer rounded-lg"
                />
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-[11px] font-semibold tabular-nums text-white/90">
                      {formatSeconds(currentTime)} / {durationSec > 0 ? formatSeconds(durationSec) : activeVideo.duration}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Info & Controls */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-pink-100">
          <h1 className="text-[17px] font-bold text-slate-900 leading-snug">
            {activeVideo.title}
          </h1>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeVideo.creatorAvatar ? (
                <img
                  src={activeVideo.creatorAvatar}
                  alt={activeVideo.creator}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#ec0078] flex items-center justify-center shrink-0 shadow-xs">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{activeVideo.creator}</p>
                <p className="text-xs text-slate-500">
                  {activeVideo.viewsLabel} • {activeVideo.uploadedAtLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => toggleLikeVideo(activeVideo)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                isLiked
                  ? 'bg-[#ec0078] text-white'
                  : 'bg-[#fce7f3] text-[#831843] hover:bg-[#fbcfe8]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSavePlaylist(activeVideo)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                isSaved
                  ? 'bg-[#ec0078] text-white'
                  : 'bg-[#fce7f3] text-[#831843] hover:bg-[#fbcfe8]'
              }`}
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareVideo(activeVideo)}
              className="px-3.5 py-2 rounded-full text-xs font-bold bg-[#fce7f3] text-[#831843] hover:bg-[#fbcfe8] flex items-center gap-1.5 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setReportingVideo(activeVideo);
              }}
              className="px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 shrink-0"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>

          {/* Preserved Watch Reward Progress Pill */}
          <div className="rounded-2xl bg-pink-50/80 border border-pink-100 px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-[#831843] flex items-center gap-1.5">
                {isRewarded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#ec0078]" />
                )}
                <span>
                  {isRewarded
                    ? `Reward Claimed (+${activeVideo.points} Pts)`
                    : `Keep watching to earn +${activeVideo.points} Pts`}
                </span>
              </span>
              <span className="text-[#ec0078] tabular-nums">{rewardPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-pink-200/70 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isRewarded ? 'bg-emerald-500' : 'bg-[#ec0078]'
                }`}
                style={{ width: `${rewardPct}%` }}
              />
            </div>
          </div>

          {activeVideo.summary && (
            <p className="text-xs text-slate-600 leading-relaxed">{activeVideo.summary}</p>
          )}
        </div>

        {/* Up Next Feed */}
        <div className="px-4 pt-4">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Up Next</h2>
          <div className="space-y-4">
            {upNextVideos.map((vid) => (
              <button
                key={vid.id}
                type="button"
                onClick={() => handleSelectVideo(vid)}
                className="w-full flex items-start gap-3 text-left group tap-bounce"
              >
                <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_THUMBNAIL_FALLBACK;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1.5 right-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                    {vid.duration}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13.5px] font-bold text-slate-900 line-clamp-2 leading-snug">
                    {vid.title}
                  </p>
                  <p className="text-[11.5px] text-slate-500 mt-1 truncate">
                    {vid.creator} • {vid.viewsLabel}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Modal */}
        {reportingVideo && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Report Video</h3>
                <button
                  type="button"
                  onClick={() => setReportingVideo(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{reportingVideo.title}</p>
              <div className="space-y-2">
                {VLOG_REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReportReason(reason)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                      selectedReportReason === reason
                        ? 'border-[#ec0078] bg-pink-50 text-[#831843]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={submittingReport}
                onClick={handleSubmitReport}
                className="w-full py-3 rounded-full bg-[#ec0078] text-white font-bold text-sm hover:bg-[#d1006a] disabled:opacity-60"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MAIN WATCH / VLOGS FEED (EXACT MATCH TO ATTACHED REFERENCE DESIGN)
  // ============================================================================
  return (
    <div className="min-h-screen bg-white text-slate-900 pb-28 max-w-lg mx-auto w-full">
      {/* Sticky Pink-and-White Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md">
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
          {/* Left: JoyEarn Pink Play Icon + Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] flex items-center justify-center shadow-sm">
              <Play className="w-[18px] h-[18px] text-white fill-white ml-0.5" />
            </div>
            <span className="text-[22px] font-extrabold tracking-tight text-[#ec0078] leading-none">
              JoyEarn
            </span>
          </div>

          {/* Right: Animated Camera & Gallery Shortcuts + Search, Bell, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Hidden real Android Camera capture & System Video Picker inputs */}
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleNativeFileChange('camera')}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
            <input
              ref={galleryPickerInputRef}
              type="file"
              accept="video/*"
              onChange={handleNativeFileChange('gallery')}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Compact Animated Camera Shortcut */}
            <button
              type="button"
              onClick={handleTopCameraClick}
              aria-label="Open device camera to record video"
              title="Record Video with Camera"
              className="animate-vlogs-float group inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-gradient-to-br from-[#ff1b8d] to-[#ec0078] text-white shadow-[0_3px_12px_rgba(236,0,120,0.32)] hover:shadow-[0_4px_16px_rgba(236,0,120,0.45)] hover:scale-105 active:scale-90 transition-all duration-150 shrink-0"
            >
              <Camera className="w-3.5 h-3.5 text-white" strokeWidth={2.3} />
              <span className="text-[9px] font-extrabold leading-none mt-0.5 tracking-tight">
                {seniorMode ? 'کیمرہ' : 'Camera'}
              </span>
            </button>

            {/* Compact Animated Gallery Shortcut */}
            <button
              type="button"
              onClick={handleTopGalleryClick}
              aria-label="Open device video gallery picker"
              title="Select Video from Gallery"
              className="animate-vlogs-float-delayed group inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-gradient-to-br from-[#fff0f7] to-[#fce7f3] text-[#ec0078] border border-pink-300/90 shadow-[0_2px_10px_rgba(236,0,120,0.16)] hover:border-[#ec0078] hover:scale-105 active:scale-90 transition-all duration-150 shrink-0"
            >
              <Images className="w-3.5 h-3.5 text-[#ec0078]" strokeWidth={2.3} />
              <span className="text-[9px] font-extrabold leading-none mt-0.5 tracking-tight">
                {seniorMode ? 'گیلری' : 'Gallery'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setSearchOpen((prev) => {
                  if (prev) setSearchQuery('');
                  return !prev;
                });
              }}
              aria-label="Search videos"
              className={`p-1.5 rounded-full transition-colors tap-bounce ${
                searchOpen ? 'bg-pink-100 text-[#ec0078]' : 'text-slate-900 hover:bg-pink-50'
              }`}
            >
              <Search className="w-[20px] h-[20px]" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenNotifications?.();
              }}
              aria-label="Notifications"
              className="relative p-1.5 rounded-full text-slate-900 hover:bg-pink-50 transition-colors tap-bounce"
            >
              <Bell className="w-[20px] h-[20px]" strokeWidth={2.2} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-none flex items-center justify-center border-2 border-white tabular-nums">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenProfile?.();
              }}
              aria-label="User profile"
              className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-pink-200 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center shrink-0 tap-bounce"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : currentUser?.displayName ? (
                <span className="text-xs font-extrabold text-[#ec0078]">{userInitial}</span>
              ) : (
                <User className="w-4 h-4 text-[#ec0078]" />
              )}
            </button>
          </div>
        </div>

        {/* Honest Camera Permission / Hardware Feedback Notice (only shown if camera denied or unavailable) */}
        {mediaNotice && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start justify-between gap-2">
            <span>{mediaNotice}</span>
            <button
              type="button"
              onClick={() => setMediaNotice(null)}
              aria-label="Dismiss notice"
              className="p-0.5 text-rose-500 hover:text-rose-700 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expandable Search Input Bar */}
        {searchOpen && (
          <div className="px-4 pb-2.5">
            <div className="flex items-center gap-2 bg-pink-50/90 border border-pink-200 rounded-full px-3.5 py-2">
              <Search className="w-4 h-4 text-[#ec0078] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vlogs, creators, or categories..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-rose-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-0.5 rounded-full text-rose-500 hover:bg-pink-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Horizontally Scrollable Category Pills */}
        <div className="px-4 pb-3 pt-0.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {VLOG_FEED_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  soundService.playClick();
                  light();
                  setSelectedCategory(category);
                }}
                className={`px-5 py-2 rounded-full text-[13.5px] whitespace-nowrap transition-all shrink-0 tap-bounce ${
                  isActive
                    ? 'bg-[#ec0078] text-white font-bold shadow-xs'
                    : 'bg-[#fce7f3] text-[#831843] font-semibold hover:bg-[#fbcfe8]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Vertical Video Feed */}
      <main className="px-4 pt-1 space-y-5">
        {loadingFeed && unifiedFeed.length === 0 ? (
          <div className="space-y-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse space-y-2.5">
                <div className="w-full aspect-video rounded-2xl bg-pink-50" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-pink-50 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-pink-50 text-[#ec0078] flex items-center justify-center mx-auto">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No videos found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {searchQuery
                ? `No results for "${searchQuery}". Try another keyword or clear your search.`
                : `No videos available in ${selectedCategory} right now.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-5 py-2 rounded-full bg-[#ec0078] text-white text-xs font-bold tap-bounce"
            >
              Show All Videos
            </button>
          </div>
        ) : (
          filteredVideos.map((video) => {
            const isMenuOpen = openMenuVideoId === video.id;
            const isSaved = savedIds.includes(video.id);

            return (
              <article key={video.id} className="relative">
                {/* Large Rounded 16:9 Thumbnail Card */}
                <button
                  type="button"
                  onClick={() => handleSelectVideo(video)}
                  className="block w-full text-left group focus:outline-none"
                >
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 shadow-xs">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_THUMBNAIL_FALLBACK;
                      }}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />

                    {/* Top-Right Duration Badge */}
                    <span className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                      {video.duration}
                    </span>

                    {/* Centered Circular Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xs border border-white/25 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Video Metadata Row Below Thumbnail */}
                <div className="flex items-start gap-3 mt-2.5">
                  {/* Left Pink Play Channel Icon */}
                  <button
                    type="button"
                    onClick={() => handleSelectVideo(video)}
                    className="w-10 h-10 rounded-full bg-[#ec0078] flex items-center justify-center shrink-0 mt-0.5 shadow-xs overflow-hidden"
                    aria-label={video.creator}
                  >
                    {video.creatorAvatar ? (
                      <img
                        src={video.creatorAvatar}
                        alt={video.creator}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    )}
                  </button>

                  {/* Bold Title + Muted Metadata */}
                  <button
                    type="button"
                    onClick={() => handleSelectVideo(video)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <h2 className="text-[15px] font-bold text-slate-900 leading-[1.3] line-clamp-2">
                      {video.title}
                    </h2>
                    <p className="text-[12.5px] text-slate-500 mt-0.5 truncate">
                      {video.creator} • {video.viewsLabel} • {video.uploadedAtLabel}
                    </p>
                  </button>

                  {/* Three-Dot Action Menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundService.playClick();
                        setOpenMenuVideoId(isMenuOpen ? null : video.id);
                      }}
                      aria-label="Video options"
                      className="p-1.5 rounded-full text-slate-700 hover:bg-pink-50 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 z-40 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-1.5 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSavePlaylist(video)}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-pink-50 flex items-center gap-2.5"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[#ec0078]" />
                          ) : (
                            <Bookmark className="w-4 h-4 text-slate-600" />
                          )}
                          <span>{isSaved ? 'Saved in Playlist' : 'Add to Playlist'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareVideo(video)}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-pink-50 flex items-center gap-2.5"
                        >
                          <Share2 className="w-4 h-4 text-slate-600" />
                          <span>Share</span>
                        </button>

                        {onOpenLiveCamera && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuVideoId(null);
                              onOpenLiveCamera();
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-pink-50 flex items-center gap-2.5"
                          >
                            <VideoIcon className="w-4 h-4 text-[#ec0078]" />
                            <span>Record a Vlog</span>
                          </button>
                        )}

                        {onOpenCommunityUpload && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuVideoId(null);
                              onOpenCommunityUpload();
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-pink-50 flex items-center gap-2.5"
                          >
                            <Film className="w-4 h-4 text-[#ec0078]" />
                            <span>Upload Community Vlog</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuVideoId(null);
                            setReportingVideo(video);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report Video</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Report Video Modal */}
      {reportingVideo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Report Video</h3>
              <button
                type="button"
                onClick={() => setReportingVideo(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">{reportingVideo.title}</p>
            <div className="space-y-2">
              {VLOG_REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReportReason(reason)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                    selectedReportReason === reason
                      ? 'border-[#ec0078] bg-pink-50 text-[#831843]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={submittingReport}
              onClick={handleSubmitReport}
              className="w-full py-3 rounded-full bg-[#ec0078] text-white font-bold text-sm hover:bg-[#d1006a] disabled:opacity-60"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
