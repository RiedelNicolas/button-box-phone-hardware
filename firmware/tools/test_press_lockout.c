// Host-side unit test for src/press_lockout.h (the real header, compiled with the host C compiler).
// Run:  cc -std=c11 -Wall -Wextra -Werror -o /tmp/test_press_lockout tools/test_press_lockout.c && /tmp/test_press_lockout
//
// The simulation mirrors main.cpp: 'held' is the debounced key state, a press is a HIGH->LOW
// edge, and a press stops playback if audio is playing, otherwise it starts that key's clip.
#include <stdio.h>
#include "../src/press_lockout.h"

static PressLockout lk;
static uint16_t held;       // debounced held keys
static int playing;         // 1 while a clip plays
static int playedKey;       // key index of the last started clip, -1 = none
static int ignoredCount;
static uint32_t now;
static int failures;

static void reset(uint16_t heldAtBoot) {
  lk.mustRelease = 0; lk.stoppedAt = 0;
  held = heldAtBoot; playing = 0; playedKey = -1; ignoredCount = 0; now = 1000;
}
// One loop pass: apply the new held mask, generate press edges in index order (as updateButtons).
static void pass(uint16_t newHeld) {
  for (uint8_t i = 0; i < 10; i++) {
    uint16_t bit = (uint16_t)(1u << i);
    if ((newHeld & bit) && !(held & bit)) {                 // press edge
      if (lockoutOnPress(&lk, i)) { ignoredCount++; continue; }
      if (playing) { playing = 0; lockoutOnStop(&lk, i, now); }
      else { playing = 1; playedKey = i; }
    }
  }
  held = newHeld;
  lockoutUpdate(&lk, held, now);
  now += 60;  // > debounce between passes
}
#define K(i) ((uint16_t)(1u << (i)))
#define CHECK(cond, msg) do { if (cond) printf("PASS  %s\n", msg); else { printf("FAIL  %s\n", msg); failures++; } } while (0)

int main(void) {
  // 1. Normal dual press during playback: A and B in the same pass, then B later than A.
  reset(0);
  pass(K(0)); pass(0);                                   // key 1 plays
  pass(K(1) | K(2));                                      // keys 2 and 3 together -> stop only
  CHECK(!playing && ignoredCount == 1 && lockoutActive(&lk), "dual press (same pass): stops, second key ignored, lockout on");
  pass(K(2));                                             // release key 2, key 3 still held
  CHECK(lockoutActive(&lk), "dual press: still locked while the other pressed key is held");
  pass(K(2) | K(4));                                      // new press of key 5 while locked
  CHECK(!playing && ignoredCount == 2, "dual press: a new press during the lockout is ignored");
  pass(0);                                                // release everything
  CHECK(!lockoutActive(&lk), "dual press: lockout ends when all involved keys are released");
  pass(K(6));
  CHECK(playing && playedKey == 6, "dual press: next press after release plays");

  reset(0);
  pass(K(0)); pass(0);                                   // key 1 plays
  pass(K(1));                                             // key 2 -> stop
  pass(K(1) | K(2));                                      // key 3 one pass (60 ms) later
  CHECK(!playing && ignoredCount == 1, "staggered dual press (60 ms apart): stop only, nothing starts");
  pass(0); pass(K(3));
  CHECK(playing && playedKey == 3, "staggered dual press: next press after release plays");

  // 2. Key held at boot (key 9 LOW from the start, never an edge).
  reset(K(8));
  pass(K(8) | K(0)); pass(K(8));                          // key 1 plays
  pass(K(8) | K(1)); pass(K(8));                          // key 2 stops it, then released
  CHECK(!playing && !lockoutActive(&lk), "held at boot: lockout ends although key 9 stays LOW");
  pass(K(8) | K(2));
  CHECK(playing && playedKey == 2, "held at boot: the next press plays");

  // 3. Key that gets stuck before the stop (edge while idle, then stays LOW forever).
  reset(0);
  pass(K(6));                                             // key 7 plays and stays stuck
  pass(K(6) | K(1)); pass(K(6));                          // key 2 stops, released
  CHECK(!playing && !lockoutActive(&lk), "stuck key from before the stop does not block");
  pass(K(6) | K(3));
  CHECK(playing && playedKey == 3, "stuck key: the next press plays");
  pass(K(6)); pass(K(6) | K(4)); pass(K(6));              // stop again, release
  pass(K(6) | K(5));
  CHECK(playing && playedKey == 5, "stuck key: works across repeated stops");

  // 4. Stopping key itself gets stuck: the timeout safety net ends the lockout.
  reset(0);
  pass(K(0)); pass(0);                                    // plays
  pass(K(1));                                             // key 2 stops and stays stuck
  for (int i = 0; i < 40; i++) pass(K(1));                // 2.4 s held
  CHECK(!lockoutActive(&lk) && !playing, "stuck stopping key: lockout ends after the timeout, nothing starts by itself");
  pass(K(1) | K(4));
  CHECK(playing && playedKey == 4, "stuck stopping key: another key plays after the timeout");

  // 5. Idle presses never lock.
  reset(0);
  pass(K(0)); pass(0);
  CHECK(!lockoutActive(&lk), "press while idle does not arm the lockout");

  printf(failures ? "\n%d FAILED\n" : "\nALL LOCKOUT TESTS PASSED\n", failures);
  return failures ? 1 : 0;
}
