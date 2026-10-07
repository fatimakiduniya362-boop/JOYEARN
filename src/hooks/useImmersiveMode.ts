import { useState, useEffect, useCallback } from 'react';

export function useImmersiveMode() {
  // Default to immersive mode (status bar & nav bar hidden for full immersion)
  const [isImmersive, setIsImmersive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('joyearn_immersive_mode');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // Ephemeral reveal state (Immersive Sticky behavior: shown temporarily on top swipe/tap)
  const [isTemporarilyRevealed, setIsTemporarilyRevealed] = useState(false);

  // Request native fullscreen if supported
  const requestNativeFullscreen = useCallback(() => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
        docEl.webkitRequestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen not permitted or user denied
    }
  }, []);

  const exitNativeFullscreen = useCallback(() => {
    try {
      const doc = document as any;
      if (doc.exitFullscreen && doc.fullscreenElement) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
        doc.webkitExitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  // Toggle Immersive Mode
  const toggleImmersive = (enable?: boolean) => {
    const next = enable !== undefined ? enable : !isImmersive;
    setIsImmersive(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_immersive_mode', String(next));
    }
    if (next) {
      requestNativeFullscreen();
    } else {
      exitNativeFullscreen();
    }
  };

  // Temporarily reveal status bar for 4 seconds then auto-hide (Sticky Immersive)
  const revealTemporarily = () => {
    setIsTemporarilyRevealed(true);
    setTimeout(() => {
      setIsTemporarilyRevealed(false);
    }, 4500);
  };

  // Re-apply immersive fullscreen when app resumes from background (visibilitychange & focus)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isImmersive) {
        requestNativeFullscreen();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Initial check
    if (isImmersive) {
      // Wait for first user interaction to trigger native fullscreen
      const onFirstTouch = () => {
        requestNativeFullscreen();
        window.removeEventListener('touchstart', onFirstTouch);
        window.removeEventListener('click', onFirstTouch);
      };
      window.addEventListener('touchstart', onFirstTouch, { once: true });
      window.addEventListener('click', onFirstTouch, { once: true });
    }

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isImmersive, requestNativeFullscreen]);

  return {
    isImmersive,
    isTemporarilyRevealed,
    shouldShowStatusBar: !isImmersive || isTemporarilyRevealed,
    toggleImmersive,
    revealTemporarily,
    requestNativeFullscreen
  };
}
