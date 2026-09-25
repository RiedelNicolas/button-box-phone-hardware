# Firmware: ESP32 button box phone

> **Status: UNVERIFIED on hardware.** This firmware compiles and its filesystem image builds,
> but it has not been run on a real ESP32 + MAX98357A yet (and not in a simulator). Run the
> [manual hardware test](#manual-hardware-test) below on the board before relying on it.

Firmware for the button box phone: an ESP32 dev board inside a recycled phone case. Each of the
10 keypad keys (1 to 9 and 0) is a rubber push button that plays its own WAV clip through a
MAX98357A I2S amplifier and an 8 ohm speaker. Power is always on over USB.

Behavior:

| Situation | Result |
| --- | --- |
| Boot | Plays `/beep.wav` (a short 3-note ascending chime). |
| Press a key while idle | Plays that key's file to the end. |
| Press any key while audio is playing | Stops playback only, immediately. It does **not** start another clip. |
| Two keys at once while audio is playing | Stops playback only; presses are ignored until the keys pressed for that stop are released. A key held down from before (held at boot, stuck) does not block this. |
| LED | Blinks while audio plays, off when idle. |
| File missing | Logged on the serial monitor, nothing else happens (no crash). |

Buttons are debounced (50 ms) and the main loop never blocks (no `delay()`), so the audio keeps
streaming while the buttons and the LED are serviced. `audio.loop()` only refills the library's
input buffer from the file; decoding and `i2s_write()` run in the library's own audio task, so the
main loop never waits on the I2S DMA queue.

"Playing" includes the tail still queued in the I2S DMA buffers (up to about 0.5 s at 16 kHz)
after the library has finished reading the file, so the LED and the stop rule follow what you
actually hear. A stop flushes that queue.

## Hardware

| Qty | Part | Notes |
| --- | --- | --- |
| 1 | ESP32 dev board (ESP32-WROOM-32, 4 MB flash, "esp32dev") | No PSRAM needed. |
| 10 | Rubber push buttons (momentary, normally open) | One per keypad key 1-9 and 0. |
| 1 | MAX98357A I2S amplifier breakout | Mono, class D, 3.3-5 V logic. |
| 1 | 8 ohm speaker (0.5-3 W) | Wired straight to the amp's speaker terminals. |
| 1 | LED (any color, 3 or 5 mm) | Status: blinks while playing. |
| 1 | Resistor 220-330 ohm | In series with the LED. |
| 1 | USB cable + 5 V USB power adapter (1 A or more recommended) | Always-on power and flashing. |
| 1 | Recycled phone case | Housing for everything. |
| - | Connection wire, solder, hot glue or standoffs | |

## Wiring / pinout

All buttons are active-low: one leg to the GPIO, the other leg to GND. The ESP32 internal
pull-ups are enabled, so no external resistors are needed.

| Keypad key | ESP32 GPIO | Other button leg | File played |
| :---: | :---: | :---: | --- |
| 1 | GPIO 23 | GND | `/audio1.wav` |
| 2 | GPIO 22 | GND | `/audio2.wav` |
| 3 | GPIO 21 | GND | `/audio3.wav` |
| 4 | GPIO 19 | GND | `/audio4.wav` |
| 5 | GPIO 18 | GND | `/audio5.wav` |
| 6 | GPIO 17 | GND | `/audio6.wav` |
| 7 | GPIO 16 | GND | `/audio7.wav` |
| 8 | GPIO 4 | GND | `/audio8.wav` |
| 9 | GPIO 13 | GND | `/audio9.wav` |
| 0 | GPIO 32 | GND | `/audio10.wav` |

Key 0 plays `audio10.wav` (it is the tenth key).

| MAX98357A pin | Connect to | Notes |
| --- | --- | --- |
| VIN | ESP32 board 5V (VIN) pin | USB 5 V. The amp accepts 2.5-5.5 V; 5 V gives the most output power. |
| GND | ESP32 GND | Common ground. |
| BCLK | GPIO 27 | I2S bit clock. |
| LRC | GPIO 26 | I2S left/right (word select) clock. |
| DIN | GPIO 25 | I2S data. |
| GAIN | Leave unconnected | Unconnected = 9 dB (default). GAIN to GND = 12 dB, 100 k to GND = 15 dB, GAIN to VIN = 6 dB, 100 k to VIN = 3 dB. Power-cycle after changing it. |
| SD | Leave unconnected | The breakout has a 1 M resistor from SD to VIN; with VIN = 5 V this selects the (L+R)/2 mono mix. SD tied to GND shuts the amp down. |
| Speaker + / - | 8 ohm speaker | Bridge-tied outputs: never connect either speaker terminal to GND. |

| Other | Connect to |
| --- | --- |
| LED anode (long leg) | GPIO 33 through a 220-330 ohm resistor |
| LED cathode (short leg) | GND |
| USB | ESP32 board USB port (power + flashing + serial monitor) |

GAIN and SD behavior is taken from the Adafruit MAX98357 guide
(https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp/pinouts). Adafruit notes
the amp can need up to 650 mA at 5 V and recommends a supply rated for at least 800 mA; with the
ESP32 on the same USB line, use a 1 A (or better) USB adapter.

Pins that were avoided on purpose: strapping pins 0, 2, 5, 12, 15; flash pins 6-11; input-only
pins 34-39 (they have no internal pull-up); UART0 pins 1 and 3 (USB serial). GPIO 14 is free
as a spare. GPIO 16 and 17 are fine on WROOM modules but are not available on WROVER modules
(used by PSRAM there).

## Build and flash

1. Install PlatformIO Core (or the PlatformIO extension for VS Code):

   ```bash
   python3 -m pip install -U platformio
   ```

2. From this `firmware/` folder:

   ```bash
   pio run                  # build the firmware
   pio run -t upload        # flash the firmware over USB
   pio run -t uploadfs      # build the LittleFS image from data/ and flash it (the audio files)
   pio device monitor       # serial log at 115200 baud (Ctrl+C to exit)
   ```

   `pio run -t buildfs` only builds the filesystem image without flashing it.

Both `upload` and `uploadfs` are needed the first time. After that, run `uploadfs` again
whenever you change the audio, and `upload` whenever you change the code.

If the upload does not start, hold the board's BOOT button while the upload begins.

## Replacing the audio

`data/` is the source of the LittleFS image. It is ignored by git (only `data/.gitkeep` is
committed), so your own audio never ends up in the repository.

Before `buildfs` / `uploadfs`, the script `tools/copy_placeholders.py` copies each placeholder
from `placeholders/` into `data/` **only if that file does not exist yet**. Your own files are
never overwritten. To use your own sounds, put them in `data/` with exactly these names:

`beep.wav`, `audio1.wav` ... `audio9.wav`, `audio10.wav` (key 0).

Recommended format: **WAV, mono, 16 kHz, 16-bit PCM**. The library also accepts 8-bit PCM and
other sample rates, but 16 kHz / 16-bit is the tested setting. Stereo works but doubles the size
for no benefit (the amp is mono).

Convert any file with ffmpeg:

```bash
ffmpeg -i input.mp3 -ac 1 -ar 16000 -c:a pcm_s16le data/audio1.wav
```

Then run `pio run -t uploadfs`.

To regenerate the placeholder tones (standard library only):

```bash
python3 tools/gen_placeholders.py
```

## Storage limits

Partition table (`partitions.csv`, 4 MB flash, no OTA):

| Name | Type | Offset | Size (hex) | Size (bytes) |
| --- | --- | --- | --- | --- |
| nvs | data/nvs | 0x9000 | 0x5000 | 20,480 |
| phy_init | data/phy | 0xE000 | 0x1000 | 4,096 |
| factory | app/factory | 0x10000 | 0x140000 | 1,310,720 (1.25 MiB) |
| spiffs (LittleFS) | data/spiffs | 0x150000 | 0x2B0000 | 2,818,048 (2.69 MiB) |

The firmware uses about 883 KB of the 1.25 MiB app partition.

LittleFS uses 4096-byte blocks and needs some of them for its own metadata, and every file is
rounded up to whole blocks. Measured with the same `mklittlefs` tool PlatformIO uses: the
largest single file that fits is 2,804,400 bytes, and with 11 files of equal size (beep + 10
keys) each file can be at most 253,484 bytes, 2,788,324 bytes in total (about 1% overhead).

| Format | Bytes per second | Total audio (11 files) | Per file if split evenly |
| --- | --- | --- | --- |
| 16 kHz, 16-bit, mono | 32,000 | about 87 s | about 7.9 s |
| 8 kHz, 8-bit, mono | 8,000 | about 348 s (5.8 min) | about 31.6 s |

(WAV headers are 44 bytes per file, negligible.) Files do not need to be the same length; only
the total counts. `buildfs` fails with an error if the files do not fit. 8 kHz / 8-bit halves
the bandwidth and sounds noticeably worse; it is an option for longer clips.

## Audio library

[ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S) by schreibfaul1, **pinned to
tag 3.0.12** (commit `928c420`, July 2024). PlatformIO prints it as `2.0.0+sha.928c420` because
that tag's `library.json` was never bumped.

Why this version:

- The PlatformIO `espressif32` platform (7.1.3 used here) ships the Arduino-ESP32 **2.0.17**
  core (ESP-IDF 4.4).
- Releases 3.1.0 and later only compile on the Arduino-ESP32 3.x core (new ESP-IDF 5 I2S
  driver). Tested here: 3.1.0, 3.2.0 and 3.2.1 fail to compile on 2.0.17.
- From 3.3.0 on, the README says "Your board must have PSRAM!" (checked in 3.3.0, 3.4.0 and
  3.4.7), and the current 4.0.0 README says it "only works on multi-core chips like ESP32-S3,
  ESP32-S31 and ESP32-P4. The ESP32 is suitable to a limited extent".
- 3.0.12 builds on 2.0.17 and treats PSRAM as optional: it checks `psramInit()` and falls back
  to small buffers in internal RAM. Only FLAC and Vorbis require PSRAM in that version; WAV does
  not.

## Code structure

```
firmware/
  platformio.ini            PlatformIO project (env esp32dev, LittleFS, custom partitions)
  partitions.csv            4 MB flash layout (factory app + large LittleFS)
  src/main.cpp              the firmware (pin/file mapping at the top)
  src/press_lockout.h       post-stop press lockout (pure logic, host-testable)
  placeholders/*.wav        generated placeholder tones (committed)
  data/                     LittleFS source folder (your audio, not committed)
  tools/gen_placeholders.py generates placeholders/*.wav
  tools/copy_placeholders.py PlatformIO pre-script: fills data/ with missing placeholders
  tools/test_press_lockout.c host unit test for press_lockout.h
```

`src/main.cpp`:

- `BUTTONS[]`: GPIO -> file -> key label, one entry per key.
- `I2S_BCLK`, `I2S_LRC`, `I2S_DOUT`, `LED_PIN`: amplifier and LED pins.
- `updateButtons()`: per-button 50 ms debounce, calls `onButtonPressed()` once per press.
- `onButtonPressed()`: stops playback if something is playing, otherwise starts that key's file.
  After a stop it ignores presses until the keys pressed for that stop are released (2 s safety
  timeout); keys already held before the stop do not count. The logic is in `press_lockout.h`.
- `isPlaying()`: library running, or still inside the DMA drain time after end of file
  (tracked by the `audio_eof_mp3()` callback).
- `playFile()`: checks the file exists, then starts it; logs and returns if it cannot.
- `updateLed()`: blinks the LED with `millis()` while playing.
- `loop()`: `audio.loop()` + buttons + LED, no `delay()`.

Host unit test of the press lockout (any C compiler, from `firmware/`):

```bash
cc -std=c11 -Wall -Wextra -Werror -o /tmp/test_press_lockout tools/test_press_lockout.c && /tmp/test_press_lockout
```

## Changing the pin mapping

Edit the `BUTTONS[]` array at the top of `src/main.cpp`, for example:

```cpp
{23, "/audio1.wav",  '1'},   // GPIO 23 plays audio1.wav, labeled key 1
```

Rules: use a GPIO that supports `INPUT_PULLUP` and is not one of the avoided pins listed in
[Wiring / pinout](#wiring--pinout), and do not reuse the I2S or LED pins. You can also change
the file name of any entry; keep the leading `/`. Rebuild and `pio run -t upload`.

## Manual hardware test

Run this on the real board with the serial monitor open (`pio device monitor`, 115200 baud).
Expected serial lines are shown in `code`.

1. **Boot beep + LED.** Upload the filesystem and firmware, then reset. The chime plays and the
   LED blinks for the whole chime, then turns off.
   `[boot] button box phone firmware`, ten `[boot] key 1 -> GPIO 23 -> /audio1.wav` lines,
   `[boot] LittleFS: N of M bytes used`, `[audio] playing /beep.wav`,
   `[audio] end of file ... (DMA drains in 532 ms)`, `[audio] idle`.
2. **Idle press plays to the end.** Press key 1 while idle: its tone plays to the end, LED
   blinks until the sound stops. `[button] key 1 (GPIO 23) pressed`, `[audio] playing /audio1.wav`,
   `[audio] end of file ...`, `[audio] idle`. Repeat for all 10 keys (each has a different pitch).
3. **Press during playback stops only.** Press a key, then press another key while it plays:
   the sound stops and nothing new starts; the LED turns off.
   `[button] key 2 (GPIO 22) pressed`, `[audio] stopped by button press`, `[audio] idle`.
   Pressing again while idle plays that key normally.
4. **Two keys at once during playback.** While a clip plays, press two keys together: playback
   stops and no clip starts. `[audio] stopped by button press`, then
   `[button] ignored: release the keys pressed for the last stop first` for the second key.
   After releasing both, a single press plays again. Also check: hold one key down while
   powering on (or keep one pressed the whole time), play and stop a clip with another key,
   release it: the next press must play (the held key must not lock the buttons).
5. **Stop cuts immediately.** Replace one clip with a long file (several seconds) and stop it
   mid-way: the sound must cut at once, with no ~0.5 s tail.
6. **Missing file.** Temporarily change one `BUTTONS[]` entry to a file that does not exist
   (for example `"/missing.wav"`), rebuild and upload the firmware, press that key:
   `[audio] missing file: /missing.wav (run 'pio run -t uploadfs')`, no sound, no reboot; other
   keys still work. (Deleting a file from `data/` is not enough: `buildfs` refills missing
   files with placeholders.) Restore the entry afterwards.
7. **Failed / empty LittleFS.** Run `pio run -t erase`, then upload only the firmware
   (`pio run -t upload`, no `uploadfs`): `[boot] LittleFS mount failed. Upload the audio with
   'pio run -t uploadfs'.` and `[audio] LittleFS not mounted, cannot play /beep.wav`; pressing
   keys logs `[audio] LittleFS not mounted, cannot play /audioN.wav`, with no crash or reboot
   loop. Then run `pio run -t uploadfs` and reset to recover.
