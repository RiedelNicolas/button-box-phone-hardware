/**
 * Audio Engine for Teléfono Soundboard Blueprint
 * Provides realistic telephone sounds, DTMF tones, mechanical switch clicks,
 * and simulated MP3 soundboard audio clips using the Web Audio API.
 */

class SoundboardAudioEngine {
  constructor() {
    this.ctx = null;
    this.dialToneOsc1 = null;
    this.dialToneOsc2 = null;
    this.dialToneGain = null;
    this.isDialTonePlaying = false;
    this.volume = 0.7;
    this.customSounds = {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null
    };

    // DTMF Frequencies (Hz) for telephone keypad
    this.dtmfFreqs = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
    };
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.dialToneGain && this.isDialTonePlaying) {
      this.dialToneGain.gain.setTargetAtTime(this.volume * 0.15, this.ctx.currentTime, 0.05);
    }
  }

  // Mechanical switch sound when lifting handset (clack/spring)
  playHookLift() {
    this.init();
    const t = this.ctx.currentTime;
    
    // Low mechanical thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    
    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    // High metal snap
    const noise = this.createNoiseBuffer(0.04);
    const noiseNode = this.ctx.createBufferSource();
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    noiseNode.buffer = noise;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, t);
    noiseFilter.Q.setValueAtTime(3, t);

    noiseGain.gain.setValueAtTime(this.volume * 0.35, t + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseNode.start(t + 0.01);
  }

  // Mechanical sound when hanging up (heavy drop / contact disconnect)
  playHookDrop() {
    this.init();
    this.stopDialTone();

    const t = this.ctx.currentTime;
    // Heavy plastic latch impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);

    // Spring rattle noise
    const noise = this.createNoiseBuffer(0.06);
    const noiseNode = this.ctx.createBufferSource();
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    noiseNode.buffer = noise;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, t);
    noiseGain.gain.setValueAtTime(this.volume * 0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseNode.start(t);
  }

  // Button tactile click
  playButtonClick() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.03);

    gain.gain.setValueAtTime(this.volume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  // Continuous Dial Tone (350Hz + 440Hz standard)
  startDialTone() {
    this.init();
    if (this.isDialTonePlaying) return;

    const t = this.ctx.currentTime;
    this.dialToneGain = this.ctx.createGain();
    this.dialToneGain.gain.setValueAtTime(0, t);
    this.dialToneGain.gain.linearRampToValueAtTime(this.volume * 0.08, t + 0.1);

    this.dialToneOsc1 = this.ctx.createOscillator();
    this.dialToneOsc2 = this.ctx.createOscillator();

    this.dialToneOsc1.type = 'sine';
    this.dialToneOsc1.frequency.setValueAtTime(350, t);

    this.dialToneOsc2.type = 'sine';
    this.dialToneOsc2.frequency.setValueAtTime(440, t);

    this.dialToneOsc1.connect(this.dialToneGain);
    this.dialToneOsc2.connect(this.dialToneGain);
    this.dialToneGain.connect(this.ctx.destination);

    this.dialToneOsc1.start(t);
    this.dialToneOsc2.start(t);
    this.isDialTonePlaying = true;
  }

  stopDialTone() {
    if (!this.isDialTonePlaying || !this.dialToneGain) return;
    try {
      const t = this.ctx.currentTime;
      this.dialToneGain.gain.linearRampToValueAtTime(0, t + 0.04);
      setTimeout(() => {
        if (this.dialToneOsc1) {
          this.dialToneOsc1.stop();
          this.dialToneOsc1.disconnect();
          this.dialToneOsc1 = null;
        }
        if (this.dialToneOsc2) {
          this.dialToneOsc2.stop();
          this.dialToneOsc2.disconnect();
          this.dialToneOsc2 = null;
        }
        this.isDialTonePlaying = false;
      }, 50);
    } catch (e) {
      this.isDialTonePlaying = false;
    }
  }

  // Play standard DTMF touch tone
  playDTMF(key, duration = 0.18) {
    this.init();
    const freqs = this.dtmfFreqs[key];
    if (!freqs) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freqs[0], t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freqs[1], t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.2, t + 0.01);
    gain.gain.setValueAtTime(this.volume * 0.2, t + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
  }

  // Play simulated soundboard tracks (representing 00001.mp3 to 00005.mp3)
  playTrack(keyNumber, onEndedCallback) {
    this.init();
    this.stopDialTone(); // Button press interrupts dial tone, exactly like real phone
    this.playButtonClick();

    // If user loaded a custom audio file for this key
    if (this.customSounds[keyNumber]) {
      this.playCustomAudioBuffer(this.customSounds[keyNumber], onEndedCallback);
      return;
    }

    // Otherwise play rich synthetic soundboard clips
    switch (parseInt(keyNumber)) {
      case 1:
        // Track 1: Nostalgic 80s Phone Ring & Welcome Chime
        this.playSynthesizedTrack1(onEndedCallback);
        break;
      case 2:
        // Track 2: Retro Dial-Up Modem Handshake sequence
        this.playSynthesizedTrack2(onEndedCallback);
        break;
      case 3:
        // Track 3: Telecom Operator Error Announcement ("Número no corresponde")
        this.playSynthesizedTrack3(onEndedCallback);
        break;
      case 4:
        // Track 4: Funny Arcade Win / Boing sound effect
        this.playSynthesizedTrack4(onEndedCallback);
        break;
      case 5:
        // Track 5: Fast Sci-Fi Laser & Disco Fanfare
        this.playSynthesizedTrack5(onEndedCallback);
        break;
      default:
        // Other buttons play normal DTMF
        this.playDTMF(keyNumber.toString(), 0.22);
        if (onEndedCallback) setTimeout(onEndedCallback, 250);
        break;
    }
  }

  playSynthesizedTrack1(onEnded) {
    // Elegant synth chime sequence: C5 - E5 - G5 - C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const t0 = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const t = t0 + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
    if (onEnded) setTimeout(onEnded, 850);
  }

  playSynthesizedTrack2(onEnded) {
    // 56k Modem Dial-Up blast!
    const t0 = this.ctx.currentTime;
    const duration = 1.2;

    // Carrier whistle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1209, t0);
    osc.frequency.linearRampToValueAtTime(1633, t0 + 0.2);
    osc.frequency.setValueAtTime(2100, t0 + 0.3);

    gain.gain.setValueAtTime(this.volume * 0.18, t0);
    gain.gain.setValueAtTime(this.volume * 0.15, t0 + 0.3);
    gain.gain.linearRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);

    // Static hiss
    const noise = this.createNoiseBuffer(0.8);
    const noiseNode = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    noiseNode.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2500, t0 + 0.35);
    filter.Q.setValueAtTime(4, t0 + 0.35);

    noiseGain.gain.setValueAtTime(this.volume * 0.22, t0 + 0.35);
    noiseGain.gain.linearRampToValueAtTime(0.001, t0 + duration);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseNode.start(t0 + 0.35);
    noiseNode.stop(t0 + duration);

    if (onEnded) setTimeout(onEnded, 1300);
  }

  playSynthesizedTrack3(onEnded) {
    // Standard SIT (Special Information Tone) error tone: 914Hz, 1370Hz, 1776Hz
    const freqs = [914, 1370.8, 1776.7];
    const t0 = this.ctx.currentTime;
    freqs.forEach((f, idx) => {
      const t = t0 + idx * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, t + 0.01);
      gain.gain.setValueAtTime(this.volume * 0.25, t + 0.23);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
    if (onEnded) setTimeout(onEnded, 900);
  }

  playSynthesizedTrack4(onEnded) {
    // Funny Cartoon Boing sound
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t0);
    // Rapid pitch wobble
    for (let i = 0; i < 8; i++) {
      osc.frequency.linearRampToValueAtTime(440 + (i % 2 === 0 ? 120 : -80), t0 + i * 0.08);
    }
    osc.frequency.exponentialRampToValueAtTime(100, t0 + 0.7);

    gain.gain.setValueAtTime(this.volume * 0.35, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.72);

    if (onEnded) setTimeout(onEnded, 750);
  }

  playSynthesizedTrack5(onEnded) {
    // Retro Fanfare Victory Arpeggio
    const freqs = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
    const t0 = this.ctx.currentTime;
    freqs.forEach((f, idx) => {
      const t = t0 + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (idx === freqs.length - 1 ? 0.45 : 0.14));

      // Mild low-pass filter to soften the square wave
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
    if (onEnded) setTimeout(onEnded, 850);
  }

  loadCustomAudio(keyNumber, file) {
    return new Promise((resolve, reject) => {
      this.init();
      const reader = new FileReader();
      reader.onload = (e) => {
        this.ctx.decodeAudioData(e.target.result, (buffer) => {
          this.customSounds[keyNumber] = buffer;
          resolve(buffer);
        }, reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  playCustomAudioBuffer(buffer, onEnded) {
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = this.volume;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.onended = onEnded;
    src.start();
  }

  createNoiseBuffer(seconds) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export default SoundboardAudioEngine;
