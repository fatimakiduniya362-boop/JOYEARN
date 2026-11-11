import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Video,
  RotateCcw,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Pause,
  Upload,
  User,
  Share2,
  Volume2,
  Grid,
  Maximize2,
  RefreshCw,
  Sliders,
  Smile,
  Heart
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { AppUser } from '../types';
import { CommunitySafetyModal } from './CommunitySafetyModal';

interface CameraStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
  onEarnPoints: (points: number, reason: string) => void;
  onSetProfilePhoto?: (photoDataUrl: string) => void;
  currentUser?: AppUser | null;
  onPublishVlog?: (vlog: { title: string; category: string; videoUrl: string; duration: string; videoBlob?: Blob }) => void;
}

export type CameraFilter = 'normal' | 'warm' | 'vivid' | 'soft' | 'bw' | 'cyber' | 'vintage';

export interface StickerOption {
  id: string;
  label: string;
  emoji: string;
}

const STICKERS: StickerOption[] = [
  { id: 'scholar', label: 'JoyLearner', emoji: '🎓' },
  { id: 'star', label: '100% Verified', emoji: '⭐' },
  { id: 'rocket', label: 'Future Genius', emoji: '🚀' },
  { id: 'family', label: 'JoyEarn Family', emoji: '🌸' },
  { id: 'pakistan', label: 'Pak Pride', emoji: '🇵🇰' },
  { id: 'trophy', label: 'Champion', emoji: '🏆' },
];

