import * as THREE from 'https://esm.sh/three@0.160.0';
import { BlueprintScene } from './scene.js';
import SoundboardAudioEngine from './audio.js';
import { PhoneModel } from './models/phone.js';
import { BreadboardModel } from './models/breadboard.js';
import { ModdingModel } from './models/modding.js';
import { translations } from './i18n.js';

class BlueprintApp {
  constructor() {
    this.currentLang = localStorage.getItem('blueprint_lang') || 'en';
    this.activeView = 'phone'; // 'phone', 'breadboard', 'modding'
    this.isHandsetLifted = false;
    this.isPowerOn = false; // 0µA until lifted
    this.isXRay = false;

    this.initAudio();
    this.init3D();
    this.initLanguage();
    this.initEventListeners();
    this.initUI();
  }

  t(key, params = {}) {
    const dict = translations[this.currentLang] || translations.en;
    let str = dict[key] || translations.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  setLanguage(lang) {
    if (!translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('blueprint_lang', lang);
    document.documentElement.lang = lang;

    // Update all static i18n text
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const translated = this.t(key);
      if (translated.includes('<') && translated.includes('>')) {
        el.innerHTML = translated;
      } else {
        el.innerText = translated;
      }
    });

    // Update tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      el.title = this.t(key);
    });

    // Update active button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update dynamic UI state
    this.updateHUDPowerStatus();
    this.updateHandsetButtonUI();
    this.updateContextInfo();
    this.updateChecklistProgress();
  }

  initLanguage() {
    this.setLanguage(this.currentLang);
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

    // Updatable loop for soundwaves
    this.sceneManager.updatables.push((delta) => {
      if (this.phoneModel) {
        this.phoneModel.updateWaves(delta);
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
      activeObjects = [
        ...this.phoneModel.interactiveButtons,
        this.phoneModel.handsetGroup
      ];
    } else if (this.activeView === 'breadboard') {
      activeObjects = [
        ...this.breadboardModel.interactivePushbuttons,
        this.breadboardModel.mb102SwitchBtn
      ];
    }

    const intersects = this.sceneManager.raycaster.intersectObjects(activeObjects, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;

      while (hit && !hit.userData.character && !hit.userData.isHandset && !hit.userData.isBreadboardButton && hit.parent && hit !== this.sceneManager.scene) {
        hit = hit.parent;
      }

      if (!hit) return;

      // Clicked on Handset
      if (hit.userData.isHandset) {
        this.toggleHandset();
        return;
      }

      // Clicked on Phone Keypad Button
      if (hit.userData.character) {
        const char = hit.userData.character;
        this.handleButtonTrigger(char);
        return;
      }

      // Clicked on Breadboard Pushbutton
      if (hit.userData.isBreadboardButton) {
        const keyNum = hit.userData.keyNumber;
        this.handleBreadboardButtonTrigger(keyNum);
        return;
      }
    }
  }

  toggleHandset() {
    this.isHandsetLifted = !this.isHandsetLifted;

    if (this.isHandsetLifted) {
      // Lifted: Hook switch closes -> 5V circuit LIVE!
      this.isPowerOn = true;
      this.audio.playHookLift();
      this.phoneModel.setHandsetLifted(true, () => {
        setTimeout(() => {
          if (this.isHandsetLifted) {
            this.audio.startDialTone();
          }
        }, 220);
      });
      this.moddingModel.updateCircuitState(true);
    } else {
      // Hung up: Hook switch opens -> INSTANT 0µA CUT-OFF!
      this.isPowerOn = false;
      this.audio.playHookDrop();
      this.phoneModel.setHandsetLifted(false);
      this.moddingModel.updateCircuitState(false);
    }

    this.updateHUDPowerStatus();
    this.updateHandsetButtonUI();
  }

  handleButtonTrigger(char) {
    this.phoneModel.animateButtonPress(char);

    // If phone is still hung up, warn user
    if (!this.isHandsetLifted) {
      this.showToast(this.t('toastHungUp'));
      return;
    }

    const keyNum = parseInt(char);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 5) {
      // Soundboard track K1..K5
      this.highlightTrackInUI(keyNum);
      this.phoneModel.triggerSoundWaveAnimation();
      this.audio.playTrack(keyNum, () => {
        this.unhighlightTrackInUI(keyNum);
      });
      this.showToast(this.t('toastPlayingTrack', { key: keyNum }));
    } else {
      // DTMF dial tone for other buttons
      this.audio.playDTMF(char, 0.2);
    }
  }

  handleBreadboardButtonTrigger(keyNum) {
    this.breadboardModel.animateButtonPress(keyNum);
    this.highlightTrackInUI(keyNum);
    this.audio.playTrack(keyNum, () => {
      this.unhighlightTrackInUI(keyNum);
    });
    this.showToast(this.t('toastPulseLow', { key: keyNum }));
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
        new THREE.Vector3(0, 30, 22),
        new THREE.Vector3(0, 1.5, 0),
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

    if (this.activeView === 'phone') {
      infoElem.innerHTML = this.t('contextPhone');
    } else if (this.activeView === 'breadboard') {
      infoElem.innerHTML = this.t('contextBreadboard');
    } else if (this.activeView === 'modding') {
      infoElem.innerHTML = this.t('contextModding');
    }
  }

  focusOnComponent(componentKey) {
    switch (componentKey) {
      case 'jq6500':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(-2, 10, 8),
          new THREE.Vector3(-2, 1.8, 0),
          600
        );
        break;
      case 'mb102':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(-8.8, 11, 7),
          new THREE.Vector3(-8.8, 1.5, 0),
          600
        );
        break;
      case 'speaker':
        this.switchView('phone');
        this.phoneModel.toggleXRayMode(true);
        const xrayBtn = document.getElementById('btn-toggle-xray');
        if (xrayBtn) xrayBtn.classList.add('active');
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(-5.5, 14, -10),
          new THREE.Vector3(-5.5, 6.4, -5.6),
          600
        );
        break;
      case 'hook_switch':
        this.switchView('phone');
        this.phoneModel.setHandsetLifted(true);
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(-5.5, 13, -2),
          new THREE.Vector3(-5.5, 6.4, -5.6),
          600
        );
        break;
      case 'keypad':
        this.switchView('phone');
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(3.6, 16, 7),
          new THREE.Vector3(3.6, 4.6, 0.8),
          600
        );
        break;
      case 'pushbuttons':
        this.switchView('breadboard');
        this.sceneManager.animateCameraTo(
          new THREE.Vector3(5.5, 10, 8),
          new THREE.Vector3(5.5, 1.2, 2.4),
          600
        );
        break;
    }
  }

  updateHUDPowerStatus() {
    const badge = document.getElementById('power-status-badge');
    const statusText = document.getElementById('power-status-text');

    if (this.isPowerOn) {
      badge.className = 'status-badge live';
      if (statusText) statusText.innerText = this.t('statusLive');
    } else {
      badge.className = 'status-badge standby';
      if (statusText) statusText.innerText = this.t('statusStandby');
    }
  }

  updateHandsetButtonUI() {
    const btnText = document.getElementById('btn-toggle-handset-text');
    const btn = document.getElementById('btn-toggle-handset');
    if (btn && btnText) {
      if (this.isHandsetLifted) {
        btnText.innerText = this.t('btnDropHandset');
        btn.classList.add('active');
      } else {
        btnText.innerText = this.t('btnLiftHandset');
        btn.classList.remove('active');
      }
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
    // Language Switcher Buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLanguage(btn.dataset.lang);
      });
    });

    // View Tab buttons
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // Handset Toggle Button
    const toggleHandsetBtn = document.getElementById('btn-toggle-handset');
    if (toggleHandsetBtn) {
      toggleHandsetBtn.addEventListener('click', () => {
        this.toggleHandset();
      });
    }

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

    // Soundboard UI buttons (K1-K5)
    document.querySelectorAll('.sound-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = parseInt(btn.dataset.key);
        if (!this.isHandsetLifted) {
          this.toggleHandset(); // Auto-lift handset for convenience
        }
        this.handleButtonTrigger(key.toString());
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
        const key = parseInt(input.dataset.key);
        if (file) {
          try {
            await this.audio.loadCustomAudio(key, file);
            this.showToast(this.t('toastAudioLoaded', { key: key, name: file.name }));
            const badge = document.querySelector(`.custom-badge[data-key="${key}"]`);
            if (badge) badge.innerText = this.t('soundBadgeCustom');
          } catch (err) {
            this.showToast(this.t('toastAudioError', { key: key }));
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
      text.innerText = this.t('progressCompleted', {
        percent: percent,
        checked: checked,
        total: total
      });
    }
  }

  initUI() {
    this.updateHUDPowerStatus();
    this.updateHandsetButtonUI();
    this.updateContextInfo();
    this.updateChecklistProgress();
  }
}

// Start on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.blueprintApp = new BlueprintApp();
});
