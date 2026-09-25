import * as THREE from 'https://esm.sh/three@0.160.0';
import { BlueprintScene } from './scene.js';
import SoundboardAudioEngine from './audio.js';
import { PhoneModel } from './models/phone.js';
import { BreadboardModel } from './models/breadboard.js';
import { ModdingModel } from './models/modding.js';
import { KEYS, KEY_BY_CHAR } from './hardware.js';

// Short description shown in the viewport for each 3D view
const VIEW_CONTEXT = {
  phone: '<strong>View: Complete Phone</strong> — Click keys 1-9 or 0 to play that key\'s tone. The key lights up and the LED blinks while it plays.',
  breadboard: '<strong>View: Breadboard Circuit</strong> — ESP32 dev board, MAX98357A amplifier, 8 Ω speaker, LED and 10 push buttons. Click a button to test it.',
  modding: '<strong>View: Internal Layout</strong> — Boards on standoffs inside the phone case, one wire per key, speaker in the handset, USB power through the rear panel.'
};

class BlueprintApp {
  constructor() {
    this.activeView = 'phone'; // 'phone', 'breadboard', 'modding'
    this.isXRay = false;
    this.activeKey = null;     // key whose clip is playing (demo state, also used by tests)

    this.initAudio();
    this.init3D();
    this.renderPinTable();
    this.renderSoundCards();
    this.initEventListeners();
    this.initUI();
  }

  // Keypad pin table in the Wiring tab (from js/hardware.js, same as the firmware)
  renderPinTable() {
    const tbody = document.querySelector('#pin-table-keys tbody');
    if (!tbody) return;
    tbody.innerHTML = KEYS.map(k => `
      <tr data-key="${k.key}">
        <td><span class="key-badge small" style="--key-color: ${k.css}">${k.key}</span></td>
        <td><strong>GPIO ${k.gpio}</strong></td>
        <td>GND</td>
        <td><code>${k.file}</code></td>
      </tr>`).join('');
  }

  // One card per key in the Sound Test tab
  renderSoundCards() {
    const grid = document.getElementById('sound-cards');
    if (!grid) return;
    grid.innerHTML = KEYS.map(k => `
      <div class="sound-card" data-key="${k.key}">
        <div class="sound-card-left">
          <div class="key-badge" style="--key-color: ${k.css}">${k.key}</div>
          <div class="sound-info">
            <h5>Key ${k.key} · ${k.file}</h5>
            <p>GPIO ${k.gpio} &bull; <span class="custom-badge" data-key="${k.key}">Test tone ${Math.round(k.freq)} Hz</span></p>
          </div>
        </div>
        <div class="sound-card-right">
          <label class="btn-upload-label" title="Load a local audio file for this key">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <input type="file" accept="audio/*" class="file-input-k" data-key="${k.key}" style="display: none;">
          </label>
          <button class="btn-sound-play sound-play-btn" data-key="${k.key}" aria-label="Play key ${k.key}">▶</button>
        </div>
      </div>`).join('');
  }

  initAudio() {
    this.audio = new SoundboardAudioEngine();
  }

