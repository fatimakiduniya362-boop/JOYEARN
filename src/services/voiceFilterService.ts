// ============================================================================
// 🎙️ JOYEARN REAL-TIME WEB AUDIO VOICE FILTER ENGINE
// Zero-dependency DSP pipeline for Video Recorder & Voice Previews
// ============================================================================

export type VoiceFilterId =
  | 'normal'
  | 'studio'
  | 'deep'
  | 'bright'
  | 'robot'
  | 'megaphone'
  | 'echo'
  | 'alien';

export interface VoiceFilterPreset {
  id: VoiceFilterId;
  label: string;
  emoji: string;
  description: string;
}

export const VOICE_FILTER_PRESETS: VoiceFilterPreset[] = [
  { id: 'normal', label: 'Normal', emoji: '🎙️', description: 'Natural microphone voice' },
  { id: 'studio', label: 'Studio', emoji: '🎧', description: 'Warm broadcast clarity' },
  { id: 'deep', label: 'Deep', emoji: '🦁', description: 'Rich bass & deep tone' },
  { id: 'bright', label: 'Helium', emoji: '🎈', description: 'Bright playful high tone' },
  { id: 'robot', label: 'Robot', emoji: '🤖', description: 'Metallic sci-fi vocoder' },
  { id: 'megaphone', label: 'Radio', emoji: '📢', description: 'Crisp megaphone broadcast' },
  { id: 'echo', label: 'Echo', emoji: '🏛️', description: 'Spacious hall reverb' },
  { id: 'alien', label: 'Alien', emoji: '👽', description: 'Cosmic space wobble' },
];

function createSoftClipCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, drive);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export interface VoiceFilterPipeline {
  input: AudioNode;
  output: GainNode;
  setFilter: (filterId: VoiceFilterId) => void;
  dispose: () => void;
}

/**
 * Builds a dynamic, leak-free Web Audio DSP pipeline supporting live preset switching
 * without interrupting an active MediaStreamAudioDestinationNode recording stream.
 */
