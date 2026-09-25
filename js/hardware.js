/**
 * Single source of truth for the hardware mapping shown by the blueprint.
 * Must match the BUTTONS[] table and pin constants in firmware/src/main.cpp.
 */

// Keypad key -> ESP32 GPIO -> file in LittleFS, plus the demo tone (same frequency as the
// generated placeholder WAV) and the color used for the key and its wire in the 3D views.
export const KEYS = [
  { key: '1', gpio: 23, file: 'audio1.wav',  freq: 392.00, color: 0x10b981, css: '#10b981' },
  { key: '2', gpio: 22, file: 'audio2.wav',  freq: 440.00, color: 0x3b82f6, css: '#3b82f6' },
  { key: '3', gpio: 21, file: 'audio3.wav',  freq: 493.88, color: 0x8b5cf6, css: '#8b5cf6' },
  { key: '4', gpio: 19, file: 'audio4.wav',  freq: 523.25, color: 0xf59e0b, css: '#f59e0b' },
  { key: '5', gpio: 18, file: 'audio5.wav',  freq: 587.33, color: 0xef4444, css: '#ef4444' },
  { key: '6', gpio: 17, file: 'audio6.wav',  freq: 659.25, color: 0x06b6d4, css: '#06b6d4' },
  { key: '7', gpio: 16, file: 'audio7.wav',  freq: 698.46, color: 0xec4899, css: '#ec4899' },
  { key: '8', gpio: 4,  file: 'audio8.wav',  freq: 783.99, color: 0x84cc16, css: '#84cc16' },
  { key: '9', gpio: 13, file: 'audio9.wav',  freq: 880.00, color: 0xf97316, css: '#f97316' },
  { key: '0', gpio: 32, file: 'audio10.wav', freq: 987.77, color: 0x6366f1, css: '#6366f1' }
];

export const KEY_BY_CHAR = Object.fromEntries(KEYS.map(k => [k.key, k]));

// MAX98357A I2S pins and status LED pin.
export const I2S_PINS = { bclk: 27, lrc: 26, din: 25 };
export const LED_GPIO = 33;

export const BOOT_FILE = 'beep.wav';