export const CameraStudioModal: React.FC<CameraStudioModalProps> = ({
  isOpen,
  onClose,
  seniorMode = false,
  onEarnPoints,
  onSetProfilePhoto,
  currentUser,
  onPublishVlog
}) => {
  const { light, success, warning, heavy, selection } = useHaptics();

  // Mode: 'photo' (Snap picture) or 'video' (Record short video)
  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  // Facing mode: 'user' (front camera) or 'environment' (back camera)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Camera stream state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Filter & Sticker
  const [activeFilter, setActiveFilter] = useState<CameraFilter>('normal');
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  // Flash shutter effect
  const [isFlashing, setIsFlashing] = useState(false);

  // Community Safety Gate State
  const [hasAcknowledgedSafety, setHasAcknowledgedSafety] = useState(() => {
    try {
      return localStorage.getItem('joyearn_camera_safety_acknowledged') === 'true';
    } catch {
      return false;
    }
  });
  const [showSafetyGate, setShowSafetyGate] = useState(false);
  const [showGuidelinesViewer, setShowGuidelinesViewer] = useState(false);

  // Photo capture preview state
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0);

  // Upload/publish form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('Science');
  const [hasClaimedPoints, setHasClaimedPoints] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // DOM refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Max recording duration: 60 seconds
  const MAX_RECORDING_SECONDS = 60;

  // CSS Filter styles
  const filterStyles: Record<CameraFilter, string> = {
    normal: 'none',
    warm: 'sepia(0.3) saturate(1.4) brightness(1.05)',
    vivid: 'saturate(1.7) contrast(1.15)',
    soft: 'brightness(1.1) contrast(0.95) saturate(1.2)',
    bw: 'grayscale(1) contrast(1.25)',
    cyber: 'hue-rotate(35deg) saturate(1.6)',
    vintage: 'sepia(0.45) contrast(1.1) brightness(0.95)',
  };

  // Start or restart camera stream
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing stream if running
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      let mediaStream: MediaStream;
      try {
        // Try requesting video + audio
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      } catch (err: any) {
        // Fallback: If audio is denied or not present, try video-only
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Audio meter analyzer if audio track present
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack && typeof window !== 'undefined') {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(mediaStream);
            source.connect(analyser);
            analyser.fftSize = 64;
            audioContextRef.current = audioCtx;
            audioAnalyserRef.current = analyser;

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (analyser) {
                analyser.getByteFrequencyData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) sum += buffer[i];
                const avg = sum / buffer.length;
                setAudioMeterLevel(Math.min(100, Math.round((avg / 128) * 100)));
              }
              audioAnimFrameRef.current = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          }
        } catch (e) {
          console.warn('Audio metering unavailable:', e);
        }
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera and microphone access in browser settings.'
          : err?.message || 'Unable to access camera on this device. You can still upload photos/videos below.'
      );
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleConfirmSafetyGate = () => {
    setHasAcknowledgedSafety(true);
    setShowSafetyGate(false);
    try {
      localStorage.setItem('joyearn_camera_safety_acknowledged', 'true');
    } catch {}
    startCamera(facingMode);
  };

  const handleCancelSafetyGate = () => {
    setShowSafetyGate(false);
    onClose();
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!hasAcknowledgedSafety) {
        setShowSafetyGate(true);
      } else {
        startCamera(facingMode);
      }
      setCapturedPhotoUrl(null);
      setRecordedVideoUrl(null);
      setRecordedBlob(null);
      setRecordingSeconds(0);
      setIsRecording(false);
      setHasClaimedPoints(false);
      setFeedbackNotice(null);
    } else {
      setShowSafetyGate(false);
      // Clean up stream when modal closes
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioAnimFrameRef.current) {
        cancelAnimationFrame(audioAnimFrameRef.current);
      }
      clearInterval(timerIntervalRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Flip camera between front and back
  const handleToggleCamera = () => {
    soundService.playClick();
    selection();
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture Photo
  const handleCapturePhoto = () => {
    if (!videoPreviewRef.current) return;
    soundService.playClick();
    heavy();

    // Trigger visual shutter flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 220);

    const video = videoPreviewRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply mirroring if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Apply CSS filter
    ctx.filter = filterStyles[activeFilter] === 'none' ? 'none' : filterStyles[activeFilter];
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform for sticker rendering
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.filter = 'none';

    // Render sticker overlay if chosen
    if (selectedSticker) {
      const stickerObj = STICKERS.find((s) => s.id === selectedSticker);
      if (stickerObj) {
        const badgeHeight = 60;
        const badgeWidth = 260;
        const x = 30;
        const y = canvas.height - badgeHeight - 40;

        // Draw pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(x, y, badgeWidth, badgeHeight, 20);
        ctx.fill();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw sticker emoji and text
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${stickerObj.emoji} ${stickerObj.label}`, x + 18, y + 42);
      }
    }

    // Watermark tag
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('📸 JoyEarn Studio', canvas.width - 210, canvas.height - 30);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhotoUrl(dataUrl);

    // Award photo creation points once
    if (!hasClaimedPoints) {
      setHasClaimedPoints(true);
      onEarnPoints(50, 'Captured Learning Photo with JoyEarn Camera 📸');
      setFeedbackNotice('+50 JoyPoints Earned for Capturing Photo!');
      soundService.playCoin();
      success();
    }
  };

  // Start Video Recording
  const handleStartRecording = () => {
    if (!stream) return;
    soundService.playClick();
    heavy();

    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    setIsPaused(false);

    // Determine supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(timerIntervalRef.current);
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType || 'video/webm',
        });
        setRecordedBlob(finalBlob);
        const videoUrl = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(videoUrl);
        setIsRecording(false);
        setIsPaused(false);

        // Award video creator points
        if (!hasClaimedPoints) {
          setHasClaimedPoints(true);
          onEarnPoints(100, 'Recorded Learning Video Vlog 🎥');
          setFeedbackNotice('+100 JoyPoints Earned for Video Creation!');
          soundService.playFanfare();
          success();
        }
      };

      recorder.start(1000); // 1-second timeslices
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Start recording timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      warning();
      setCameraError('Recording not supported on this browser profile. You can upload a pre-recorded video.');
    }
  };

  // Pause / Resume Recording
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    soundService.playClick();
    light();

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerIntervalRef.current);
    }
  };

  // Stop Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      soundService.playClick();
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
    }
  };

  // Download captured photo
  const handleDownloadPhoto = () => {
    if (!capturedPhotoUrl) return;
    soundService.playClick();
    success();
    const link = document.createElement('a');
    link.href = capturedPhotoUrl;
    link.download = `joyearn_photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackNotice('Photo saved to your device gallery!');
  };

  // Download recorded video
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    soundService.playClick();
    success();
    const link = document.createElement('a');
    link.href = recordedVideoUrl;
    link.download = `joyearn_video_${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackNotice('Video saved to your device gallery!');
  };

  // Set as profile avatar
  const handleSetProfileAvatar = () => {
    if (!capturedPhotoUrl) return;
    soundService.playClick();
    success();
    onSetProfilePhoto?.(capturedPhotoUrl);
    try {
      localStorage.setItem('joyearn_custom_avatar', capturedPhotoUrl);
      const cached = localStorage.getItem('joyearn_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.photoURL = capturedPhotoUrl;
        localStorage.setItem('joyearn_cached_profile', JSON.stringify(parsed));
      }
    } catch {}
    setFeedbackNotice('Profile Avatar updated successfully! 🌟');
  };

  // Publish video to Vlog Shorts / Community Feed
  const handlePublishVideoToFeed = () => {
    if (!recordedVideoUrl) return;
    soundService.playFanfare();
    success();

    const title = videoTitle.trim() || 'My Educational Vlog';
    onPublishVlog?.({
      title,
      category: videoCategory,
      videoUrl: recordedVideoUrl,
      duration: `${recordingSeconds}s`,
      videoBlob: recordedBlob || undefined,
    });

    setFeedbackNotice('Video published to JoyEarn Educational Vlogs Feed! 🎬');
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  // Native device file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundService.playClick();
    light();

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhotoUrl(reader.result as string);
        if (!hasClaimedPoints) {
          setHasClaimedPoints(true);
          onEarnPoints(50, 'Imported Photo to JoyEarn Studio 📸');
          setFeedbackNotice('+50 JoyPoints Earned for Uploading Photo!');
        }
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setRecordedVideoUrl(url);
      setRecordedBlob(file);
      if (!hasClaimedPoints) {
        setHasClaimedPoints(true);
        onEarnPoints(100, 'Imported Video to JoyEarn Studio 🎥');
        setFeedbackNotice('+100 JoyPoints Earned for Uploading Video!');
      }
    }
  };

  // Format timer seconds (MM:SS)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-[92vh] max-h-[820px] bg-slate-900 text-white rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-slate-800">
        
        {/* Shutter flash animation overlay */}
        {isFlashing && (
          <div className="absolute inset-0 z-50 bg-white pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Top Header */}
        <div className="p-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg">
              {mode === 'photo' ? '📸' : '🎥'}
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {seniorMode
                  ? mode === 'photo'
                    ? 'تصویر لیں (کیمرہ اسٹوڈیو)'
                    : 'ویڈیو بنائیں (ویڈیو ریکارڈر)'
                  : mode === 'photo'
                  ? 'JoyEarn Photo Studio'
                  : 'JoyEarn Video Recorder'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {seniorMode ? 'خاندانی تحفظ • تعلیمی اسٹوڈیو' : 'Safe & verified educational content creator'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Grid toggle */}
            {!capturedPhotoUrl && !recordedVideoUrl && (
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-xl border text-xs tap-bounce ${
                  showGrid ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Toggle 3x3 Composition Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
            )}

            {/* Switch Camera */}
            {!capturedPhotoUrl && !recordedVideoUrl && (
              <button
                onClick={handleToggleCamera}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs tap-bounce"
                title="Switch Front/Back Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Community Safety Guidelines Button */}
            <button
              onClick={() => {
                soundService.playClick();
                setShowGuidelinesViewer(true);
              }}
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-pink-400 hover:text-pink-300 text-[10px] font-black flex items-center gap-1 tap-bounce"
              title="Community Safety Guidelines"
            >
              <span>🛡️</span>
              <span className="hidden sm:inline">Rules</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center tap-bounce"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Notice */}
        {feedbackNotice && (
          <div className="bg-emerald-600/90 text-white font-bold text-xs p-2 px-3 flex items-center justify-between border-b border-emerald-500 animate-in slide-in-from-top-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackNotice}</span>
            </span>
            <button onClick={() => setFeedbackNotice(null)} className="text-white/80 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Mode Switcher Pill (Photo 📸 vs Video 🎥) */}
        {!capturedPhotoUrl && !recordedVideoUrl && (
          <div className="p-2 bg-slate-950/60 border-b border-slate-800/80 flex justify-center z-10">
            <div className="bg-slate-800/90 p-1 rounded-2xl flex gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setMode('photo');
                  if (isRecording) handleStopRecording();
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all tap-bounce ${
                  mode === 'photo'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{seniorMode ? 'تصویر لیں (Photo)' : 'Take Photo'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setMode('video');
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all tap-bounce ${
                  mode === 'video'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>{seniorMode ? 'ویڈیو بنائیں (Video)' : 'Record Video'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          
          {/* CAMERA ERROR / PERMISSION DENIED FALLBACK */}
          {cameraError && !capturedPhotoUrl && !recordedVideoUrl && (
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="w-14 h-14 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-3xl mx-auto">
                📷
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Camera Access Needed</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {cameraError}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => startCamera(facingMode)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl tap-bounce shadow"
                >
                  Retry Camera Access
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-black px-2 text-slate-500 font-bold">Or select from device</span></div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept={mode === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs rounded-xl tap-bounce flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-400" />
                  <span>Choose Existing {mode === 'photo' ? 'Photo' : 'Video'} File</span>
                </button>
              </div>
            </div>
          )}

          {/* INITIALIZING SPINNER */}
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 space-y-2">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              <span className="text-xs font-bold text-slate-300">Activating camera...</span>
            </div>
          )}

          {/* LIVE CAMERA FEED */}
          {!capturedPhotoUrl && !recordedVideoUrl && !cameraError && (
            <div className="w-full h-full relative flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                style={{
                  filter: filterStyles[activeFilter],
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
                className="w-full h-full object-cover"
              />

              {/* 3x3 Composition Grid Guide */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-white/25" />
                  <div className="border-r border-white/25" />
                  <div />
                </div>
              )}

              {/* Selected Sticker Badge Preview */}
              {selectedSticker && (
                <div className="absolute bottom-6 left-4 bg-slate-900/85 border border-rose-500 rounded-2xl p-2 px-3.5 text-xs font-black text-white flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                  <span>{STICKERS.find((s) => s.id === selectedSticker)?.emoji}</span>
                  <span>{STICKERS.find((s) => s.id === selectedSticker)?.label}</span>
                  <button
                    onClick={() => setSelectedSticker(null)}
                    className="ml-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Live Video Recording Timer & Indicators */}
              {mode === 'video' && isRecording && (
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
                  <div className="bg-red-600/90 text-white font-black text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-xs animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    <span>REC {formatTimer(recordingSeconds)} / 01:00</span>
                  </div>

                  {/* Audio Volume Level Meter */}
                  <div className="bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-700 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ width: `${audioMeterLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAPTURED PHOTO REVIEW SCREEN */}
          {capturedPhotoUrl && (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
              <img
                src={capturedPhotoUrl}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-xs border border-emerald-500/40 text-emerald-400 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Photo Captured!</span>
              </div>
            </div>
          )}

          {/* RECORDED VIDEO REVIEW SCREEN */}
          {recordedVideoUrl && (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
              <video
                ref={playbackVideoRef}
                src={recordedVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-xs border border-emerald-500/40 text-emerald-400 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Video Recorded ({recordingSeconds}s)!</span>
              </div>
            </div>
          )}
        </div>

        {/* FILTER & STICKER TOOLBAR (When in live camera view) */}
        {!capturedPhotoUrl && !recordedVideoUrl && !cameraError && (
          <div className="bg-slate-950/90 border-t border-slate-800/80 p-2.5 space-y-2 z-20">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] uppercase font-black text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>Filters:</span>
              </span>
              {(['normal', 'warm', 'vivid', 'soft', 'bw', 'cyber', 'vintage'] as CameraFilter[]).map((filterKey) => (
                <button
                  type="button"
                  key={filterKey}
                  onClick={() => {
                    soundService.playClick();
                    setActiveFilter(filterKey);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] shrink-0 transition-all tap-bounce ${
                    activeFilter === filterKey
                      ? 'bg-rose-600 text-white font-black shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            {/* Sticker Chips (for Photo Mode) */}
            {mode === 'photo' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <span className="text-[10px] uppercase font-black text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                  <Smile className="w-3 h-3" />
                  <span>Stickers:</span>
                </span>
                {STICKERS.map((stk) => (
                  <button
                    type="button"
                    key={stk.id}
                    onClick={() => {
                      soundService.playClick();
                      setSelectedSticker(selectedSticker === stk.id ? null : stk.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold shrink-0 flex items-center gap-1 transition-all tap-bounce ${
                      selectedSticker === stk.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{stk.emoji}</span>
                    <span>{stk.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3 z-20">
          
          {/* STATE A: LIVE CAMERA CONTROLS */}
          {!capturedPhotoUrl && !recordedVideoUrl && !cameraError && (
            <div className="flex items-center justify-around">
              {/* Native device file picker trigger */}
              <input
                type="file"
                ref={fileInputRef}
                accept={mode === 'photo' ? 'image/*' : 'video/*'}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-white tap-bounce text-[9px] font-bold"
                title="Select media from device"
              >
                <Upload className="w-4 h-4 mb-0.5 text-rose-400" />
                <span>Import</span>
              </button>

              {/* PHOTO MODE: BIG SHUTTER BUTTON */}
              {mode === 'photo' && (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="w-18 h-18 rounded-full bg-white p-1.5 shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-4 border-rose-500"
                  title="Snap Photo"
                >
                  <div className="w-full h-full rounded-full bg-rose-600 flex items-center justify-center text-white">
                    <Camera className="w-7 h-7" />
                  </div>
                </button>
              )}

              {/* VIDEO MODE: BIG RECORD / STOP BUTTON */}
              {mode === 'video' && (
                <div className="flex items-center gap-3">
                  {/* Pause / Resume button during recording */}
                  {isRecording && (
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center tap-bounce"
                      title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Main Record/Stop Button */}
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`w-18 h-18 rounded-full p-1.5 shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-4 ${
                      isRecording ? 'border-red-400 bg-white' : 'border-rose-500 bg-white'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    <div className={`w-full h-full transition-all flex items-center justify-center text-white ${
                      isRecording ? 'rounded-2xl bg-red-600' : 'rounded-full bg-red-600'
                    }`}>
                      {isRecording ? <Square className="w-6 h-6 fill-white" /> : <div className="w-6 h-6 rounded-full bg-white" />}
                    </div>
                  </button>
                </div>
              )}

              {/* Flip camera */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-white tap-bounce text-[9px] font-bold"
                title="Switch Front/Back Camera"
              >
                <RefreshCw className="w-4 h-4 mb-0.5 text-sky-400" />
                <span>Flip</span>
              </button>
            </div>
          )}

          {/* STATE B: PHOTO REVIEW ACTION BAR */}
          {capturedPhotoUrl && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setCapturedPhotoUrl(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tap-bounce flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPhoto}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs tap-bounce flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetProfileAvatar}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs tap-bounce shadow flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Set as Avatar</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold tap-bounce"
              >
                Done / Close Studio
              </button>
            </div>
          )}

          {/* STATE C: VIDEO REVIEW ACTION BAR */}
          {recordedVideoUrl && (
            <div className="space-y-3">
              <div className="space-y-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs">
                <span className="font-bold text-slate-300 block">Post Video to Vlog Feed:</span>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Vlog Title: e.g. Daily Science Discovery"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-hidden focus:border-rose-500"
                />
                <select
                  value={videoCategory}
                  onChange={(e) => setVideoCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-hidden"
                >
                  <option value="Science">Science & Nature</option>
                  <option value="Arts">Arts & Creativity</option>
                  <option value="Cooking">Cooking & Recipes</option>
                  <option value="General">General Education</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setRecordedVideoUrl(null);
                    setRecordedBlob(null);
                    setRecordingSeconds(0);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tap-bounce flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs tap-bounce flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Video</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublishVideoToFeed}
                  className="py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs tap-bounce shadow flex items-center justify-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Post Vlog</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Community Safety Gate Modal (Requires confirmation before camera stream starts) */}
        <CommunitySafetyModal
          isOpen={showSafetyGate}
          onClose={handleCancelSafetyGate}
          onConfirm={handleConfirmSafetyGate}
          isSafetyGate={true}
          seniorMode={seniorMode}
        />

        {/* Community Safety Guidelines Viewer */}
        <CommunitySafetyModal
          isOpen={showGuidelinesViewer}
          onClose={() => setShowGuidelinesViewer(false)}
          isSafetyGate={false}
          seniorMode={seniorMode}
        />

      </div>
    </div>
  );
};
