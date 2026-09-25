#!/usr/bin/env python3
"""Generate the placeholder WAV files (standard library only).

Output (in firmware/placeholders/ by default):
  beep.wav                 boot chime: 3 ascending notes
  audio1.wav..audio9.wav   one distinct tone per keypad key 1..9
  audio10.wav              tone for keypad key 0

Format: 16 kHz, mono, 16-bit PCM, each file shorter than 1 second.
The output is deterministic, so re-running produces identical files.

Usage: python3 tools/gen_placeholders.py [output_dir]
"""
import math
import os
import struct
import sys
import wave

SAMPLE_RATE = 16000
AMPLITUDE = 0.5  # fraction of full scale

# Keypad key -> tone frequency in Hz (the web demo uses the same values).
# Key 0 is stored as audio10.wav.
KEY_TONES = [
    ("1", "audio1.wav", 392.00),
    ("2", "audio2.wav", 440.00),
    ("3", "audio3.wav", 493.88),
    ("4", "audio4.wav", 523.25),
    ("5", "audio5.wav", 587.33),
    ("6", "audio6.wav", 659.25),
    ("7", "audio7.wav", 698.46),
    ("8", "audio8.wav", 783.99),
    ("9", "audio9.wav", 880.00),
    ("0", "audio10.wav", 987.77),
]

# Boot chime: C5, E5, G5 (generic ascending triad).
BEEP_NOTES = [523.25, 659.25, 783.99]


def tone(freq, seconds, attack=0.01, release=0.08):
    """Sine tone with a short linear attack/release envelope (avoids clicks)."""
    n = int(SAMPLE_RATE * seconds)
    a = max(1, int(SAMPLE_RATE * attack))
    r = max(1, int(SAMPLE_RATE * release))
    out = []
    for i in range(n):
        env = 1.0
        if i < a:
            env = i / a
        elif i > n - r:
            env = max(0.0, (n - i) / r)
        out.append(AMPLITUDE * env * math.sin(2 * math.pi * freq * i / SAMPLE_RATE))
    return out


def silence(seconds):
    return [0.0] * int(SAMPLE_RATE * seconds)


def write_wav(path, samples):
    frames = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(frames)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "placeholders")
    os.makedirs(out_dir, exist_ok=True)

    beep = []
    for f in BEEP_NOTES:
        beep += tone(f, 0.16) + silence(0.03)
    beep += silence(0.05)
    write_wav(os.path.join(out_dir, "beep.wav"), beep)
    print("beep.wav      %.2f s" % (len(beep) / SAMPLE_RATE))

    for key, name, freq in KEY_TONES:
        samples = tone(freq, 0.45)
        write_wav(os.path.join(out_dir, name), samples)
        print("%-13s key %s  %.2f Hz  %.2f s" % (name, key, freq, len(samples) / SAMPLE_RATE))


if __name__ == "__main__":
    main()
