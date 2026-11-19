export type CameraPermissionState =
  | 'not_requested'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'permanently_blocked'
  | 'camera_unavailable'
  | 'microphone_unavailable'
  | 'unsupported_browser'
  | 'init_failed'
  | 'camera_ready';

export interface CameraEnvironmentInfo {
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  isEmbeddedIframe: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  supportedVideoMimeTypes: string[];
  preferredVideoMimeType: string;
  supportsPauseResume: boolean;
  hasNativeAndroidBridge: boolean;
}

export interface SelectedMediaMetadata {
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  mimeType: string;
  kind: 'photo' | 'video';
}

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  metadata?: SelectedMediaMetadata;
}

export const MAX_VIDEO_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_PHOTO_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

const CANDIDATE_VIDEO_MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
];

export function detectCameraEnvironment(): CameraEnvironmentInfo {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  const ua = hasNavigator ? navigator.userAgent || '' : '';

  let isEmbeddedIframe = false;
  if (hasWindow) {
    try {
      isEmbeddedIframe = window.self !== window.top;
    } catch {
      isEmbeddedIframe = true;
    }
  }

  const isSecureContext = hasWindow ? window.isSecureContext !== false : true;
  const hasGetUserMedia = Boolean(
    hasNavigator &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
  );
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  const supportedVideoMimeTypes: string[] = [];
  if (hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
    for (const mime of CANDIDATE_VIDEO_MIMES) {
      try {
        if (MediaRecorder.isTypeSupported(mime)) {
          supportedVideoMimeTypes.push(mime);
        }
      } catch {
        // ignore unsupported probe
      }
    }
  }

  const supportsPauseResume = Boolean(
    hasMediaRecorder &&
      typeof MediaRecorder.prototype?.pause === 'function' &&
      typeof MediaRecorder.prototype?.resume === 'function'
  );

  const hasNativeAndroidBridge = Boolean(
    hasWindow &&
      ((window as unknown as Record<string, unknown>).AndroidCameraBridge ||
        (window as unknown as Record<string, unknown>).JoyEarnNativeCamera)
  );

  return {
    isSecureContext,
    hasGetUserMedia,
    hasMediaRecorder,
    isEmbeddedIframe,
    isAndroid: /Android/i.test(ua),
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    supportedVideoMimeTypes,
    preferredVideoMimeType: supportedVideoMimeTypes[0] || '',
    supportsPauseResume,
    hasNativeAndroidBridge,
  };
}

export async function queryBrowserPermission(
  name: 'camera' | 'microphone'
): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return 'unknown';
  } catch {
    // Safari & some Android WebViews throw on permissions.query({ name: 'camera' })
    return 'unknown';
  }
}

export interface ClassifiedCameraError {
  state: CameraPermissionState;
  title: string;
  message: string;
  settingsGuidance?: string;
}

