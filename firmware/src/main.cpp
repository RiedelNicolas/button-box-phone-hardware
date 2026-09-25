/*
 * Button box phone firmware (ESP32 + MAX98357A).
 *
 * 10 push buttons (phone keypad keys 1-9 and 0) each play one WAV file stored in LittleFS
 * through a MAX98357A I2S amplifier driving an 8 ohm speaker.
 *
 *  - Press while idle           -> plays that key's file to the end.
 *  - Any press during playback  -> only stops playback (it does not start another clip).
 *  - LED                        -> blinks while audio plays, off when idle.
 *  - Boot                       -> plays /beep.wav (3-note ascending chime).
 *
 * Audio format: WAV, mono, 16 kHz, 16-bit PCM recommended (see README.md).
 */
#include <Arduino.h>
#include <LittleFS.h>
#include "Audio.h"  // ESP32-audioI2S

// ---------------------------------------------------------------------------
// Editable configuration
// ---------------------------------------------------------------------------

// Button -> audio file mapping (one entry per keypad key).
// Buttons are active-low: one leg to the GPIO, the other leg to GND (internal pull-up used).
// Key 0 plays /audio10.wav.
// Only use GPIOs that are safe with INPUT_PULLUP: avoid strapping pins 0, 2, 5, 12, 15,
// flash pins 6-11, input-only pins 34-39 (no pull-up), UART0 pins 1 and 3,
// and the I2S / LED pins defined below.
struct ButtonMap {
  uint8_t pin;       // GPIO number
  const char *file;  // path in LittleFS
  char key;          // keypad key label (for logs)
};

static const ButtonMap BUTTONS[] = {
  {23, "/audio1.wav",  '1'},
  {22, "/audio2.wav",  '2'},
  {21, "/audio3.wav",  '3'},
  {19, "/audio4.wav",  '4'},
  {18, "/audio5.wav",  '5'},
  {17, "/audio6.wav",  '6'},
  {16, "/audio7.wav",  '7'},
  { 4, "/audio8.wav",  '8'},
  {13, "/audio9.wav",  '9'},
  {32, "/audio10.wav", '0'},
};

// MAX98357A I2S pins.
static const uint8_t I2S_BCLK = 27;  // MAX98357A BCLK
static const uint8_t I2S_LRC  = 26;  // MAX98357A LRC (word select)
static const uint8_t I2S_DOUT = 25;  // MAX98357A DIN

// Status LED (through a series resistor to GND).
static const uint8_t LED_PIN = 33;

static const char *BOOT_FILE = "/beep.wav";

static const uint32_t DEBOUNCE_MS     = 50;   // button debounce time
static const uint32_t LED_BLINK_MS    = 150;  // LED toggle period while playing
static const uint8_t  VOLUME          = 18;   // library volume, 0..21

// ---------------------------------------------------------------------------

static const size_t NUM_BUTTONS = sizeof(BUTTONS) / sizeof(BUTTONS[0]);

struct ButtonState {
  bool lastReading;     // raw level read last loop (true = HIGH = released)
  bool stableState;     // debounced level
  uint32_t lastChange;  // millis() of the last raw level change
};

static ButtonState buttonStates[NUM_BUTTONS];
static Audio audio;
static bool fsMounted = false;
static bool wasPlaying = false;
static bool ledOn = false;
static uint32_t lastLedToggle = 0;

// Starts playing a file. Returns false (and logs) if the file is missing or cannot be opened.
static bool playFile(const char *path) {
  if (!fsMounted) {
    Serial.printf("[audio] LittleFS not mounted, cannot play %s\n", path);
    return false;
  }
  if (!LittleFS.exists(path)) {
    Serial.printf("[audio] missing file: %s (run 'pio run -t uploadfs')\n", path);
    return false;
  }
  if (!audio.connecttoFS(LittleFS, path)) {
    Serial.printf("[audio] could not open/decode: %s\n", path);
    return false;
  }
  Serial.printf("[audio] playing %s\n", path);
  return true;
}

static void stopPlayback() {
  audio.stopSong();
  Serial.println("[audio] stopped by button press");
}

// Called once per debounced press (HIGH -> LOW transition).
static void onButtonPressed(size_t index) {
  const ButtonMap &b = BUTTONS[index];
  Serial.printf("[button] key %c (GPIO %u) pressed\n", b.key, b.pin);
  if (audio.isRunning()) {
    stopPlayback();  // any press during playback only stops it
    return;
  }
  playFile(b.file);
}

static void updateButtons(uint32_t now) {
  for (size_t i = 0; i < NUM_BUTTONS; i++) {
    ButtonState &s = buttonStates[i];
    bool reading = digitalRead(BUTTONS[i].pin);
    if (reading != s.lastReading) {
      s.lastReading = reading;
      s.lastChange = now;
    }
    if ((now - s.lastChange) >= DEBOUNCE_MS && reading != s.stableState) {
      s.stableState = reading;
      if (reading == LOW) {
        onButtonPressed(i);
      }
    }
  }
}

static void updateLed(uint32_t now, bool playing) {
  if (!playing) {
    if (ledOn) {
      ledOn = false;
      digitalWrite(LED_PIN, LOW);
    }
    return;
  }
  if (now - lastLedToggle >= LED_BLINK_MS) {
    lastLedToggle = now;
    ledOn = !ledOn;
    digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("[boot] button box phone firmware");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  uint32_t now = millis();
  for (size_t i = 0; i < NUM_BUTTONS; i++) {
    pinMode(BUTTONS[i].pin, INPUT_PULLUP);
    bool level = digitalRead(BUTTONS[i].pin);
    buttonStates[i] = {level, level, now};  // a key held at boot does not trigger
    Serial.printf("[boot] key %c -> GPIO %u -> %s\n", BUTTONS[i].key, BUTTONS[i].pin, BUTTONS[i].file);
  }

  // Do not auto-format: a failed mount usually means the filesystem was never uploaded.
  fsMounted = LittleFS.begin(false);
  if (!fsMounted) {
    Serial.println("[boot] LittleFS mount failed. Upload the audio with 'pio run -t uploadfs'.");
  } else {
    Serial.printf("[boot] LittleFS: %u of %u bytes used\n",
                  (unsigned)LittleFS.usedBytes(), (unsigned)LittleFS.totalBytes());
  }

  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(VOLUME);

  playFile(BOOT_FILE);
}

void loop() {
  audio.loop();  // feeds the I2S output; must run often, so no delay() in this loop

  uint32_t now = millis();
  updateButtons(now);

  bool playing = audio.isRunning();
  if (wasPlaying && !playing) {
    Serial.println("[audio] idle");
  }
  wasPlaying = playing;
  updateLed(now, playing);
}
