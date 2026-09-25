# Button Box Phone 📞🔊

The site lives at https://funnyphone.nriedel.com.ar.

A recycled phone case turned into a sound box. Each of the 10 keypad keys (1 to 9 and 0) is a
rubber push button that plays its own short WAV clip. Inside: an **ESP32 dev board**, a
**MAX98357A I2S amplifier** driving an **8 Ω speaker**, one status **LED**, and always-on
**USB power**.

This repository contains:

- [`firmware/`](firmware/): the PlatformIO firmware for the ESP32. **Start here to build and
  flash it**: [`firmware/README.md`](firmware/README.md) has the wiring, the build/upload
  commands and how to replace the audio.
- The interactive 3D blueprint (this folder: `index.html`, `css/`, `js/`), deployed to GitHub
  Pages.

---

## Behavior

- At power-up a short 3-note chime plays (`beep.wav`).
- Press a key while idle: its clip plays to the end.
- Press any key while a clip plays: playback stops (no new clip starts).
- The LED blinks while audio plays and is off when idle.

## Keys, pins and files

Buttons are active-low (one leg to the GPIO, the other to GND, internal pull-ups). The same
table is at the top of [`firmware/src/main.cpp`](firmware/src/main.cpp) and in
[`js/hardware.js`](js/hardware.js) (used by the blueprint).

| Key | ESP32 GPIO | File | Color in the blueprint |
| :---: | :---: | --- | --- |
| **1** | 23 | `audio1.wav` | Emerald `#10b981` |
| **2** | 22 | `audio2.wav` | Blue `#3b82f6` |
| **3** | 21 | `audio3.wav` | Purple `#8b5cf6` |
| **4** | 19 | `audio4.wav` | Amber `#f59e0b` |
| **5** | 18 | `audio5.wav` | Red `#ef4444` |
| **6** | 17 | `audio6.wav` | Cyan `#06b6d4` |
| **7** | 16 | `audio7.wav` | Pink `#ec4899` |
| **8** | 4 | `audio8.wav` | Lime `#84cc16` |
| **9** | 13 | `audio9.wav` | Orange `#f97316` |
| **0** | 32 | `audio10.wav` | Indigo `#6366f1` |

| Signal | ESP32 GPIO |
| --- | --- |
| MAX98357A BCLK | 27 |
| MAX98357A LRC | 26 |
| MAX98357A DIN | 25 |
| Status LED (via 220-330 Ω) | 33 |
| MAX98357A VIN / GND | board 5V (VIN) / GND |

Keys `*` and `#` are not wired.

---

## 📐 3D blueprint views

1. **Complete Phone:** the phone case with the handset on its cradle and the keypad. The 10
   trigger keys are color-coded; clicking one plays its test tone, lights the key and blinks the
   status LED.
2. **Breadboard Circuit:** the test setup: ESP32 dev board powered over USB, MAX98357A, 8 Ω
   speaker, LED with resistor and 10 push buttons, each jumper wired to the GPIO in the table.
3. **Internal Layout:** X-ray view of the inside of the case: boards on standoffs, one wire per
   key, speaker lines up the handset cord, USB cable through the rear panel.

The sidebar has the overview, bill of materials, pinout, assembly/testing steps and a sound test
with one generic tone per key (the same tones as the firmware placeholders).

## 💻 Run the blueprint locally

```bash
# Option 1: Python 3
python3 -m http.server 8080

# Option 2: Node / npx
npx serve -l 8080 .
```

Open [http://localhost:8080](http://localhost:8080) in any modern browser.

## 🚀 GitHub Pages deployment

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) checks the syntax of
every `js/*.js` and `js/models/*.js` file and deploys the site to GitHub Pages on every push to
`main` (or manually from the **Actions** tab).

To enable it: repository **Settings** > **Pages** > **Build and deployment** > **Source**:
**GitHub Actions**. The site is published at https://funnyphone.nriedel.com.ar.