export function classifyCameraError(
  err: unknown,
  opts: {
    env: CameraEnvironmentInfo;
    browserPermState: 'granted' | 'denied' | 'prompt' | 'unknown';
    policyBlocked?: boolean;
  }
): ClassifiedCameraError {
  const errObj = err as { name?: string; message?: string } | null;
  const errName = errObj?.name || '';
  const errMsg = errObj?.message || '';

  if (opts.policyBlocked || errName === 'SecurityError') {
    return {
      state: 'permanently_blocked',
      title: opts.env.isEmbeddedIframe ? 'Preview Frame Blocks Camera' : 'Camera Policy Restricted',
      message: opts.env.isEmbeddedIframe
        ? 'This embedded preview frame restricts direct live camera access. Open JoyEarn in its full HTTPS browser tab or tap "Open Device Camera (Native)" below.'
        : 'Camera access is restricted by site security policy. Ensure JoyEarn is opened over HTTPS, or use "Open Device Camera (Native)" below.',
      settingsGuidance: opts.env.isAndroid
        ? 'Android: Open JoyEarn in Chrome (HTTPS), tap the lock icon -> Permissions -> Camera -> Allow.'
        : 'Open JoyEarn in a full HTTPS browser tab and allow Camera & Microphone.',
    };
  }

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    const isBlocked = opts.browserPermState === 'denied';
    if (isBlocked) {
      return {
        state: 'permanently_blocked',
        title: 'Camera Permission Blocked',
        message: opts.env.isEmbeddedIframe
          ? 'Camera permission is blocked in this browser or preview frame. Allow Camera in browser site settings (or open JoyEarn in a full browser tab), then tap Retry — or use Open Device Camera (Native) below.'
          : 'Camera permission is currently blocked in browser or Android settings. Enable Camera access and tap "Allow & Retry Camera Access".',
        settingsGuidance: opts.env.isAndroid
          ? 'Android Settings -> Apps -> Chrome / JoyEarn -> Permissions -> Camera & Microphone -> Allow, then return here and tap Retry.'
          : 'Click the lock/site-settings icon in the address bar -> Camera -> Allow, then tap Retry.',
      };
    }
    return {
      state: 'denied',
      title: 'Allow Camera Permission',
      message:
        'Camera permission was dismissed or denied. Tap "Allow & Retry Camera Access" and choose Allow when prompted — or use Open Device Camera (Native) below.',
      settingsGuidance: opts.env.isAndroid
        ? 'If no prompt appears, open Android Settings -> Apps -> Chrome / JoyEarn -> Permissions -> Camera -> Allow.'
        : undefined,
    };
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return {
      state: 'camera_unavailable',
      title: 'Camera Unavailable',
      message:
        'No camera hardware was detected by the browser. You can open your device camera or choose an existing video/photo file below.',
    };
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return {
      state: 'init_failed',
      title: 'Camera Busy in Another App',
      message:
        'Another app or browser tab is currently using the camera. Close other camera apps and tap Retry — or use Open Device Camera (Native) below.',
    };
  }

  if (errName === 'CameraTimeoutError') {
    return {
      state: 'init_failed',
      title: 'Camera Did Not Respond',
      message:
        'The camera permission prompt or hardware timed out. Tap "Allow & Retry Camera Access" and select Allow, or use Open Device Camera (Native).',
    };
  }

  return {
    state: 'init_failed',
    title: 'Camera Initialization Failed',
    message:
      errMsg ||
      'Unable to start live camera preview on this device. Use "Open Device Camera (Native)" or choose an existing file below.',
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getSafeMediaFilename(kind: 'photo' | 'video', mimeType?: string): string {
  const ts = Date.now();
  if (kind === 'photo') {
    const ext = mimeType?.includes('png') ? 'png' : 'jpg';
    return `joyearn_photo_${ts}.${ext}`;
  }
  const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
  return `joyearn_video_${ts}.${ext}`;
}

export function validateSelectedMediaFile(
  file: File | null | undefined,
  expectedKind?: 'photo' | 'video'
): MediaValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file appears to be empty or corrupted (0 bytes).' };
  }

  const lowerName = (file.name || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  const isImage =
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(lowerName);
  const isVideo =
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|3gp|mkv|ogg)$/i.test(lowerName);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Unsupported file format. Please choose a valid photo (JPG/PNG) or video (MP4/WebM/MOV).',
    };
  }

  const detectedKind: 'photo' | 'video' = isVideo ? 'video' : 'photo';

  if (expectedKind && detectedKind !== expectedKind) {
    return {
      valid: false,
      error:
        expectedKind === 'video'
          ? 'Please select a video file (MP4, WebM, or MOV).'
          : 'Please select an image file (JPG, PNG, or WebP).',
    };
  }

  if (detectedKind === 'video' && file.size > MAX_VIDEO_FILE_BYTES) {
    return {
      valid: false,
      error: `Video file is too large (${formatFileSize(file.size)}). Maximum allowed size is 100 MB.`,
    };
  }

  if (detectedKind === 'photo' && file.size > MAX_PHOTO_FILE_BYTES) {
    return {
      valid: false,
      error: `Photo file is too large (${formatFileSize(file.size)}). Maximum allowed size is 20 MB.`,
    };
  }

  // Optional playback support check in browser environments
  if (detectedKind === 'video' && mime && typeof document !== 'undefined') {
    try {
      const probe = document.createElement('video');
      if (typeof probe.canPlayType === 'function') {
        const support = probe.canPlayType(mime);
        if (support === '' && !mime.includes('mp4') && !mime.includes('webm') && !mime.includes('quicktime')) {
          return {
            valid: false,
            error: `This browser cannot play "${mime}" videos. Please select an MP4 or WebM video.`,
          };
        }
      }
    } catch {
      // ignore probe failure
    }
  }

  return {
    valid: true,
    metadata: {
      name: file.name || getSafeMediaFilename(detectedKind, mime),
      sizeBytes: file.size,
      sizeLabel: formatFileSize(file.size),
      mimeType: mime || (detectedKind === 'video' ? 'video/mp4' : 'image/jpeg'),
      kind: detectedKind,
    },
  };
}
