// Post-stop press lockout: pure logic with no Arduino dependencies, so it can be unit-tested on
// the host (see tools/test_press_lockout.c).
//
// After a press stops playback, further presses are ignored until the keys involved in that stop
// are released: the key that caused the stop plus any key pressed (new edge) while the lockout is
// active. Keys that were already held down before the stop (held at boot, stuck or shorted) are
// NOT part of the lockout, so they can never block it. As a safety net the lockout also ends
// PRESS_LOCKOUT_MAX_MS after the stop; this is safe because triggering is edge-based, so a key
// that is still held after the timeout does not start anything by itself.
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define PRESS_LOCKOUT_MAX_MS 2000u

typedef struct {
  uint16_t mustRelease;  // bit i set = key index i has to be released before presses count again
  uint32_t stoppedAt;    // millis() of the stop
} PressLockout;

// A press on key 'index' has just stopped playback.
static inline void lockoutOnStop(PressLockout *l, uint8_t index, uint32_t now) {
  l->mustRelease = (uint16_t)(1u << index);
  l->stoppedAt = now;
}

// A new press edge on key 'index'. Returns true if the press must be ignored; an ignored key is
// added to the keys that have to be released.
static inline bool lockoutOnPress(PressLockout *l, uint8_t index) {
  if (l->mustRelease == 0) return false;
  l->mustRelease |= (uint16_t)(1u << index);
  return true;
}

// Once per loop, after the press edges: heldMask has bit i set for every key that is currently
// held (debounced LOW). Released keys leave the lockout; the timeout ends it.
static inline void lockoutUpdate(PressLockout *l, uint16_t heldMask, uint32_t now) {
  l->mustRelease &= heldMask;
  if (l->mustRelease != 0 && (uint32_t)(now - l->stoppedAt) >= PRESS_LOCKOUT_MAX_MS) {
    l->mustRelease = 0;
  }
}

static inline bool lockoutActive(const PressLockout *l) { return l->mustRelease != 0; }
