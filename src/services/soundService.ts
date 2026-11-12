/**
 * JoyEarn Audio & Sound Effects Engine
 * 100% Client-Side Web Audio API Synthesis
 * - Zero external MP3/audio files to avoid copyright issues, network lag, and bundle bloat
 * - Consistent 44.1kHz sample rate across all devices (phone speaker, headphones, Bluetooth)
 * - Exponential decay curves to eliminate clipping, crackling, and distortion
 * - Built-in volume attenuation, mute persistence, and responsive haptic vibration
 */

import { hapticService } from './haptics';

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false; // Sounds ON by default
  private volume: number = 0.85; // Clear default volume
  private isUnlocked: boolean = false;
  private muteListeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('joyearn_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      } else {
        this.isMuted = false; // Explicitly ensure sound is ON by default
      }
      const savedVol = localStorage.getItem('joyearn_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
      this.setupFirstTapUnlock();
    }
  }

  private setupFirstTapUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    window.addEventListener('touchstart', unlock, { passive: true, capture: true });
    window.addEventListener('click', unlock, { passive: true, capture: true });
    window.addEventListener('keydown', unlock, { passive: true, capture: true });
  }

  public unlockAudio() {
    this.isUnlocked = true;
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    // Prime Audio hardware with 1-sample silent buffer for iOS Safari
    if (this.ctx) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
      } catch {}
    }
    // Resume SpeechSynthesis on first tap
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_sound_muted', String(muted));
      if (muted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    this.muteListeners.forEach((listener) => {
      try {
        listener(muted);
      } catch {}
    });
  }

  public subscribeMute(listener: (muted: boolean) => void): () => void {
    this.muteListeners.add(listener);
    return () => {
      this.muteListeners.delete(listener);
    };
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_sound_volume', String(clamped));
    }
  }

  /**
   * Cheerful acoustic pentatonic chime for letters, numbers, and phonics taps.
   * Guarantees audible feedback even on devices without speech synthesis or TTS offline.
   */
  public playLetterChime(identifier: string = 'A') {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.unlockAudio();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const code = identifier.toUpperCase().charCodeAt(0) || 65;
      const pentatonic = [
        261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
        523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
        1046.50                                  // C6
      ];
      const baseFreq = pentatonic[code % pentatonic.length];

      // Primary tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);

      const peak1 = 0.12 * this.volume;
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(peak1, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Warm octave/fifth harmonic for rich marimba/xylophone timbre
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

      const peak2 = 0.05 * this.volume;
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(peak2, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.22);

      this.triggerHaptic(25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Speaks phonics/word/letter text aloud using browser speech synthesis,
   * preceded by an immediate chime tone so feedback is immediate and loud.
   */
  public speakPhonics(text: string, lang: string = 'en-US') {
    if (this.isMuted || this.volume <= 0) return;

    // 1. Play immediate musical tone for the letter
    this.playLetterChime(text.charAt(0) || 'A');

    // 2. Speak via window.speechSynthesis
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      this.unlockAudio();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.88; // gentle, clear phonics speed
      utterance.pitch = 1.05; // warm, encouraging tone
      utterance.volume = Math.max(0.2, Math.min(1.0, this.volume));

      // Prevent Android Chromium garbage collection bug from terminating speech prematurely
      (window as any)._activeUtterance = utterance;
      utterance.onend = () => {
        (window as any)._activeUtterance = null;
      };
      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance notice:', e);
        (window as any)._activeUtterance = null;
      };

      // Match voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice = voices.find(
          (v) => (v.lang.startsWith(lang.slice(0, 2)) || v.lang.includes('en')) && !v.name.includes('Bad')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech synthesis speak error:', e);
        }
      }, 35);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  /**
   * Subtle clean UI tap sound (80ms sine burst)
   */
  public playClick() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

      const peakGain = 0.08 * this.volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Cheerful coin pickup / point award sound (dual harmonic chime)
   */
  public playCoin() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Note 1 (B5 ~ 987Hz) then Note 2 (E6 ~ 1318Hz)
      const freqs = [987.77, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + idx * 0.08;
        const duration = 0.18;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const peakGain = 0.12 * this.volume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
      this.triggerHaptic(50);
    } catch {
      // Ignore
    }
  }

  /**
   * Victory / Level up / Achievement fanfare (4-note harmonic chord)
   */
  public playStreakChime() {
    this.playFanfare();
  }

  /**
   * Cheerful success chime (e.g., adding to playlist, successful action)
   */
  public playSuccess() {
    this.playCoin();
  }

  /**
   * Cheerful ascending 2-tone chime for correct quiz answers
   */
  public playCorrect() {
    this.playSuccess();
  }

  /**
   * Low gentle double buzzer for incorrect answers
   */
  public playWrong() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.08 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  /**
   * Unique, playful sound effect that plays exclusively when the user reaches exactly 5/5 activities.
   * Completely distinguishable from standard 2-tone coin sounds (playCoin):
   * Features a bouncy cartoon-like spring glissando + bright marimba arpeggio + triumphant victory harmonic swell.
   */
  public playDailyGoalCheer() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Playful "boing-hop" bouncy spring slide (G4 -> C5 -> E5 with rapid playful pitch scoops)
      const springBounces = [
        { startFreq: 392.00, endFreq: 523.25, time: 0.00, dur: 0.12 }, // G4 -> C5
        { startFreq: 440.00, endFreq: 659.25, time: 0.10, dur: 0.14 }, // A4 -> E5
        { startFreq: 523.25, endFreq: 783.99, time: 0.22, dur: 0.16 }, // C5 -> G5
        { startFreq: 659.25, endFreq: 1046.50, time: 0.36, dur: 0.22 }, // E5 -> C6
      ];

      springBounces.forEach((s) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + s.time;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(s.startFreq, t);
        // Playful spring curve: quick dip then rapid leap
        osc.frequency.exponentialRampToValueAtTime(s.startFreq * 0.92, t + 0.02);
        osc.frequency.exponentialRampToValueAtTime(s.endFreq, t + s.dur);

        const peak = 0.14 * this.volume;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(peak, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + s.dur);
      });

      // 2. Playful shimmering marimba arpeggio (G5, B5, D6, G6, C7)
      const sparkleNotes = [783.99, 987.77, 1174.66, 1567.98, 2093.00];
      sparkleNotes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + 0.45 + idx * 0.06;
        const dur = idx === sparkleNotes.length - 1 ? 0.55 : 0.22;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const peak = (idx === sparkleNotes.length - 1 ? 0.16 : 0.09) * this.volume;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(peak, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + dur);
      });

      // 3. Warm celebratory victory chord base (C4 + E4 + G4 + C5) at crescendo
      const baseChord = [261.63, 329.63, 392.00, 523.25];
      baseChord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + 0.45;
        const dur = 0.65;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.06 * this.volume, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + dur);
      });

      // Playful bouncy celebratory haptic pattern (distinctive rhythm)
      this.triggerHaptic([40, 30, 40, 30, 80, 50, 180]);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Fiery celebration sound effect for the Streak Flame animation
   * Evoking blazing fire whoosh and ascending victory harmonics
   */
  public playStreakFlame() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Warm blazing white/pink noise whoosh filter
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(400, now);
      bandpass.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      bandpass.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08 * this.volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Ascending blazing melodic chords (C5, G5, C6)
      const fireNotes = [523.25, 783.99, 1046.50];
      fireNotes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + 0.05 + idx * 0.08;
        const duration = 0.4;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.95, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.08);

        const peakGain = 0.1 * this.volume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });

      this.triggerHaptic([80, 40, 100, 40, 150]);
    } catch {
      // Audio fallback
    }
  }

  public playFanfare() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + idx * 0.11;
        const duration = idx === notes.length - 1 ? 0.45 : 0.22;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const peakGain = (idx === notes.length - 1 ? 0.16 : 0.11) * this.volume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
      this.triggerHaptic([60, 40, 80, 40, 140]);
    } catch {
      // Ignore
    }
  }

  /**
   * Chest opening mystery chime
   */
  public playChestOpen() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chords = [392.0, 523.25, 659.25, 783.99];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
      this.triggerHaptic([80, 50, 80]);
    } catch {
      // Ignore
    }
  }

  /**
   * Realistic tactile dice rolling sound effect (rapid tumbling rattle)
   */
  public playDiceRoll() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // 5 rapid tumbling clicks with varying frequencies
      const clicks = [0.0, 0.05, 0.1, 0.16, 0.22, 0.28];
      clicks.forEach((timeOffset, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + timeOffset;
        const freq = 350 + (i % 3) * 120 + Math.random() * 80;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(160, startTime + 0.035);

        const peak = (0.09 + (i === clicks.length - 1 ? 0.04 : 0)) * this.volume;
        gain.gain.setValueAtTime(peak, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.045);
      });
      this.triggerHaptic([30, 25, 45]);
    } catch {}
  }

  /**
   * Crisp token hop / move tick sound on Ludo board
   */
  public playPieceMove() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

      gain.gain.setValueAtTime(0.1 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
      this.triggerHaptic(25);
    } catch {}
  }

  /**
   * Exciting capture sound when opponent's token is eliminated
   */
  public playCapture() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Punchy impact followed by descending glissando
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

      gain.gain.setValueAtTime(0.14 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
      this.triggerHaptic([60, 40, 90]);
    } catch {}
  }

  /**
   * Clean haptic vibration for Android devices using Navigator Vibration API
   */
  public triggerHaptic(pattern: number | number[] = 40) {
    hapticService.vibrate(pattern);
  }
}

export const soundService = new SoundService();
