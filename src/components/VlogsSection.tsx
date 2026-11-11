import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Plus,
  Share2,
  Flag,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  ArrowLeft,
  RefreshCw,
  Video,
  Eye,
  Filter,
  Upload,
  Camera,
  Film,
  FileVideo,
  Trash2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { AppUser, VideoContent } from '../types';
import {
  VlogItem,
  VlogCategory,
  VLOG_CATEGORIES,
  VLOG_REPORT_REASONS,
  VlogReportReason,
  submitVlog,
  getApprovedVlogs,
  getUserVlogs,
  reportVlog,
  blockCreator,
  extractYouTubeVlogId,
  getSubmissionsCountToday,
  getPlayableVlogUrl,
  checkVlogContentSafety,
} from '../services/vlogService';
import { generateVideoThumbnail, getVideoMetadata } from '../services/videoStorageService';
import { CommunitySafetyModal } from './CommunitySafetyModal';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { adMobManager, NATIVE_AD_EVERY_N_ITEMS } from '../services/adMobService';
import { WatchPage } from './WatchPage';

interface VlogsSectionProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  seniorMode?: boolean;
  onOpenLiveCamera?: () => void;
  onOpenAuth?: () => void;
  initialTab?: 'videos' | 'vlogs';
  videos?: VideoContent[];
  onEarnPoints?: (points: number, reason: string) => void;
  onToggleOffline?: (videoId: string) => void;
  watchedVideoIds?: string[];
  onCompleteVideo?: (videoId: string) => void;
  isModal?: boolean;
}

