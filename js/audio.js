import { KEY_BY_CHAR } from './hardware.js';

/**
 * Audio engine for the blueprint demo (Web Audio API).
 * Each of the 10 trigger keys plays one generic synthesized tone (the same frequencies as the
 * firmware placeholder WAV files). A clip can be replaced by a local audio file for testing.
 */

const TONE_SECONDS = 0.45;

class SoundboardAudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.customSounds = {};   // key char -> AudioBuffer
    this.current = null;      // { nodes: [...], timer } of the clip playing now
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
  }

  // True while a clip is playing
  isPlaying() {
    return this.current !== null;
  }

  // Stops the clip that is playing, if any
  stop() {
    if (!this.current) return;
    clearTimeout(this.current.timer);
    this.current.nodes.forEach(n => {
      try { n.stop(); } catch (e) { /* already stopped */ }
    });
    const cb = this.current.onEnded;
    this.current = null;
    if (cb) cb();
  }

  // Plays the clip of a trigger key ('1'..'9', '0'). The caller decides whether a press starts
  // or stops playback (see app.js); this only starts a clip, stopping any leftover one first.
  playKey(keyChar, onEnded) {
    this.init();
    this.stop();

    if (this.customSounds[keyChar]) {
      this.playCustomAudioBuffer(this.customSounds[keyChar], onEnded);
      return;
    }

    const info = KEY_BY_CHAR[keyChar];
    if (!info) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(info.freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.01);
    gain.gain.setValueAtTime(this.volume * 0.35, t + TONE_SECONDS - 0.08);
    gain.gain.linearRampToValueAtTime(0, t + TONE_SECONDS);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + TONE_SECONDS);

    this.track([osc], TONE_SECONDS * 1000, onEnded);
  }

  track(nodes, ms, onEnded) {
    const entry = { nodes, onEnded };
    entry.timer = setTimeout(() => {
      if (this.current === entry) {
        this.current = null;
        if (onEnded) onEnded();
      }
    }, ms);
    this.current = entry;
  }

  loadCustomAudio(keyChar, file) {
    return new Promise((resolve, reject) => {
      this.init();
      const reader = new FileReader();
      reader.onload = (e) => {
        this.ctx.decodeAudioData(e.target.result, (buffer) => {
          this.customSounds[keyChar] = buffer;
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
    src.start();
    this.track([src], buffer.duration * 1000, onEnded);
  }
}

export default SoundboardAudioEngine;