  init3D() {
    const container = document.getElementById('viewport-container');
    this.sceneManager = new BlueprintScene(container);

    // Instantiate 3D models
    this.phoneModel = new PhoneModel(this.sceneManager.scene);
    this.breadboardModel = new BreadboardModel(this.sceneManager.scene);
    this.moddingModel = new ModdingModel(this.sceneManager.scene);

    // Initial visibility: show phone, hide others
    this.breadboardModel.group.visible = false;
    this.moddingModel.group.visible = false;

    // Updatable loop for sound waves and the status LED
    this.ledBlinkTime = 0;
    this.sceneManager.updatables.push((delta) => {
      if (this.phoneModel) {
        this.phoneModel.updateWaves(delta);
      }
      if (this.activeKey) {
        this.ledBlinkTime += delta;
        this.breadboardModel.setLed(Math.floor(this.ledBlinkTime / 0.15) % 2 === 0);
      } else {
        this.ledBlinkTime = 0;
        this.breadboardModel.setLed(false);
      }
    });

    // 3D Click Interaction via Raycasting
    container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  onPointerDown(event) {
    const rect = this.sceneManager.container.getBoundingClientRect();
    this.sceneManager.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.sceneManager.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.sceneManager.raycaster.setFromCamera(
      this.sceneManager.mouse,
      this.sceneManager.camera
    );

    let activeObjects = [];
    if (this.activeView === 'phone') {
      activeObjects = [...this.phoneModel.interactiveButtons];
    } else if (this.activeView === 'breadboard') {
      activeObjects = [...this.breadboardModel.interactivePushbuttons];
    }

    const intersects = this.sceneManager.raycaster.intersectObjects(activeObjects, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;

      while (hit && !hit.userData.character && !hit.userData.isBreadboardButton && hit.parent && hit !== this.sceneManager.scene) {
        hit = hit.parent;
      }

      if (!hit) return;

      // Clicked on Phone Keypad Button
      if (hit.userData.character) {
        const char = hit.userData.character;
        this.handleButtonTrigger(char);
        return;
      }

      // Clicked on Breadboard Pushbutton
      if (hit.userData.isBreadboardButton) {
        this.handleBreadboardButtonTrigger(hit.userData.keyChar);
        return;
      }
    }
  }

  // Plays the clip of a trigger key and highlights it (3D key, sound card, LED) while it plays
  playKey(char) {
    const info = KEY_BY_CHAR[char];
    if (!info) return false;
    if (this.activeKey) this.unhighlightTrackInUI(this.activeKey);
    this.activeKey = char;
    this.phoneModel.setActiveKey(char);
    this.highlightTrackInUI(char);
    this.phoneModel.triggerSoundWaveAnimation();
    this.audio.playKey(char, () => {
      this.unhighlightTrackInUI(char);
      if (this.activeKey === char) {
        this.activeKey = null;
        this.phoneModel.setActiveKey(null);
      }
    });
    return true;
  }

  handleButtonTrigger(char) {
    this.phoneModel.animateButtonPress(char);
    const info = KEY_BY_CHAR[char];
    if (info) {
      this.playKey(char);
      this.showToast(`🔊 Key ${char} (GPIO ${info.gpio}) → ${info.file}`);
    } else {
      // * and # are not wired: just a keypad beep
      this.audio.playDTMF(char, 0.2);
    }
  }

  handleBreadboardButtonTrigger(char) {
    const info = KEY_BY_CHAR[char];
    if (!info) return;
    this.breadboardModel.animateButtonPress(char);
    this.playKey(char);
    this.showToast(`⚡ GPIO ${info.gpio} pulled LOW → key ${char} → ${info.file}`);
  }

  switchView(viewName) {
    this.activeView = viewName;

    // Reset visibility
    this.phoneModel.group.visible = (viewName === 'phone');
    this.breadboardModel.group.visible = (viewName === 'breadboard');
    this.moddingModel.group.visible = (viewName === 'modding');

    // Camera viewpoints
    if (viewName === 'phone') {
      this.sceneManager.animateCameraTo(
        new THREE.Vector3(22, 24, 28),
        new THREE.Vector3(0, 4, 0),
        700
      );
    } else if (viewName === 'breadboard') {
      this.sceneManager.animateCameraTo(
        new THREE.Vector3(-2, 34, 27),
        new THREE.Vector3(-2, 1.0, 0.5),
        700
      );
    } else if (viewName === 'modding') {
      this.sceneManager.animateCameraTo(
        new THREE.Vector3(18, 20, 30),
        new THREE.Vector3(2, 3, 0),
        700
      );
    }

    // Update UI tabs
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    this.updateContextInfo();
  }

  updateContextInfo() {
    const infoElem = document.getElementById('view-context-info');
    if (!infoElem) return;

    infoElem.innerHTML = VIEW_CONTEXT[this.activeView] || '';
  }

  focusOnComponent(componentKey) {
    switch (componentKey) {
      case 'esp32':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(new THREE.Vector3(-7, 11, 9), new THREE.Vector3(-7, 1.8, 0), 600);
        break;
      case 'amp':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(new THREE.Vector3(6, 10, 6), new THREE.Vector3(6, 1.5, -3), 600);
        break;
      case 'usb':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(new THREE.Vector3(-15, 10, 9), new THREE.Vector3(-15, 1.5, 0), 600);
        break;
      case 'led':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(new THREE.Vector3(-1.5, 8, 3), new THREE.Vector3(-1.5, 1.2, -3.6), 600);
        break;
      case 'speaker':
        this.switchView('phone');
        this.isXRay = true;
        this.phoneModel.toggleXRayMode(true);
        {
          const xrayBtn = document.getElementById('btn-toggle-xray');
          if (xrayBtn) xrayBtn.classList.add('active');
        }
        this.sceneManager.animateCameraTo(new THREE.Vector3(-5.5, 14, -10), new THREE.Vector3(-5.5, 6.4, -5.6), 600);
        break;
      case 'keypad':
        this.switchView('phone');
        this.sceneManager.animateCameraTo(new THREE.Vector3(3.6, 16, 7), new THREE.Vector3(3.6, 4.6, 0.8), 600);
        break;
      case 'pushbuttons':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(new THREE.Vector3(-2, 12, 13), new THREE.Vector3(-2, 1.2, 3.4), 600);
        break;
    }
  }

  highlightTrackInUI(keyNum) {
    const card = document.querySelector(`.sound-card[data-key="${keyNum}"]`);
    if (card) {
      card.classList.add('playing');
    }
  }

  unhighlightTrackInUI(keyNum) {
    const card = document.querySelector(`.sound-card[data-key="${keyNum}"]`);
    if (card) {
      card.classList.remove('playing');
    }
  }

  showToast(message) {
    let toast = document.getElementById('blueprint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'blueprint-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.className = 'toast-show';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.className = '';
    }, 2800);
  }