export const VlogsSection: React.FC<VlogsSectionProps> = ({
  isOpen,
  onClose,
  currentUser,
  seniorMode = false,
  onOpenLiveCamera,
  onOpenAuth,
  initialTab = 'videos',
  videos,
  onEarnPoints,
  onToggleOffline,
  watchedVideoIds,
  onCompleteVideo,
  isModal = false,
}) => {
  const { light, success, warning } = useHaptics();

  // Top Level Navigation: "Videos" (Watch catalog & categories) vs "Vlogs" (User community vlogs)
  const [mainSection, setMainSection] = useState<'videos' | 'vlogs'>(initialTab || 'videos');

  useEffect(() => {
    if (initialTab) {
      setMainSection(initialTab);
    }
  }, [initialTab]);

  const [activeTab, setActiveTab] = useState<'feed' | 'share' | 'myVlogs'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [vlogs, setVlogs] = useState<VlogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [activePlayingVlog, setActivePlayingVlog] = useState<VlogItem | null>(null);
  const [activePlayingNativeUrl, setActivePlayingNativeUrl] = useState<string | null>(null);
  const [failedEmbedIds, setFailedEmbedIds] = useState<Record<string, boolean>>({});

  // Share Form State (Native Video & Optional YouTube Link)
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [nativeVideoFile, setNativeVideoFile] = useState<File | null>(null);
  const [nativeVideoBlob, setNativeVideoBlob] = useState<Blob | null>(null);
  const [nativeVideoPreviewUrl, setNativeVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [isShortVideo, setIsShortVideo] = useState<boolean>(false);
  const [videoSizeMb, setVideoSizeMb] = useState<number>(0);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [vlogTitle, setVlogTitle] = useState('');
  const [vlogDesc, setVlogDesc] = useState('');
  const [vlogCat, setVlogCat] = useState<VlogCategory>('cooking');
  const [hasPermission, setHasPermission] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<VlogItem | null>(null);
  const [showTutorialTip, setShowTutorialTip] = useState(false);

  // Community Guidelines & Safety Gate Dialogs
  const [showGuidelinesModal, setShowGuidelinesModal] = useState<boolean>(false);
  const [showSafetyGateModal, setShowSafetyGateModal] = useState<boolean>(false);

  // My Vlogs State
  const [myVlogs, setMyVlogs] = useState<VlogItem[]>([]);
  const [loadingMyVlogs, setLoadingMyVlogs] = useState(false);

  // Report & Block State
  const [reportingVlog, setReportingVlog] = useState<VlogItem | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<VlogReportReason>('inappropriate clothing or content');
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [blockedCreatorMessage, setBlockedCreatorMessage] = useState<string | null>(null);

  // Load feed on open or tab change
  const loadFeed = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const items = await getApprovedVlogs(forceRefresh);
      setVlogs(items);
    } catch (e) {
      console.warn('Could not load vlogs:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMySubmittedVlogs = async () => {
    if (!currentUser?.uid) return;
    setLoadingMyVlogs(true);
    try {
      const items = await getUserVlogs(currentUser.uid);
      setMyVlogs(items);
    } catch (e) {
      console.warn('Could not load user vlogs:', e);
    } finally {
      setLoadingMyVlogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFeed();
      if (currentUser?.uid) {
        loadMySubmittedVlogs();
      }
    }
  }, [isOpen, currentUser?.uid]);

  // Resolve active playable URL for activePlayingVlog
  useEffect(() => {
    let active = true;
    if (activePlayingVlog) {
      if (
        activePlayingVlog.videoType === 'upload' ||
        activePlayingVlog.videoType === 'recorded' ||
        activePlayingVlog.nativeMediaId ||
        !activePlayingVlog.videoId
      ) {
        getPlayableVlogUrl(activePlayingVlog).then((url) => {
          if (active) setActivePlayingNativeUrl(url);
        });
      } else {
        setActivePlayingNativeUrl(null);
      }
    } else {
      setActivePlayingNativeUrl(null);
    }
    return () => {
      active = false;
    };
  }, [activePlayingVlog]);

  // Derived YouTube Preview ID from Form Input (Optional)
  const previewVideoId = useMemo(() => {
    return extractYouTubeVlogId(youtubeUrl);
  }, [youtubeUrl]);

  // Handle Native Video File Selection from Device Gallery
  const handleNativeVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundService.playClick();
    setFormError(null);

    // Format validation
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(file.name)) {
      setFormError('Please select a valid video file format (MP4, WebM, MOV, or OGG).');
      warning();
      return;
    }

    // Size validation: generous 150MB limit for short & long videos
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 150) {
      setFormError(`Video file size (${sizeMb.toFixed(1)} MB) exceeds the maximum limit of 150 MB. Please choose a smaller video.`);
      warning();
      return;
    }

    setProcessingVideo(true);
    try {
      const metadata = await getVideoMetadata(file);
      const thumbnail = await generateVideoThumbnail(file);
      const previewUrl = URL.createObjectURL(file);

      setNativeVideoFile(file);
      setNativeVideoBlob(file);
      setNativeVideoPreviewUrl(previewUrl);
      setVideoDuration(metadata.formattedDuration);
      setIsShortVideo(metadata.isShort);
      setVideoSizeMb(metadata.sizeMb);
      if (thumbnail) {
        setCustomThumbnailUrl(thumbnail);
      }

      // Auto-populate title if empty
      if (!vlogTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').slice(0, 80);
        setVlogTitle(cleanName);
      }

      success();
    } catch (err: any) {
      console.warn('Error processing video:', err);
      setFormError('Could not process this video file. Please try another format.');
      warning();
    } finally {
      setProcessingVideo(false);
    }
  };

  const handleClearNativeVideo = () => {
    soundService.playClick();
    if (nativeVideoPreviewUrl && nativeVideoPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(nativeVideoPreviewUrl);
      } catch {}
    }
    setNativeVideoFile(null);
    setNativeVideoBlob(null);
    setNativeVideoPreviewUrl(null);
    setVideoDuration('');
    setIsShortVideo(false);
    setVideoSizeMb(0);
    setCustomThumbnailUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Launch camera with Community Safety Gate confirmation
  const handleLaunchCamera = () => {
    soundService.playClick();
    const hasAgreed = localStorage.getItem('joyearn_camera_safety_acknowledged') === 'true';
    if (!hasAgreed) {
      setShowSafetyGateModal(true);
    } else {
      onOpenLiveCamera?.();
    }
  };

  const handleConfirmSafetyGateAndOpenCam = () => {
    setShowSafetyGateModal(false);
    try {
      localStorage.setItem('joyearn_camera_safety_acknowledged', 'true');
    } catch {}
    onOpenLiveCamera?.();
  };

  // Filtered vlogs list based on category & failed embeds
  const filteredVlogs = useMemo(() => {
    return vlogs.filter((v) => {
      if (failedEmbedIds[v.id]) return false;
      if (selectedCategory === 'All') return true;
      return v.category.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [vlogs, selectedCategory, failedEmbedIds]);

  const displayedVlogs = useMemo(() => {
    return filteredVlogs.slice(0, visibleCount);
  }, [filteredVlogs, visibleCount]);

  if (!isOpen) return null;

  // Handle Share Submission
  const handleSubmitVlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      onOpenAuth?.();
      return;
    }

    // YouTube link is COMPLETELY OPTIONAL
    const cleanYtId = extractYouTubeVlogId(youtubeUrl);
    const hasYt = Boolean(cleanYtId);
    const hasNative = Boolean(nativeVideoBlob || nativeVideoFile);

    // Require either a native video (uploaded or recorded) OR an optional YouTube link
    if (!hasYt && !hasNative) {
      setFormError('Please attach a video from your gallery, record with your camera, or enter an optional YouTube link.');
      warning();
      return;
    }

    if (!vlogTitle.trim()) {
      setFormError('Please provide a title for your vlog (max 80 characters).');
      warning();
      return;
    }

    // Strict Community Safety Guidelines automated check
    const safetyResult = checkVlogContentSafety(vlogTitle, vlogDesc);
    if (!safetyResult.isSafe) {
      setFormError(safetyResult.flaggedReason || 'This submission contains prohibited words that violate Community Safety Guidelines.');
      warning();
      return;
    }

    // Mandatory Community Safety acknowledgment checkbox
    if (!hasPermission) {
      setFormError('You must confirm that your video follows Community Safety Guidelines and contains no vulgar, harmful or inappropriate content.');
      warning();
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitVlog({
        uid: currentUser.uid,
        creatorName: currentUser.displayName || 'Community Learner',
        title: vlogTitle,
        description: vlogDesc,
        category: vlogCat,
        videoId: cleanYtId || undefined,
        videoType: hasNative ? 'upload' : 'youtube',
        videoBlob: nativeVideoBlob || undefined,
        thumbnailUrl: customThumbnailUrl || undefined,
        duration: videoDuration || undefined,
        isShort: isShortVideo,
        fileSizeMb: videoSizeMb || undefined,
      });

      if (res.success && res.vlog) {
        soundService.playFanfare();
        success();
        setSubmitSuccess(res.vlog);
        setYoutubeUrl('');
        setVlogTitle('');
        setVlogDesc('');
        handleClearNativeVideo();
        setHasPermission(false);
        await loadMySubmittedVlogs();
        setTimeout(() => {
          setSubmitSuccess(null);
          setActiveTab('myVlogs');
        }, 1500);
      } else {
        soundService.playWrong();
        warning();
        setFormError(res.error || 'Failed to submit vlog. Please check requirements.');
      }
    } catch (err: any) {
      soundService.playWrong();
      setFormError(err?.message || 'Error saving vlog. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Report
  const handleConfirmReport = async () => {
    if (!reportingVlog) return;
    soundService.playClick();
    const res = await reportVlog(reportingVlog.id, selectedReportReason, currentUser?.uid);
    success();
    setReportSuccessMessage(
      res.autoHidden
        ? 'Report submitted. This vlog received multiple reports and has been automatically hidden.'
        : 'Thank you. Your report has been submitted for admin safety review.'
    );
    // Remove from active local list if auto-hidden
    if (res.autoHidden) {
      setVlogs((prev) => prev.filter((v) => v.id !== reportingVlog.id));
    }
    setTimeout(() => {
      setReportingVlog(null);
      setReportSuccessMessage(null);
    }, 2000);
  };

  // Handle Block Creator
  const handleBlockCreator = (creatorUid: string, creatorName: string) => {
    soundService.playClick();
    blockCreator(creatorUid);
    setBlockedCreatorMessage(`You have blocked ${creatorName}. Their vlogs will no longer appear for you.`);
    setVlogs((prev) => prev.filter((v) => v.uid !== creatorUid));
    setTimeout(() => setBlockedCreatorMessage(null), 3000);
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={`w-full max-w-lg bg-slate-900 text-white flex flex-col relative ${
        isModal
          ? 'h-[92vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800'
          : 'min-h-screen pb-28 shadow-xl border-x border-slate-800'
      }`}
    >
      {/* =========================================================================
          PRIMARY TWO TABS AT THE TOP: "Videos" vs "Vlogs"
         ========================================================================= */}
      <div className="p-2 sm:p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => {
              soundService.playClick();
              setMainSection('videos');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all tap-bounce ${
              mainSection === 'videos'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{seniorMode ? 'ویڈیوز' : 'Videos'}</span>
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              setMainSection('vlogs');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all tap-bounce ${
              mainSection === 'vlogs'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'کمیونٹی وی لاگز' : 'Vlogs'}</span>
          </button>
        </div>

        <button
          onClick={() => {
            soundService.playClick();
            onClose();
          }}
          className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-bounce shrink-0"
          title="Back to Home"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {mainSection === 'videos' ? (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <WatchPage
            videos={videos}
            onEarnPoints={onEarnPoints || (() => {})}
            onToggleOffline={onToggleOffline}
            seniorMode={seniorMode}
            watchedVideoIds={watchedVideoIds}
            onCompleteVideo={onCompleteVideo}
            onBackToHome={onClose}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* =========================================================================
              HEADER BAR FOR VLOGS
             ========================================================================= */}
          <div className="p-3.5 sm:p-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-lg shadow-sm">
              🎬
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base leading-tight text-white flex items-center gap-1.5">
                <span>{seniorMode ? 'کمیونٹی وی لاگز' : 'Community Vlogs'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> All-Ages Safe
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {seniorMode ? 'سیکھیں، بنائیں اور شیئر کریں' : 'Family-friendly native video uploads & creative vlogs'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                soundService.playClick();
                setShowGuidelinesModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 flex items-center gap-1 tap-bounce"
              title="Community Safety Guidelines"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Rules</span>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                setActiveTab(activeTab === 'share' ? 'feed' : 'share');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 tap-bounce transition-all ${
                activeTab === 'share'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white shadow-md'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeTab === 'share' ? 'Back to Feed' : 'Share Vlog'}</span>
            </button>

            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-bounce"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Block Notice Banner */}
        {blockedCreatorMessage && (
          <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-2 text-xs text-amber-200 flex items-center gap-2 shrink-0 animate-fadeIn">
            <Ban className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{blockedCreatorMessage}</span>
          </div>
        )}

        {/* =========================================================================
            TABS: FEED / MY VLOGS / SHARE A VLOG
           ========================================================================= */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800/80 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundService.playClick();
                setActiveTab('feed');
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all tap-bounce ${
                activeTab === 'feed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                if (!currentUser) {
                  onOpenAuth?.();
                  return;
                }
                setActiveTab('myVlogs');
                loadMySubmittedVlogs();
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all tap-bounce flex items-center gap-1.5 ${
                activeTab === 'myVlogs'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>My Vlogs</span>
              {myVlogs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] font-mono flex items-center justify-center">
                  {myVlogs.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>All-Ages Protected</span>
          </div>
        </div>

        {/* =========================================================================
            BODY CONTENT
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* =====================================================================
              VIEW 1: FEED OF APPROVED VLOGS
             ===================================================================== */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => {
                    soundService.playClick();
                    setSelectedCategory('All');
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all tap-bounce ${
                    selectedCategory === 'All'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Vlogs
                </button>
                {VLOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      soundService.playClick();
                      setSelectedCategory(cat.id);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all tap-bounce ${
                      selectedCategory.toLowerCase() === cat.id.toLowerCase()
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Active Playing Video Embed Modal/Overlay */}
              {activePlayingVlog && (
                <div className="bg-slate-950 rounded-3xl p-3 border border-pink-500/40 shadow-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-bold text-pink-400 flex items-center gap-1.5 truncate pr-2">
                      <Play className="w-3.5 h-3.5 fill-current shrink-0" /> Now Playing: {activePlayingVlog.title}
                    </span>
                    <button
                      onClick={() => setActivePlayingVlog(null)}
                      className="text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 shrink-0"
                    >
                      Close Player ✕
                    </button>
                  </div>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800 flex items-center justify-center">
                    {activePlayingNativeUrl || (activePlayingVlog.videoType && activePlayingVlog.videoType !== 'youtube') ? (
                      <video
                        src={activePlayingNativeUrl || activePlayingVlog.videoUrl}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : activePlayingVlog.videoId ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${activePlayingVlog.videoId}?rel=0&autoplay=1&modestbranding=1`}
                        title={activePlayingVlog.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        onError={() => {
                          setFailedEmbedIds((prev) => ({ ...prev, [activePlayingVlog.id]: true }));
                          setActivePlayingVlog(null);
                        }}
                      />
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        Video source unavailable or loading
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vlogs List */}
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
                  <span>Loading community vlogs...</span>
                </div>
              ) : displayedVlogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-4xl block">🌿</span>
                  <h3 className="font-black text-sm text-white">No Vlogs in this Category Yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Be the first family creator to share an educational video or vlog in this topic!
                  </p>
                  <button
                    onClick={() => {
                      soundService.playClick();
                      setActiveTab('share');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tap-bounce"
                  >
                    Share a Vlog Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedVlogs.map((vlog, idx) => {
                    const isEvery4th = (idx + 1) % NATIVE_AD_EVERY_N_ITEMS === 0;

                    return (
                      <React.Fragment key={vlog.id}>
                        {/* Vlog Card */}
                        <div className="bg-slate-950 rounded-3xl border border-slate-800/90 overflow-hidden shadow-md hover:border-slate-700 transition-all">
                          {/* Thumbnail / Play Click Area */}
                          <div
                            onClick={() => {
                              soundService.playClick();
                              setActivePlayingVlog(vlog);
                            }}
                            className="aspect-video w-full relative bg-slate-900 cursor-pointer group"
                          >
                            <img
                              src={vlog.thumbnail || (vlog.videoId ? `https://i.ytimg.com/vi/${vlog.videoId}/hqdefault.jpg` : '')}
                              alt={vlog.title}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => {
                                if (vlog.videoId) {
                                  (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${vlog.videoId}/mqdefault.jpg`;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </div>
                            </div>
                            {/* Badges */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                              {vlog.duration && (
                                <span className="px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-bold">
                                  {vlog.duration}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-black/75 text-white font-mono text-[10px] font-bold">
                                {vlog.videoType === 'upload' ? 'Native Upload' : vlog.videoType === 'recorded' ? 'Recorded Live' : 'YouTube'}
                              </span>
                            </div>
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-pink-300 border border-pink-500/30">
                                {vlog.category}
                              </span>
                              {vlog.isShort && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                                  ⚡ Short
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Details */}
                          <div className="p-4 space-y-2.5">
                            <div>
                              <h3 className="font-black text-sm text-white line-clamp-2 leading-snug">
                                {vlog.title}
                              </h3>
                              {vlog.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                  {vlog.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white">
                                  {vlog.creatorName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-300 text-[11px] truncate max-w-[130px]">
                                  {vlog.creatorName}
                                </span>
                              </div>

                              {/* Actions: Report & Block */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setReportingVlog(vlog)}
                                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 font-semibold transition-colors"
                                  title="Report safety concern"
                                >
                                  <Flag className="w-3 h-3" />
                                  <span>Report</span>
                                </button>
                                <span className="text-slate-700">•</span>
                                <button
                                  onClick={() => handleBlockCreator(vlog.uid, vlog.creatorName)}
                                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 font-semibold transition-colors"
                                  title="Hide all vlogs from this creator"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Block Creator</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                      </React.Fragment>
                    );
                  })}

                  {/* Load More Button */}
                  {visibleCount < filteredVlogs.length && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => {
                          soundService.playClick();
                          setVisibleCount((prev) => prev + 10);
                        }}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl tap-bounce shadow-xs transition-colors"
                      >
                        Load More Vlogs ({filteredVlogs.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 2: SHARE A VLOG FORM (Native Upload / Camera / Optional YouTube)
             ===================================================================== */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleNativeVideoSelect}
              />

              {/* Strict Community Safety Banner */}
              <div className="p-3 bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/70 rounded-2xl border border-rose-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-white">All-Ages Family Community</h5>
                    <p className="text-[10px] text-slate-300 truncate">
                      Zero tolerance for vulgarity, nudity, or inappropriate content.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setShowGuidelinesModal(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] shrink-0 tap-bounce"
                >
                  View Rules
                </button>
              </div>

              {/* Native Video Upload & Recording Launchpad */}
              <div className="p-4 bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-pink-500" />
                    Attach Video File or Record Live
                  </span>
                  <span className="text-[10px] font-bold text-pink-400 uppercase">
                    Shorts & Long Videos
                  </span>
                </div>

                {nativeVideoPreviewUrl ? (
                  /* Attached Native Video Preview Card */
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-pink-500/40 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white text-xs truncate max-w-[200px]">
                          {nativeVideoFile?.name || 'Live Camera Video'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearNativeVideo}
                        className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 tap-bounce"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>

                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative border border-slate-800">
                      <video
                        src={nativeVideoPreviewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                      {videoDuration && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono font-bold">
                          ⏱️ {videoDuration}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md font-bold ${isShortVideo ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
                        {isShortVideo ? '⚡ Short Video (≤60s)' : '📹 Standard Video'}
                      </span>
                      {videoSizeMb > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {videoSizeMb.toFixed(1)} MB
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Video Input Buttons */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Device Gallery Upload Button */}
                    <button
                      type="button"
                      disabled={processingVideo}
                      onClick={() => {
                        soundService.playClick();
                        fileInputRef.current?.click();
                      }}
                      className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-750 hover:border-pink-500/50 rounded-2xl flex items-center gap-3 text-left tap-bounce transition-all disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="font-black text-xs text-white">Upload from Device</h6>
                        <p className="text-[10px] text-slate-400">Select MP4, MOV, or WebM</p>
                      </div>
                    </button>

                    {/* Camera Recording Button */}
                    <button
                      type="button"
                      disabled={processingVideo}
                      onClick={handleLaunchCamera}
                      className="p-3.5 bg-gradient-to-r from-pink-950/40 to-rose-950/40 hover:from-pink-900/40 hover:to-rose-900/40 border border-rose-800/40 hover:border-rose-500/60 rounded-2xl flex items-center gap-3 text-left tap-bounce transition-all disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="font-black text-xs text-white">Record with Camera</h6>
                        <p className="text-[10px] text-rose-300/80">In-app camera studio</p>
                      </div>
                    </button>
                  </div>
                )}

                {processingVideo && (
                  <div className="p-3 bg-slate-900 rounded-xl text-center text-xs text-pink-300 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-pink-500" />
                    <span>Processing video format and generating thumbnail...</span>
                  </div>
                )}
              </div>

              {/* YouTube Tutorial Tip Box */}
              {showTutorialTip && (
                <div className="bg-indigo-950/70 border border-indigo-800/80 rounded-3xl p-4 space-y-2 relative">
                  <button
                    onClick={() => setShowTutorialTip(false)}
                    className="absolute top-3 right-3 text-indigo-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <span>Tutorial: How to use YouTube link (Optional)</span>
                  </div>
                  <ol className="text-xs text-indigo-200/90 list-decimal list-inside space-y-1 font-medium leading-relaxed pl-1">
                    <li>Upload your video to YouTube.</li>
                    <li>Set visibility to <strong>Public</strong> or <strong>Unlisted</strong>.</li>
                    <li>Turn ON <strong>&ldquo;Allow embedding&rdquo;</strong> in advanced settings.</li>
                    <li>Paste the link below. YouTube link is optional if you uploaded a video directly.</li>
                  </ol>
                </div>
              )}

              {/* Daily Submission Counter Badge */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400">Submissions Today:</span>
                <span className="font-black text-amber-400">
                  {getSubmissionsCountToday()}/2 Daily Limit
                </span>
              </div>

              {/* The Form */}
              <form onSubmit={handleSubmitVlog} className="space-y-4">
                {/* 1. YouTube Link (COMPLETELY OPTIONAL) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-black text-slate-200 flex items-center gap-1.5">
                      <span>YouTube Video Link (Optional)</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Optional
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTutorialTip(!showTutorialTip)}
                      className="text-[10px] text-pink-400 hover:text-pink-300 font-bold"
                    >
                      {showTutorialTip ? 'Hide Tutorial' : 'Show Tutorial'}
                    </button>
                  </div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... (Optional if video attached)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />

                  {/* Thumbnail Live Preview if YouTube URL is provided */}
                  {previewVideoId ? (
                    <div className="mt-2 p-2.5 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid YouTube Video ID: {previewVideoId}</span>
                      </div>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative border border-slate-800">
                        <img
                          src={`https://i.ytimg.com/vi/${previewVideoId}/hqdefault.jpg`}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <span className="text-xs font-black px-2.5 py-1 bg-black/70 rounded-full text-white">
                            Automatic Thumbnail Preview
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : youtubeUrl.trim().length > 5 ? (
                    <p className="text-[11px] text-rose-400">
                      Could not extract YouTube ID. Please verify the URL or clear this field.
                    </p>
                  ) : null}
                </div>

                {/* 2. Vlog Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-black text-slate-200">Vlog Title *</label>
                    <span className={`text-[10px] font-mono ${vlogTitle.length > 70 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {vlogTitle.length}/80 max
                    </span>
                  </div>
                  <input
                    type="text"
                    value={vlogTitle}
                    onChange={(e) => setVlogTitle(e.target.value.slice(0, 80))}
                    placeholder="e.g., Quick Cooking Tips for Healthy Vegetables"
                    maxLength={80}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    required
                  />
                </div>

                {/* 3. Short Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-black text-slate-200">Short Description</label>
                    <span className={`text-[10px] font-mono ${vlogDesc.length > 270 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {vlogDesc.length}/300 max
                    </span>
                  </div>
                  <textarea
                    value={vlogDesc}
                    onChange={(e) => setVlogDesc(e.target.value.slice(0, 300))}
                    placeholder="Explain what learners will discover in your vlog..."
                    maxLength={300}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none resize-none transition-colors"
                  />
                </div>

                {/* 4. Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-200">Vlog Category *</label>
                  <select
                    value={vlogCat}
                    onChange={(e) => setVlogCat(e.target.value as VlogCategory)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-2xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    {VLOG_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Mandatory Safety Checkbox */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-rose-800/40 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasPermission}
                      onChange={(e) => setHasPermission(e.target.checked)}
                      className="mt-0.5 rounded text-pink-600 focus:ring-0 w-4 h-4 cursor-pointer accent-pink-600 shrink-0"
                      required
                    />
                    <span className="text-xs text-slate-300 leading-snug">
                      I confirm this video is 100% family-friendly, adheres to all Community Safety Guidelines, contains no vulgarity, nudity, profanity, or inappropriate content, and is suitable for all ages.
                    </span>
                  </label>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {submitSuccess ? (
                  <div className="p-3.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-2xl text-xs flex items-center justify-center gap-2 font-bold animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Vlog submitted! Sent to admin review queue.</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || processingVideo}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-lg tap-bounce transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting & Verifying...' : 'Submit Vlog for Approval'}
                  </button>
                )}
              </form>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: MY VLOGS (Creator Status Tracking)
             ===================================================================== */}
          {activeTab === 'myVlogs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Your Submissions & Real-Time Approval Status</span>
                <button
                  onClick={loadMySubmittedVlogs}
                  className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {loadingMyVlogs ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-pink-500" />
                  <span>Loading your vlogs...</span>
                </div>
              ) : myVlogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-4xl block">🎬</span>
                  <h3 className="font-black text-sm text-white">No Vlogs Submitted Yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Share a wholesome YouTube vlog link to inspire fellow learners and build your creator profile!
                  </p>
                  <button
                    onClick={() => {
                      soundService.playClick();
                      setActiveTab('share');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tap-bounce"
                  >
                    Share Your First Vlog
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myVlogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3"
                    >
                      <div className="w-24 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative border border-slate-800">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-black text-xs text-white truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="uppercase font-bold text-pink-400">{item.category}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="pt-1">
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Approved & Public</span>
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                <span>✕ Rejected</span>
                              </span>
                              {item.rejectionReason && (
                                <p className="text-[10px] text-rose-300/90 leading-tight">
                                  Reason: {item.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

      {/* =========================================================================
          REPORT MODAL DIALOG
         ========================================================================= */}
      {reportingVlog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-500" />
                <h3 className="font-black text-sm text-white">Report Vlog Content</h3>
              </div>
              <button
                onClick={() => setReportingVlog(null)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Report &ldquo;<span className="text-white font-bold">{reportingVlog.title}</span>&rdquo; by {reportingVlog.creatorName}:
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Reason:
              </label>
              {VLOG_REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  onClick={() => setSelectedReportReason(r)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReportReason === r
                      ? 'bg-rose-950/60 border-rose-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={selectedReportReason === r}
                    onChange={() => setSelectedReportReason(r)}
                    className="accent-rose-600"
                  />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>

            {reportSuccessMessage ? (
              <div className="p-2.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center">
                {reportSuccessMessage}
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReportingVlog(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold tap-bounce"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReport}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black tap-bounce"
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Safety Guidelines Modal */}
      <CommunitySafetyModal
        isOpen={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
        isSafetyGate={false}
      />

      {/* Camera Safety Gate Modal */}
      <CommunitySafetyModal
        isOpen={showSafetyGateModal}
        onClose={() => setShowSafetyGateModal(false)}
        isSafetyGate={true}
        onAgree={handleConfirmSafetyGateAndOpenCam}
      />
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
};
