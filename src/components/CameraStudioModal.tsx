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
  Heart,
  Mic,
  Headphones
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { AppUser } from '../types';
import { CommunitySafetyModal } from './CommunitySafetyModal';
import {
  VoiceFilterId,
  VOICE_FILTER_PRESETS,
  VoiceFilterPipeline,
  createVoiceFilterPipeline
} from '../services/voiceFilterService';
import {
  CameraPermissionState,
  SelectedMediaMetadata,
  detectCameraEnvironment,
  queryBrowserPermission,
  classifyCameraError,
  validateSelectedMediaFile,
  getSafeMediaFilename,
  formatFileSize,
} from '../services/cameraPermissionService';

interface CameraStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  seniorMode?: boolean;
  onEarnPoints: (points: number, reason: string) => void;
  onSetProfilePhoto?: (photoDataUrl: string) => void;
  currentUser?: AppUser | null;
  initialMode?: 'photo' | 'video';
  onPublishVlog?: (
    vlog: { title: string; category: string; videoUrl: string; duration: string; videoBlob?: Blob },
    onProgress?: (percent: number) => void
  ) => Promise<{ success: boolean; error?: string }> | void;
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
  initialMode = 'video',
  onPublishVlog
}) => {
  const { light, success, warning, heavy, selection } = useHaptics();

  // Mode: 'photo' (Snap picture) or 'video' (Record short video)
  const [mode, setMode] = useState<'photo' | 'video'>(initialMode);

  // Facing mode: 'user' (front camera) or 'environment' (back camera)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Camera stream & 10-state permission/readiness tracking
  const envInfoRef = useRef(detectCameraEnvironment());
  const envInfo = envInfoRef.current;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('not_requested');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorTitle, setCameraErrorTitle] = useState<string | null>(null);
  const [cameraSettingsGuidance, setCameraSettingsGuidance] = useState<string | null>(null);
  const [cameraErrorKind, setCameraErrorKind] = useState<'permission' | 'policy' | 'hardware' | 'unsupported' | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showStalledHelper, setShowStalledHelper] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [micDeniedWarning, setMicDeniedWarning] = useState(false);
  const [selectedMediaMeta, setSelectedMediaMeta] = useState<SelectedMediaMetadata | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Filter, Voice Effect & Sticker
  const [activeFilter, setActiveFilter] = useState<CameraFilter>('normal');
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterId>('normal');
  const [isMonitoringVoice, setIsMonitoringVoice] = useState(false);
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
  const [videoCategory, setVideoCategory] = useState('learning');
  const [hasClaimedPoints, setHasClaimedPoints] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPublishError(null);
      setUploadProgress(0);
      setIsPublishing(false);
    }
  }, [isOpen, initialMode]);

  // DOM & mutable lifecycle refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);
  const voicePipelineRef = useRef<VoiceFilterPipeline | null>(null);
  const processedAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const activeVoiceFilterRef = useRef<VoiceFilterId>('normal');
  const isMonitoringVoiceRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const cameraRequestIdRef = useRef<number>(0);
  const recordedUrlRef = useRef<string | null>(null);
  const recordingSecondsRef = useRef<number>(0);
  const activeDeviceIdRef = useRef<string | null>(null);

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

  const cleanupAudioPipeline = useCallback(() => {
    if (audioAnimFrameRef.current !== null) {
      cancelAnimationFrame(audioAnimFrameRef.current);
      audioAnimFrameRef.current = null;
    }
    if (voicePipelineRef.current) {
      voicePipelineRef.current.dispose();
      voicePipelineRef.current = null;
    }
    if (monitorGainRef.current) {
      try {
        monitorGainRef.current.disconnect();
      } catch {}
      monitorGainRef.current = null;
    }
    if (processedAudioDestRef.current) {
      try {
        processedAudioDestRef.current.disconnect();
      } catch {}
      processedAudioDestRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    setAudioMeterLevel(0);
  }, []);

  const stopMediaResources = useCallback((): boolean => {
    let stoppedActiveTracks = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    cleanupAudioPipeline();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          stoppedActiveTracks = true;
        }
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    activeDeviceIdRef.current = null;
    setStream(null);
    setHasAudioTrack(false);
    setIsVideoReady(false);
    setShowStalledHelper(false);
    return stoppedActiveTracks;
  }, [cleanupAudioPipeline]);

  const attachStreamToVideoElement = useCallback((videoEl: HTMLVideoElement | null, mediaStream: MediaStream | null) => {
    if (!videoEl || !mediaStream) return;
    // Explicitly force muted + playsInline DOM properties so WebKit/Android WebViews allow autoplay
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.volume = 0;
    videoEl.playsInline = true;
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');

    // Attach video tracks only to preview element to prevent mic echo or iOS audio-session pause
    const videoTracks = mediaStream.getVideoTracks();
    const previewStream = videoTracks.length > 0 ? new MediaStream(videoTracks) : mediaStream;
    const currentObj = videoEl.srcObject as MediaStream | null;
    const currentTrackIds = currentObj ? currentObj.getVideoTracks().map((t) => t.id).join(',') : '';
    const nextTrackIds = previewStream.getVideoTracks().map((t) => t.id).join(',');

    if (currentTrackIds !== nextTrackIds || !currentObj) {
      videoEl.srcObject = previewStream;
    }
    videoEl.play().catch(() => {});
  }, []);

  const setupAudioPipeline = useCallback((mediaStream: MediaStream, requestId: number) => {
    const audioTrack = mediaStream.getAudioTracks()[0];
    if (!audioTrack || typeof window === 'undefined') return;

    cleanupAudioPipeline();

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));

      const pipeline = createVoiceFilterPipeline(audioCtx, activeVoiceFilterRef.current);
      const processedDest = audioCtx.createMediaStreamDestination();
      const monitorGain = audioCtx.createGain();
      monitorGain.gain.value = isMonitoringVoiceRef.current ? 0.85 : 0;

      source.connect(pipeline.input);
      pipeline.output.connect(analyser);
      pipeline.output.connect(processedDest);
      pipeline.output.connect(monitorGain);
      monitorGain.connect(audioCtx.destination);

      audioContextRef.current = audioCtx;
      audioAnalyserRef.current = analyser;
      voicePipelineRef.current = pipeline;
      processedAudioDestRef.current = processedDest;
      monitorGainRef.current = monitorGain;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;
        if (audioAnalyserRef.current) {
          audioAnalyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setAudioMeterLevel(Math.min(100, Math.round((avg / 128) * 100)));
        }
        audioAnimFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (e) {
      console.warn('Audio processing/metering unavailable:', e);
    }
  }, [cleanupAudioPipeline]);

  const revokeRecordedUrl = useCallback(() => {
    if (recordedUrlRef.current && recordedUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(recordedUrlRef.current);
      } catch {}
    }
    recordedUrlRef.current = null;
  }, []);

  // Track unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cameraRequestIdRef.current += 1;
      stopMediaResources();
      revokeRecordedUrl();
    };
  }, [stopMediaResources, revokeRecordedUrl]);

  // Helper: request getUserMedia with watchdog timeout so stalled prompts never spin forever
  const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeoutMs = 12000): Promise<MediaStream> => {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const timeoutErr: any = new Error('Camera permission prompt timed out. Please allow camera access or use Device Camera.');
          timeoutErr.name = 'CameraTimeoutError';
          reject(timeoutErr);
        }
      }, timeoutMs);

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((s) => {
          if (settled) {
            // Timed out earlier; immediately release orphaned tracks
            s.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve(s);
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  // Start or restart camera stream
  const startCamera = useCallback(
    async (
      facing: 'user' | 'environment',
      withAudio: boolean = false,
      preferredDeviceId?: string,
      fromUserGesture: boolean = false
    ) => {
      const requestId = ++cameraRequestIdRef.current;
      setIsInitializing(true);
      setPermissionState('requesting');
      setCameraError(null);
      setCameraErrorTitle(null);
      setCameraSettingsGuidance(null);
      setCameraErrorKind(null);
      setMicDeniedWarning(false);
      setIsVideoReady(false);
      setShowStalledHelper(false);

      const hadActiveTracks = stopMediaResources();

      // Give mobile/desktop camera drivers a brief moment to release hardware after stopping tracks
      if (hadActiveTracks) {
        await new Promise((r) => setTimeout(r, 180));
        if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;
      }

      if (!envInfo.hasGetUserMedia || !envInfo.isSecureContext) {
        setIsInitializing(false);
        setPermissionState('unsupported_browser');
        setCameraErrorKind('unsupported');
        setCameraErrorTitle(!envInfo.isSecureContext ? 'HTTPS Required for Live Camera' : 'Unsupported Browser');
        const insecureHint = !envInfo.isSecureContext
          ? 'Live camera preview requires a secure HTTPS connection.'
          : 'Live browser camera preview is not supported in this browser.';
        setCameraError(`${insecureHint} Use "Open Device Camera (Native)" or choose an existing file below.`);
        return;
      }

      // Check Permissions-Policy / Feature-Policy (e.g. embedded iframe restrictions)
      let policyBlocked = false;
      try {
        const docAny = document as any;
        const policyAllowsCamera =
          docAny?.permissionsPolicy?.allowsFeature?.('camera') ??
          docAny?.featurePolicy?.allowsFeature?.('camera') ??
          true;
        if (policyAllowsCamera === false) {
          policyBlocked = true;
        }
      } catch {}

      if (policyBlocked) {
        const classified = classifyCameraError(null, {
          env: envInfo,
          browserPermState: 'denied',
          policyBlocked: true,
        });
        setIsInitializing(false);
        setPermissionState(classified.state);
        setCameraErrorKind('policy');
        setCameraErrorTitle(classified.title);
        setCameraError(classified.message);
        setCameraSettingsGuidance(classified.settingsGuidance || null);
        return;
      }

      // Query permission state without blocking explicit user-gesture retries.
      // Only skip auto-prompt on initial modal open if browser already reports 'denied'.
      const browserPermState = await queryBrowserPermission('camera');
      if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;

      if (!fromUserGesture && browserPermState === 'denied') {
        const classified = classifyCameraError(
          { name: 'NotAllowedError' },
          { env: envInfo, browserPermState: 'denied' }
        );
        setIsInitializing(false);
        setPermissionState(classified.state);
        setCameraErrorKind('permission');
        setCameraErrorTitle(classified.title);
        setCameraError(classified.message);
        setCameraSettingsGuidance(classified.settingsGuidance || null);
        return;
      }

      const baseVideoAttempts: MediaTrackConstraints[] = preferredDeviceId
        ? [
            { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
            { deviceId: { exact: preferredDeviceId } },
            { facingMode: { ideal: facing } },
          ]
        : [
            { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
            { facingMode: { ideal: facing } },
          ];

      const videoOnlyAttempts: MediaStreamConstraints[] = [
        ...baseVideoAttempts.map((v) => ({ video: v, audio: false })),
        { video: true, audio: false },
      ];

      const constraintAttempts: MediaStreamConstraints[] = withAudio
        ? [
            ...baseVideoAttempts.map((v) => ({ video: v, audio: true })),
            { video: true, audio: true },
            ...videoOnlyAttempts,
          ]
        : videoOnlyAttempts;

      const tryAcquireStream = async (): Promise<{ stream: MediaStream; audioDeniedFallback: boolean }> => {
        let lastError: any = null;
        let audioFailedEarlier = false;

        for (const constraints of constraintAttempts) {
          try {
            const acquired = await getUserMediaWithTimeout(constraints, 12000);
            return {
              stream: acquired,
              audioDeniedFallback: Boolean(withAudio && !constraints.audio && audioFailedEarlier),
            };
          } catch (err: any) {
            lastError = err;
            if (constraints.audio) {
              audioFailedEarlier = true;
            }
            const errName = err?.name;
            if (errName === 'CameraTimeoutError') {
              throw err;
            }
            const isPermissionDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
            if (isPermissionDenied && !constraints.audio) {
              throw err;
            }
          }
        }

        throw lastError || new Error('Unable to access camera device.');
      };

      try {
        let result: { stream: MediaStream; audioDeniedFallback: boolean };
        try {
          result = await tryAcquireStream();
        } catch (firstErr: any) {
          if (firstErr?.name === 'NotReadableError' || firstErr?.name === 'AbortError') {
            await new Promise((r) => setTimeout(r, 380));
            if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;
            result = await tryAcquireStream();
          } else {
            throw firstErr;
          }
        }

        const { stream: mediaStream, audioDeniedFallback } = result;

        if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        const primaryVideoTrack = mediaStream.getVideoTracks()[0];
        if (primaryVideoTrack) {
          activeDeviceIdRef.current = primaryVideoTrack.getSettings?.().deviceId || null;
        }

        const liveAudio = mediaStream.getAudioTracks().some((t) => t.readyState === 'live');
        setHasAudioTrack(liveAudio);

        try {
          if (navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            if (isMountedRef.current && requestId === cameraRequestIdRef.current) {
              setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
            }
          }
        } catch {}

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setPermissionState(audioDeniedFallback ? 'microphone_unavailable' : 'granted');
        attachStreamToVideoElement(videoPreviewRef.current, mediaStream);

        if (audioDeniedFallback) {
          setMicDeniedWarning(true);
          setFeedbackNotice(
            'Camera ready, but microphone permission was denied. Video will record without audio until microphone is allowed.'
          );
        } else {
          setMicDeniedWarning(false);
        }

        setupAudioPipeline(mediaStream, requestId);
      } catch (err: any) {
        if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;
        console.warn('Camera error:', err);
        const refreshedPermState = await queryBrowserPermission('camera');
        if (!isMountedRef.current || requestId !== cameraRequestIdRef.current) return;

        const classified = classifyCameraError(err, {
          env: envInfo,
          browserPermState: refreshedPermState,
        });

        setPermissionState(classified.state);
        setCameraErrorTitle(classified.title);
        setCameraError(classified.message);
        setCameraSettingsGuidance(classified.settingsGuidance || null);

        if (classified.state === 'denied' || classified.state === 'permanently_blocked') {
          setCameraErrorKind('permission');
        } else if (classified.state === 'camera_unavailable' || classified.state === 'init_failed') {
          setCameraErrorKind('hardware');
        } else {
          setCameraErrorKind('unsupported');
        }
      } finally {
        if (isMountedRef.current && requestId === cameraRequestIdRef.current) {
          setIsInitializing(false);
        }
      }
    },
    [stopMediaResources, attachStreamToVideoElement, setupAudioPipeline, envInfo]
  );

  // Attach microphone audio track to an existing live video stream without restarting camera hardware
  const attachAudioToExistingStream = useCallback(async () => {
    const existingStream = streamRef.current;
    if (!existingStream || existingStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const audioStream = await getUserMediaWithTimeout({ audio: true }, 8000);
      if (!isMountedRef.current || streamRef.current !== existingStream) {
        audioStream.getTracks().forEach((t) => t.stop());
        return;
      }
      audioStream.getAudioTracks().forEach((track) => {
        existingStream.addTrack(track);
      });
      setHasAudioTrack(true);
      setMicDeniedWarning(false);
      setupAudioPipeline(existingStream, cameraRequestIdRef.current);
    } catch {
      setHasAudioTrack(false);
      setMicDeniedWarning(true);
      setFeedbackNotice('Microphone denied — video will record without audio. Allow microphone in settings to record sound.');
    }
  }, [setupAudioPipeline]);

  const handleConfirmSafetyGate = () => {
    setHasAcknowledgedSafety(true);
    setShowSafetyGate(false);
    try {
      localStorage.setItem('joyearn_camera_safety_acknowledged', 'true');
    } catch {}
    startCamera(facingMode, mode === 'video');
  };

  const handleCancelSafetyGate = () => {
    setShowSafetyGate(false);
    onClose();
  };

  // Initialize camera when modal opens, clean up when closed.
  // Preserves confirmed photo/video if modal is closed and reopened until user retakes/discards.
  useEffect(() => {
    if (isOpen) {
      if (!capturedPhotoUrl && !recordedVideoUrl) {
        startCamera(facingMode, initialMode === 'video', undefined, false);
      }
      setIsRecording(false);
      setIsPaused(false);
      setPlaybackError(null);
      setFeedbackNotice(null);
    } else {
      cameraRequestIdRef.current += 1;
      setShowSafetyGate(false);
      isMonitoringVoiceRef.current = false;
      setIsMonitoringVoice(false);
      stopMediaResources();
      setIsRecording(false);
      setIsPaused(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle app backgrounding / foreground restoration & returning from Android Settings
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'hidden') {
        // Release camera tracks & finalize any active recording when backgrounded or interrupted by call
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
        stopMediaResources();
        return;
      }

      // Foregrounded: check if permission was just enabled in Android/browser settings
      if (!capturedPhotoUrl && !recordedVideoUrl && !isInitializing) {
        const perm = await queryBrowserPermission('camera');
        if (!isMountedRef.current) return;
        if (
          perm === 'granted' &&
          (!streamRef.current ||
            !streamRef.current.getVideoTracks().some((t) => t.readyState === 'live'))
        ) {
          startCamera(facingMode, mode === 'video', undefined, false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isOpen, capturedPhotoUrl, recordedVideoUrl, isInitializing, facingMode, mode, stopMediaResources, startCamera]);

  // Re-attach live stream to <video> whenever returning from photo/video review (Retake) or camera error recovery
  useEffect(() => {
    if (
      isOpen &&
      stream &&
      !capturedPhotoUrl &&
      !recordedVideoUrl &&
      !cameraError
    ) {
      const hasLiveVideo = stream.getVideoTracks().some((t) => t.readyState === 'live');
      if (!hasLiveVideo) {
        startCamera(facingMode, mode === 'video');
        return;
      }
      if (videoPreviewRef.current) {
        attachStreamToVideoElement(videoPreviewRef.current, stream);
      }
    }
  }, [isOpen, stream, capturedPhotoUrl, recordedVideoUrl, cameraError, attachStreamToVideoElement, startCamera, facingMode, mode]);

  // If live stream started but video frames don't appear within 3s, surface non-blocking helper
  useEffect(() => {
    if (!isOpen || !stream || isInitializing || isVideoReady || cameraError || capturedPhotoUrl || recordedVideoUrl) {
      setShowStalledHelper(false);
      return;
    }
    const timer = setTimeout(() => {
      const v = videoPreviewRef.current;
      if (!v || v.videoWidth === 0 || v.readyState < 2) {
        setShowStalledHelper(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, stream, isInitializing, isVideoReady, cameraError, capturedPhotoUrl, recordedVideoUrl]);

  // Flip camera between front/back or cycle multiple video inputs
  const handleToggleCamera = () => {
    soundService.playClick();
    selection();
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (videoDevices.length > 1) {
      const currentIdx = videoDevices.findIndex((d) => d.deviceId === activeDeviceIdRef.current);
      const nextDevice = videoDevices[(currentIdx + 1) % videoDevices.length];
      startCamera(nextFacing, mode === 'video', nextDevice?.deviceId);
      return;
    }

    if (videoDevices.length === 1 && streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live')) {
      setFeedbackNotice('Only 1 camera detected on this device (view mirrored toggled).');
      return;
    }

    startCamera(nextFacing, mode === 'video');
  };

  // Switch real-time Web Audio voice filter preset
  const handleSelectVoiceFilter = (filterId: VoiceFilterId) => {
    soundService.playClick();
    selection();
    setActiveVoiceFilter(filterId);
    activeVoiceFilterRef.current = filterId;
    if (voicePipelineRef.current) {
      voicePipelineRef.current.setFilter(filterId);
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  };

  // Toggle live headphone voice filter monitor (muted by default to avoid speaker feedback)
  const handleToggleVoiceMonitor = () => {
    soundService.playClick();
    light();
    const hasAudioTrack = (streamRef.current?.getAudioTracks().length ?? 0) > 0;
    if (!hasAudioTrack) {
      warning();
      setFeedbackNotice('Microphone access is required to preview voice filters.');
      return;
    }
    const next = !isMonitoringVoiceRef.current;
    isMonitoringVoiceRef.current = next;
    setIsMonitoringVoice(next);
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    if (monitorGainRef.current && audioContextRef.current) {
      monitorGainRef.current.gain.setTargetAtTime(
        next ? 0.85 : 0,
        audioContextRef.current.currentTime,
        0.02
      );
    }
  };

  // Capture Photo
  const handleCapturePhoto = () => {
    const video = videoPreviewRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      warning();
      setFeedbackNotice('Camera feed is still warming up. Please wait a moment and try again.');
      return;
    }

    soundService.playClick();
    heavy();

    // Trigger visual shutter flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 220);

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

        // Draw pill background (with roundRect fallback for older Android WebViews)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, badgeWidth, badgeHeight, 20);
        } else {
          ctx.rect(x, y, badgeWidth, badgeHeight);
        }
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
    ctx.fillText('📸 JoyEarn Studio', Math.max(20, canvas.width - 210), canvas.height - 30);

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

  // Stop Video Recording (uses MediaRecorder state directly to avoid stale closure issues)
  const handleStopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      soundService.playClick();
      try {
        recorder.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
  }, []);

  // Start Video Recording (strictly prevents duplicate recordings)
  const handleStartRecording = () => {
    if (isRecording || (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')) {
      return;
    }

    const activeStream = streamRef.current || stream;
    if (!activeStream || !activeStream.getVideoTracks().some((t) => t.readyState === 'live')) {
      warning();
      setFeedbackNotice('Camera stream is not ready yet.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      warning();
      setPermissionState('unsupported_browser');
      setCameraError('Video recording is not supported in this browser. Use "Open Device Camera (Native)" or choose an existing video below.');
      return;
    }

    soundService.playClick();
    heavy();

    recordedChunksRef.current = [];
    recordingSecondsRef.current = 0;
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
      try {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      } catch {}
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    const processedAudioTracks = processedAudioDestRef.current?.stream.getAudioTracks() || [];
    const hasLiveProcessedAudio = processedAudioTracks.some((track) => track.readyState === 'live');
    const recordingStream = hasLiveProcessedAudio
      ? new MediaStream([...activeStream.getVideoTracks(), ...processedAudioTracks])
      : activeStream;

    try {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(recordingStream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      } catch (primaryErr) {
        if (recordingStream !== activeStream) {
          recorder = new MediaRecorder(activeStream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
        } else {
          throw primaryErr;
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);

        if (!isMountedRef.current) return;

        const finalBlob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType || recorder.mimeType || 'video/webm',
        });

        if (finalBlob.size === 0) {
          warning();
          setFeedbackNotice('Recording was too short. Please hold Record for at least 1 second.');
          return;
        }

        revokeRecordedUrl();
        const videoUrl = URL.createObjectURL(finalBlob);
        recordedUrlRef.current = videoUrl;
        setRecordedBlob(finalBlob);
        setRecordedVideoUrl(videoUrl);
        setPlaybackError(null);
        setSelectedMediaMeta({
          name: getSafeMediaFilename('video', finalBlob.type),
          sizeBytes: finalBlob.size,
          sizeLabel: formatFileSize(finalBlob.size),
          mimeType: finalBlob.type || 'video/webm',
          kind: 'video',
        });

        // Award video creator points once
        if (!hasClaimedPoints) {
          setHasClaimedPoints(true);
          onEarnPoints(100, 'Recorded Learning Video Vlog 🎥');
          setFeedbackNotice(
            hasAudioTrack
              ? '+100 JoyPoints Earned! Video recorded with audio.'
              : '+100 JoyPoints Earned! Video recorded (video only — microphone was unavailable).'
          );
          soundService.playFanfare();
          success();
        }
      };

      recorder.start(250); // 250ms timeslices capture short clips reliably
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          if (next >= MAX_RECORDING_SECONDS) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      warning();
      setCameraError('Recording not supported on this browser profile. You can upload a pre-recorded video.');
    }
  };

  // Cancel active recording without keeping clip
  const handleCancelRecording = () => {
    soundService.playClick();
    warning();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);
    setFeedbackNotice('Recording canceled.');
  };

  // Pause / Resume Recording (guarded for browsers that do not support MediaRecorder.pause)
  const handleTogglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive' || !envInfo.supportsPauseResume) return;
    soundService.playClick();
    light();

    try {
      if (recorder.state === 'paused') {
        recorder.resume();
        setIsPaused(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => {
            const next = prev + 1;
            recordingSecondsRef.current = next;
            if (next >= MAX_RECORDING_SECONDS) {
              handleStopRecording();
              return MAX_RECORDING_SECONDS;
            }
            return next;
          });
        }, 1000);
      } else if (recorder.state === 'recording') {
        recorder.pause();
        setIsPaused(true);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
    } catch {
      setFeedbackNotice('Pause/Resume is not supported on this device browser.');
    }
  };

  // Download captured photo
  const handleDownloadPhoto = () => {
    if (!capturedPhotoUrl) return;
    soundService.playClick();
    success();
    const link = document.createElement('a');
    link.href = capturedPhotoUrl;
    link.download = getSafeMediaFilename('photo', 'image/jpeg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackNotice('Photo saved to your device storage!');
  };

  // Download recorded video (preserves correct .mp4 / .webm extension)
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    soundService.playClick();
    success();
    const link = document.createElement('a');
    link.href = recordedVideoUrl;
    link.download = getSafeMediaFilename('video', recordedBlob?.type);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackNotice('Video saved to your device storage!');
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

  // Publish video to Vlog Shorts / Community Feed (waits for real Cloud Storage + Firestore write)
  const handlePublishVideoToFeed = async () => {
    if (!recordedVideoUrl || isPublishing) return;
    setPublishError(null);
    setIsPublishing(true);
    setUploadProgress(2);

    const title = videoTitle.trim() || 'My JoyEarn Video';
    const secs = recordingSecondsRef.current || recordingSeconds;

    try {
      const result = await onPublishVlog?.(
        {
          title,
          category: videoCategory,
          videoUrl: recordedVideoUrl,
          duration: secs > 0 ? `${secs}s` : 'Recorded',
          videoBlob: recordedBlob || undefined,
        },
        (pct) => setUploadProgress(pct)
      );

      if (result && !result.success) {
        setPublishError(result.error || 'Could not publish video. Please check your connection and try again.');
        setIsPublishing(false);
        return;
      }

      soundService.playFanfare();
      success();
      setUploadProgress(100);
      setFeedbackNotice('Video uploaded and published to the community feed!');
      setTimeout(() => {
        setIsPublishing(false);
        revokeRecordedUrl();
        setRecordedVideoUrl(null);
        setRecordedBlob(null);
        setSelectedMediaMeta(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setPublishError(err?.message || 'Upload failed. Please try again.');
      setIsPublishing(false);
    }
  };

  // Validated device camera capture / existing media picker handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      // User canceled selection cleanly
      return;
    }

    const validation = validateSelectedMediaFile(file);
    if (!validation.valid || !validation.metadata) {
      warning();
      setFeedbackNotice(validation.error || 'Unsupported or corrupted file.');
      return;
    }

    soundService.playClick();
    light();
    setPlaybackError(null);
    setSelectedMediaMeta(validation.metadata);

    if (validation.metadata.kind === 'photo') {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhotoUrl(reader.result as string);
        if (!hasClaimedPoints) {
          setHasClaimedPoints(true);
          onEarnPoints(50, 'Imported Photo to JoyEarn Studio 📸');
          setFeedbackNotice('+50 JoyPoints Earned for Photo!');
        }
      };
      reader.onerror = () => {
        warning();
        setFeedbackNotice('Could not read the selected photo file. Please choose another image.');
      };
      reader.readAsDataURL(file);
    } else {
      revokeRecordedUrl();
      const url = URL.createObjectURL(file);
      recordedUrlRef.current = url;
      setRecordedVideoUrl(url);
      setRecordedBlob(file);
      if (!hasClaimedPoints) {
        setHasClaimedPoints(true);
        onEarnPoints(100, 'Imported Video to JoyEarn Studio 🎥');
        setFeedbackNotice(`Video ready (${validation.metadata.sizeLabel}) • +100 JoyPoints Earned!`);
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

        {/* Always-mounted native capture & file inputs so fallbacks work from any state */}
        <input
          type="file"
          ref={nativeCaptureInputRef}
          accept={mode === 'photo' ? 'image/*' : 'video/*'}
          capture={facingMode === 'user' ? 'user' : 'environment'}
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          type="file"
          ref={fileInputRef}
          accept={mode === 'photo' ? 'image/*' : 'video/*'}
          onChange={handleFileUpload}
          className="hidden"
        />

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
                  isMonitoringVoiceRef.current = false;
                  setIsMonitoringVoice(false);
                  if (monitorGainRef.current && audioContextRef.current) {
                    monitorGainRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.02);
                  }
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
                  const currentStream = streamRef.current;
                  const hasLiveVideo = Boolean(currentStream?.getVideoTracks().some((t) => t.readyState === 'live'));
                  if (!currentStream || !hasLiveVideo) {
                    startCamera(facingMode, true);
                  } else if (currentStream.getAudioTracks().length === 0) {
                    attachAudioToExistingStream();
                  }
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
                {cameraErrorKind === 'permission' || cameraErrorKind === 'policy' ? '🔒' : '📷'}
              </div>
              <div className="space-y-1.5">
                <h4 className="font-black text-sm text-white">
                  {cameraErrorTitle ||
                    (cameraErrorKind === 'permission'
                      ? 'Allow Camera Permission'
                      : cameraErrorKind === 'policy'
                      ? 'Use Device Camera'
                      : 'Camera Access Needed')}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cameraError}
                </p>
                {cameraSettingsGuidance && (
                  <p className="text-[11px] text-amber-300/95 bg-amber-950/50 border border-amber-500/30 rounded-xl p-2 leading-snug">
                    {cameraSettingsGuidance}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                {permissionState !== 'unsupported_browser' && (
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode, mode === 'video', undefined, true)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl tap-bounce shadow"
                  >
                    Allow &amp; Retry Camera Access
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    nativeCaptureInputRef.current?.click();
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl tap-bounce shadow flex items-center justify-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Open Device Camera (Native)</span>
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-black px-2 text-slate-500 font-bold">Or select from device</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    fileInputRef.current?.click();
                  }}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-30 space-y-3 p-6 text-center">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 block">Activating camera...</span>
                <span className="text-[11px] text-slate-400 block">Tap &ldquo;Allow&rdquo; if your browser asks for permission</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  cameraRequestIdRef.current += 1;
                  setIsInitializing(false);
                  setCameraErrorKind('permission');
                  setCameraError('Switched to your device camera. Tap Retry Camera Access anytime to use live preview.');
                  nativeCaptureInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tap-bounce shadow flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Use Device Camera Instead</span>
              </button>
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
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  v.muted = true;
                  v.defaultMuted = true;
                  v.play().catch(() => {});
                  if (v.videoWidth > 0) {
                    setIsVideoReady(true);
                    setShowStalledHelper(false);
                  }
                }}
                onPlaying={() => {
                  setIsVideoReady(true);
                  setShowStalledHelper(false);
                  setPermissionState((prev) => (prev === 'microphone_unavailable' ? prev : 'camera_ready'));
                }}
                style={{
                  filter: filterStyles[activeFilter],
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
                className="w-full h-full object-cover"
              />

              {/* Non-blocking stalled preview recovery pill */}
              {showStalledHelper && !isInitializing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-slate-700 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl backdrop-blur-md">
                  <span className="text-[11px] text-slate-300 font-semibold whitespace-nowrap">Preview blank?</span>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode, mode === 'video')}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black tap-bounce whitespace-nowrap"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => nativeCaptureInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black tap-bounce whitespace-nowrap"
                  >
                    Device Cam
                  </button>
                </div>
              )}

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

              {/* Active Voice Filter HUD Badge (Video Mode, pre-record or paused) */}
              {mode === 'video' && !isRecording && activeVoiceFilter !== 'normal' && (
                <div className="absolute top-4 left-4 z-30 bg-indigo-600/90 backdrop-blur-xs border border-indigo-400/50 text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Mic className="w-3 h-3" />
                  <span>
                    {VOICE_FILTER_PRESETS.find((v) => v.id === activeVoiceFilter)?.emoji}{' '}
                    {VOICE_FILTER_PRESETS.find((v) => v.id === activeVoiceFilter)?.label} Voice
                  </span>
                </div>
              )}

              {/* Live Video Recording Timer & Indicators */}
              {mode === 'video' && isRecording && (
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-30">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-red-600/90 text-white font-black text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-xs animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      <span>REC {formatTimer(recordingSeconds)} / 01:00</span>
                    </div>
                    {activeVoiceFilter !== 'normal' && (
                      <div className="bg-indigo-600/90 border border-indigo-400/50 text-white font-black text-[10px] px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-xs">
                        <span>{VOICE_FILTER_PRESETS.find((v) => v.id === activeVoiceFilter)?.emoji}</span>
                        <span className="hidden sm:inline">
                          {VOICE_FILTER_PRESETS.find((v) => v.id === activeVoiceFilter)?.label}
                        </span>
                      </div>
                    )}
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

          {/* RECORDED / SELECTED VIDEO REVIEW SCREEN */}
          {recordedVideoUrl && (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
              {playbackError ? (
                <div className="p-6 text-center space-y-3 max-w-xs">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-200 font-bold">{playbackError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black tap-bounce"
                  >
                    Choose Another Video
                  </button>
                </div>
              ) : (
                <video
                  key={recordedVideoUrl}
                  ref={playbackVideoRef}
                  src={recordedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  onError={() =>
                    setPlaybackError(
                      'This video format could not be played or the file may be corrupted. Please choose a standard MP4 or WebM video.'
                    )
                  }
                  className="w-full h-full object-contain"
                />
              )}
              <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                <div className="bg-slate-950/85 backdrop-blur-xs border border-emerald-500/40 text-emerald-400 text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{recordingSeconds > 0 ? `Video Recorded (${recordingSeconds}s)` : 'Video Ready'}</span>
                </div>
                {micDeniedWarning && recordingSeconds > 0 && (
                  <div className="bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    Video Only (Mic Denied)
                  </div>
                )}
              </div>
              {selectedMediaMeta && !playbackError && (
                <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-xs border border-slate-700/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10.5px] text-slate-300">
                  <span className="truncate font-semibold">{selectedMediaMeta.name}</span>
                  <span className="shrink-0 font-bold text-rose-300">{selectedMediaMeta.sizeLabel}</span>
                </div>
              )}
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

            {/* Voice Filter Presets (for Video Mode) */}
            {mode === 'video' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <span className="text-[10px] uppercase font-black text-slate-500 shrink-0 mr-0.5 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-indigo-400" />
                  <span>Voice:</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleVoiceMonitor}
                  className={`px-2 py-1 rounded-xl text-[10px] font-black shrink-0 flex items-center gap-1 transition-all tap-bounce border ${
                    isMonitoringVoice
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                  title={isMonitoringVoice ? 'Mute live headphone monitor' : 'Preview voice filter live (use headphones)'}
                >
                  <Headphones className="w-3 h-3" />
                  <span>{isMonitoringVoice ? 'Live' : 'Monitor'}</span>
                </button>
                {VOICE_FILTER_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectVoiceFilter(preset.id)}
                    title={preset.description}
                    className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold shrink-0 flex items-center gap-1 transition-all tap-bounce ${
                      activeVoiceFilter === preset.id
                        ? 'bg-indigo-600 text-white font-black shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.label}</span>
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-white tap-bounce text-[9px] font-bold"
                title="Select media from device"
              >
                <Upload className="w-4 h-4 mb-0.5 text-rose-400" />
                <span>Import</span>
              </button>

              {/* PHOTO MODE: COMPACT SHUTTER BUTTON */}
              {mode === 'photo' && (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="w-14 h-14 rounded-full bg-white p-1 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-4 border-rose-500"
                  title="Snap Photo"
                >
                  <div className="w-full h-full rounded-full bg-rose-600 flex items-center justify-center text-white">
                    <Camera className="w-5 h-5" />
                  </div>
                </button>
              )}

              {/* VIDEO MODE: COMPACT RECORD / STOP / PAUSE / CANCEL CONTROLS */}
              {mode === 'video' && (
                <div className="flex items-center gap-2.5">
                  {isRecording && (
                    <button
                      type="button"
                      onClick={handleCancelRecording}
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center justify-center tap-bounce"
                      title="Cancel Recording"
                      aria-label="Cancel Recording"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {isRecording && envInfo.supportsPauseResume && (
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center tap-bounce"
                      title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                      aria-label={isPaused ? 'Resume Recording' : 'Pause Recording'}
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`w-14 h-14 rounded-full p-1 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-4 ${
                      isRecording ? 'border-red-400 bg-white' : 'border-rose-500 bg-white'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    <div className={`w-full h-full transition-all flex items-center justify-center text-white ${
                      isRecording ? 'rounded-xl bg-red-600' : 'rounded-full bg-rose-600'
                    }`}>
                      {isRecording ? <Square className="w-5 h-5 fill-white" /> : <div className="w-4 h-4 rounded-full bg-white" />}
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
                  <option value="learning">Learning & Skills</option>
                  <option value="nature">Nature & Science</option>
                  <option value="cooking">Cooking & Recipes</option>
                  <option value="funny and wholesome">Arts & Wholesome</option>
                  <option value="home and family">Home & Family</option>
                  <option value="health">Health & Wellness</option>
                  <option value="gardening">Gardening & Plants</option>
                  <option value="travel">Travel & Outdoors</option>
                  <option value="other">General Education</option>
                </select>
              </div>

              {isPublishing && (
                <div className="space-y-1.5 bg-slate-900/90 border border-rose-500/40 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                    <span>Uploading video to cloud...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-200"
                      style={{ width: `${Math.max(4, uploadProgress)}%` }}
                    />
                  </div>
                </div>
              )}

              {publishError && (
                <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-2.5 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{publishError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => {
                    soundService.playClick();
                    revokeRecordedUrl();
                    setRecordedVideoUrl(null);
                    setRecordedBlob(null);
                    setPublishError(null);
                    recordingSecondsRef.current = 0;
                    setRecordingSeconds(0);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tap-bounce flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handleDownloadVideo}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs tap-bounce flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save</span>
                </button>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handlePublishVideoToFeed}
                  className="py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs tap-bounce shadow flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isPublishing ? `${uploadProgress}%` : 'Publish'}</span>
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