  initEventListeners() {
    // View Tab buttons
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // X-Ray Toggle Button
    const xrayBtn = document.getElementById('btn-toggle-xray');
    if (xrayBtn) {
      xrayBtn.addEventListener('click', () => {
        this.isXRay = !this.isXRay;
        this.phoneModel.toggleXRayMode(this.isXRay);
        xrayBtn.classList.toggle('active', this.isXRay);
      });
    }

    // Reset Camera
    const resetCamBtn = document.getElementById('btn-reset-cam');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        this.switchView(this.activeView);
      });
    }

    // Sound card play buttons (one per key)
    document.querySelectorAll('.sound-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleButtonTrigger(btn.dataset.key);
      });
    });

    // Component focus links in BOM
    document.querySelectorAll('[data-focus]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const target = elem.dataset.focus;
        this.focusOnComponent(target);
      });
    });

    // Volume Slider
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        this.audio.setVolume(parseFloat(e.target.value));
      });
    }

    // Custom MP3 File Loaders
    document.querySelectorAll('.file-input-k').forEach(input => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const key = input.dataset.key;
        if (file) {
          try {
            await this.audio.loadCustomAudio(key, file);
            this.showToast(`✅ Custom audio loaded for key ${key}: ${file.name}`);
            const badge = document.querySelector(`.custom-badge[data-key="${key}"]`);
            if (badge) badge.innerText = 'Custom file';
          } catch (err) {
            this.showToast(`❌ Could not decode the audio file for key ${key}`);
          }
        }
      });
    });

    // Phase Checklist Toggles
    document.querySelectorAll('.step-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateChecklistProgress();
      });
    });
  }

  updateChecklistProgress() {
    const total = document.querySelectorAll('.step-checkbox').length;
    const checked = document.querySelectorAll('.step-checkbox:checked').length;
    const percent = Math.round((checked / total) * 100);

    const bar = document.getElementById('execution-progress-bar');
    const text = document.getElementById('execution-progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) {
      text.innerText = `${percent}% completed (${checked}/${total} steps)`;
    }
  }

  initUI() {
    this.updateContextInfo();
    this.updateChecklistProgress();
  }
}

// Start on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.blueprintApp = new BlueprintApp();
});
