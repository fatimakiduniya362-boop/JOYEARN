import { useCallback } from 'react';
import { hapticService, HapticType } from '../services/haptics';

/**
 * useHaptics hook for triggering tactile feedback on user actions
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticType = 'light') => {
    return hapticService.trigger(type);
  }, []);

  const light = useCallback(() => {
    return hapticService.light();
  }, []);

  const medium = useCallback(() => {
    return hapticService.medium();
  }, []);

  const heavy = useCallback(() => {
    return hapticService.heavy();
  }, []);

  const success = useCallback(() => {
    return hapticService.success();
  }, []);

  const warning = useCallback(() => {
    return hapticService.warning();
  }, []);

  const selection = useCallback(() => {
    return hapticService.selection();
  }, []);

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    selection,
    isSupported: hapticService.isSupported(),
  };
}
