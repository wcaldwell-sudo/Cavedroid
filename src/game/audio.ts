/**
 * Procedural Web Audio API sound synthesizer for CAVEDROID 3D.
 * Generates all sound effects and subterranean ambient drones in real-time.
 * Zero external audio file dependencies.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine hum state
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Ambient drone state
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio not supported
    }
  }

  public resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Laser firing sound
  public playLaser(type: 'primary' | 'scatter' | 'heavy' = 'primary') {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'primary') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'scatter') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.09);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      // Heavy plasma cannon
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  }

  // Enemy laser
  public playEnemyLaser() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Explosion sound using filtered noise burst + sine thump
  public playExplosion(intensity: 'small' | 'medium' | 'large' = 'medium') {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const duration = intensity === 'large' ? 0.6 : intensity === 'medium' ? 0.38 : 0.22;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(intensity === 'large' ? 450 : 700, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    const maxGain = intensity === 'large' ? 0.45 : intensity === 'medium' ? 0.28 : 0.15;
    gain.gain.setValueAtTime(maxGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + duration * 0.8);

    subGain.gain.setValueAtTime(maxGain * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  // Shield impact / hit flash sound
  public playShieldHit() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.setValueAtTime(150, now + 0.04);
    osc.frequency.setValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  // Crystal / energy pickup chime
  public playPickup(type: 'crystal' | 'powerup' | 'shield' = 'crystal') {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const baseFreq = type === 'shield' ? 523.25 : type === 'powerup' ? 659.25 : 783.99; // C5, E5, G5
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);
    });
  }

  // EMP Shockwave bomb
  public playEmpShockwave() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.55);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.55);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.62);
  }

  // Start continuous engine hum
  public startEngineHum() {
    if (this.engineOsc || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, now);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, now);

      this.engineGain.gain.setValueAtTime(0.08, now);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start(now);
    } catch {
      // Audio engine setup fallback
    }
  }

  // Modulate engine hum by speed and boost
  public updateEngineHum(speedRatio: number, isBoosting: boolean) {
    if (!this.engineOsc || !this.engineGain || !this.engineFilter || !this.ctx) return;
    if (this.isMuted) return;

    const targetFreq = 55 + speedRatio * 85 + (isBoosting ? 60 : 0);
    const targetCutoff = 200 + speedRatio * 350 + (isBoosting ? 250 : 0);
    const targetVolume = 0.06 + speedRatio * 0.08 + (isBoosting ? 0.08 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.08);
  }

  public stopEngineHum() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
      this.engineGain = null;
      this.engineFilter = null;
    }
  }

  // Start ambient cave drone
  public startAmbientDrone() {
    if (this.ambientOsc1 || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();

      this.ambientOsc1.type = 'sine';
      this.ambientOsc1.frequency.setValueAtTime(42, now); // Subterranean rumble

      this.ambientOsc2.type = 'triangle';
      this.ambientOsc2.frequency.setValueAtTime(43.5, now); // Binaural phasing beat

      this.ambientGain.gain.setValueAtTime(0.05, now);

      this.ambientOsc1.connect(this.ambientGain);
      this.ambientOsc2.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc1.start(now);
      this.ambientOsc2.start(now);
    } catch {}
  }

  public stopAmbientDrone() {
    if (this.ambientOsc1) {
      try {
        this.ambientOsc1.stop();
        this.ambientOsc1.disconnect();
      } catch {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try {
        this.ambientOsc2.stop();
        this.ambientOsc2.disconnect();
      } catch {}
      this.ambientOsc2 = null;
      this.ambientGain = null;
    }
  }

  public stopAll() {
    this.stopEngineHum();
    this.stopAmbientDrone();
  }
}

export const sound = new SoundSystem();