export function createVoiceFilterPipeline(
  audioCtx: AudioContext,
  initialFilter: VoiceFilterId = 'normal'
): VoiceFilterPipeline {
  const input = audioCtx.createGain();
  input.gain.value = 1.0;

  const output = audioCtx.createGain();
  output.gain.value = 1.0;

  let activeNodes: AudioNode[] = [];
  let activeOscillators: OscillatorNode[] = [];

  const cleanupChain = () => {
    try {
      input.disconnect();
    } catch {}

    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    activeOscillators = [];

    activeNodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {}
    });
    activeNodes = [];
  };

  const setFilter = (filterId: VoiceFilterId) => {
    cleanupChain();

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.15;
    activeNodes.push(compressor);

    if (filterId === 'normal') {
      input.connect(output);
      return;
    }

    if (filterId === 'studio') {
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 85;

      const warmth = audioCtx.createBiquadFilter();
      warmth.type = 'lowshelf';
      warmth.frequency.value = 220;
      warmth.gain.value = 4;

      const presence = audioCtx.createBiquadFilter();
      presence.type = 'highshelf';
      presence.frequency.value = 3200;
      presence.gain.value = 5;

      const makeUpGain = audioCtx.createGain();
      makeUpGain.gain.value = 1.2;

      input.connect(highpass);
      highpass.connect(warmth);
      warmth.connect(presence);
      presence.connect(compressor);
      compressor.connect(makeUpGain);
      makeUpGain.connect(output);

      activeNodes.push(highpass, warmth, presence, makeUpGain);
      return;
    }

    if (filterId === 'deep') {
      const lowBoost = audioCtx.createBiquadFilter();
      lowBoost.type = 'lowshelf';
      lowBoost.frequency.value = 180;
      lowBoost.gain.value = 13;

      const chestPeak = audioCtx.createBiquadFilter();
      chestPeak.type = 'peaking';
      chestPeak.frequency.value = 320;
      chestPeak.Q.value = 1.2;
      chestPeak.gain.value = 6;

      const highCut = audioCtx.createBiquadFilter();
      highCut.type = 'lowpass';
      highCut.frequency.value = 1900;

      const saturator = audioCtx.createWaveShaper();
      saturator.curve = createSoftClipCurve(8);
      saturator.oversample = '2x';

      const level = audioCtx.createGain();
      level.gain.value = 1.15;

      input.connect(lowBoost);
      lowBoost.connect(chestPeak);
      chestPeak.connect(highCut);
      highCut.connect(saturator);
      saturator.connect(compressor);
      compressor.connect(level);
      level.connect(output);

      activeNodes.push(lowBoost, chestPeak, highCut, saturator, level);
      return;
    }

    if (filterId === 'bright') {
      // Bright playful cartoon tone via steep low-cut + formant resonant boost + subtle fast shimmer
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 480;

      const formant = audioCtx.createBiquadFilter();
      formant.type = 'peaking';
      formant.frequency.value = 2100;
      formant.Q.value = 2.4;
      formant.gain.value = 11;

      const air = audioCtx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = 3800;
      air.gain.value = 8;

      const delay = audioCtx.createDelay(0.1);
      delay.delayTime.value = 0.015;

      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 9;
      const lfoDepth = audioCtx.createGain();
      lfoDepth.gain.value = 0.003;
      lfo.connect(lfoDepth);
      lfoDepth.connect(delay.delayTime);
      lfo.start();

      const level = audioCtx.createGain();
      level.gain.value = 1.35;

      input.connect(highpass);
      highpass.connect(formant);
      formant.connect(air);
      air.connect(delay);
      delay.connect(compressor);
      air.connect(compressor);
      compressor.connect(level);
      level.connect(output);

      activeOscillators.push(lfo);
      activeNodes.push(highpass, formant, air, delay, lfoDepth, level);
      return;
    }

    if (filterId === 'robot') {
      // Ring modulation + metallic resonant bandpass + feedback comb delay
      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 1.6;

      const carrier = audioCtx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.value = 52;

      const carrierDepth = audioCtx.createGain();
      carrierDepth.gain.value = 0.45;

      const ringGain = audioCtx.createGain();
      ringGain.gain.value = 0.7;

      const combDelay = audioCtx.createDelay(0.1);
      combDelay.delayTime.value = 0.012;
      const combFeedback = audioCtx.createGain();
      combFeedback.gain.value = 0.45;

      const shaper = audioCtx.createWaveShaper();
      shaper.curve = createSoftClipCurve(16);

      const level = audioCtx.createGain();
      level.gain.value = 1.1;

      carrier.connect(carrierDepth);
      carrierDepth.connect(ringGain.gain);
      carrier.start();

      input.connect(bandpass);
      bandpass.connect(ringGain);
      ringGain.connect(combDelay);
      combDelay.connect(combFeedback);
      combFeedback.connect(combDelay);

      ringGain.connect(shaper);
      combDelay.connect(shaper);
      shaper.connect(compressor);
      compressor.connect(level);
      level.connect(output);

      activeOscillators.push(carrier);
      activeNodes.push(bandpass, carrierDepth, ringGain, combDelay, combFeedback, shaper, level);
      return;
    }

    if (filterId === 'megaphone') {
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 580;

      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2600;

      const midPeak = audioCtx.createBiquadFilter();
      midPeak.type = 'peaking';
      midPeak.frequency.value = 1400;
      midPeak.Q.value = 2.0;
      midPeak.gain.value = 8;

      const drive = audioCtx.createWaveShaper();
      drive.curve = createSoftClipCurve(24);
      drive.oversample = '2x';

      const level = audioCtx.createGain();
      level.gain.value = 0.9;

      input.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(midPeak);
      midPeak.connect(drive);
      drive.connect(compressor);
      compressor.connect(level);
      level.connect(output);

      activeNodes.push(highpass, lowpass, midPeak, drive, level);
      return;
    }

    if (filterId === 'echo') {
      const dryGain = audioCtx.createGain();
      dryGain.gain.value = 0.9;

      const delay1 = audioCtx.createDelay(1.0);
      delay1.delayTime.value = 0.19;
      const delay2 = audioCtx.createDelay(1.0);
      delay2.delayTime.value = 0.34;

      const damp = audioCtx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;

      const fbGain = audioCtx.createGain();
      fbGain.gain.value = 0.42;

      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.6;

      input.connect(dryGain);
      dryGain.connect(compressor);

      input.connect(delay1);
      delay1.connect(damp);
      damp.connect(delay2);
      delay2.connect(fbGain);
      fbGain.connect(delay1);

      delay1.connect(wetGain);
      delay2.connect(wetGain);
      wetGain.connect(compressor);
      compressor.connect(output);

      activeNodes.push(dryGain, delay1, delay2, damp, fbGain, wetGain);
      return;
    }

    if (filterId === 'alien') {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 950;
      filter.Q.value = 2.2;

      const sweepLfo = audioCtx.createOscillator();
      sweepLfo.type = 'sine';
      sweepLfo.frequency.value = 4.2;
      const sweepGain = audioCtx.createGain();
      sweepGain.gain.value = 480;
      sweepLfo.connect(sweepGain);
      sweepGain.connect(filter.frequency);
      sweepLfo.start();

      const modOsc = audioCtx.createOscillator();
      modOsc.type = 'triangle';
      modOsc.frequency.value = 28;
      const modGain = audioCtx.createGain();
      modGain.gain.value = 0.38;
      const ampMod = audioCtx.createGain();
      ampMod.gain.value = 0.78;
      modOsc.connect(modGain);
      modGain.connect(ampMod.gain);
      modOsc.start();

      const delay = audioCtx.createDelay(0.5);
      delay.delayTime.value = 0.085;
      const fb = audioCtx.createGain();
      fb.gain.value = 0.35;

      const level = audioCtx.createGain();
      level.gain.value = 1.25;

      input.connect(filter);
      filter.connect(ampMod);
      ampMod.connect(delay);
      delay.connect(fb);
      fb.connect(delay);

      ampMod.connect(compressor);
      delay.connect(compressor);
      compressor.connect(level);
      level.connect(output);

      activeOscillators.push(sweepLfo, modOsc);
      activeNodes.push(filter, sweepGain, modGain, ampMod, delay, fb, level);
      return;
    }

    input.connect(output);
  };

  setFilter(initialFilter);

  return {
    input,
    output,
    setFilter,
    dispose: () => {
      cleanupChain();
      try {
        output.disconnect();
      } catch {}
    },
  };
}
