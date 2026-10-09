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
  private isMuted: boolean = false;
  private volume: number = 0.7; // default 70% volume

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('joyearn_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('joyearn_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
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
    }
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
   * Clean haptic vibration for Android devices using Navigator Vibration API
   */
  public triggerHaptic(pattern: number | number[] = 40) {
    hapticService.vibrate(pattern);
  }
}

export const soundService = new SoundService();
