import * as THREE from 'https://esm.sh/three@0.160.0';
import { KEYS, I2S_PINS, LED_GPIO } from '../hardware.js';

/**
 * Procedural 3D model of the breadboard test circuit.
 * - Full-size breadboard with tie-point grid and power rails (+/-)
 * - ESP32 dev board (30-pin DevKit layout) straddling the center channel, powered over USB
 * - MAX98357A I2S amplifier breakout driving an 8 ohm speaker
 * - Status LED with series resistor
 * - 10 push buttons (keypad keys 1-9 and 0), each wired to its GPIO; other leg to GND
 * Wire colors and GPIO numbers come from ../hardware.js (same table as the firmware).
 */

// ESP32 DevKit (30-pin) header order, starting at the USB end of the board.
// Back row = left column of the board, front row = right column.
const BACK_ROW = ['VIN', 'GND', '13', '12', '14', '27', '26', '25', '33', '32', '35', '34', 'VN', 'VP', 'EN'];
const FRONT_ROW = ['3V3', 'GND', '15', '2', '4', '16', '17', '5', '18', '19', '21', 'RX0', 'TX0', '22', '23'];

const BOARD_TOP = 1.0;          // breadboard surface height
const ESP_CENTER_X = -7.0;
const PIN_PITCH = 0.62;
const HOLE_Z = 3.0;             // breadboard hole row used next to each ESP32 header row
const AMP_PINS = ['LRC', 'BCLK', 'DIN', 'GAIN', 'SD', 'GND', 'VIN'];
const AMP_CENTER = new THREE.Vector3(5.0, 1.75, -3.4);

export class BreadboardModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "BreadboardCircuit";

    this.interactivePushbuttons = [];
    this.pushbuttonsMap = {};
    this.wires = [];

    this.initMaterials();
    this.buildBreadboard();
    this.buildESP32Board();
    this.buildUsbPower();
    this.buildAmplifier();
    this.buildMiniSpeaker();
    this.buildStatusLed();
    this.buildPushbuttons();
    this.buildWires();

    this.scene.add(this.group);
  }

  initMaterials() {
    this.breadboardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });
    this.pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.2 });
    this.ampPcbMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.1 });
    this.shieldMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });
    this.metalPinMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.85 });
    this.goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.8 });
    this.headerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    this.edgeLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1, transparent: true, opacity: 0.6 });
  }

  addEdgeLines(mesh, color = 0x94a3b8, threshold = 26) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, threshold);
    const lineMat = this.edgeLineMat.clone();
    lineMat.color.setHex(color);
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);
    return line;
  }

  // Flat text label lying on a surface (canvas texture on a plane)
  makeLabel(text, { width = 1.2, height = 0.5, color = '#334155', bg = null, font = 'bold 40px monospace' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = Math.round(256 * height / width);
    const ctx = canvas.getContext('2d');
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  buildBreadboard() {
    this.boardGroup = new THREE.Group();

    // Full-size breadboard (830 tie-points class)
    const width = 30;
    const depth = 10;
    const height = BOARD_TOP;

    const boardGeom = new THREE.BoxGeometry(width, height, depth);
    const boardMesh = new THREE.Mesh(boardGeom, this.breadboardMat);
    boardMesh.position.y = height / 2;
    boardMesh.castShadow = true;
    boardMesh.receiveShadow = true;
    this.addEdgeLines(boardMesh);
    this.boardGroup.add(boardMesh);

    const faceTex = this.createBreadboardFaceTexture();
    const faceGeom = new THREE.PlaneGeometry(width * 0.98, depth * 0.96);
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 });
    const faceMesh = new THREE.Mesh(faceGeom, faceMat);
    faceMesh.rotation.x = -Math.PI / 2;
    faceMesh.position.y = height + 0.01;
    this.boardGroup.add(faceMesh);

    this.group.add(this.boardGroup);
  }

  createBreadboardFaceTexture() {
    const W = 2048, H = 683;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Power rails: red (+) and blue (-) at the back and at the front
    const rails = [[40, '#ef4444'], [95, '#3b82f6'], [H - 95, '#3b82f6'], [H - 40, '#ef4444']];
    ctx.lineWidth = 5;
    rails.forEach(([y, color]) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(90, y + (y < H / 2 ? -14 : 14));
      ctx.lineTo(W - 90, y + (y < H / 2 ? -14 : 14));
      ctx.stroke();
    });

    // Center channel
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(70, H / 2 - 9, W - 140, 18);

    // Tie-point holes
    ctx.fillStyle = '#475569';
    const cols = 60;
    const colStep = (W - 200) / cols;
    for (let c = 0; c < cols; c++) {
      const x = 100 + c * colStep;
      rails.forEach(([y]) => ctx.fillRect(x - 4, y - 4, 8, 8));
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(x - 4, 150 + r * 30 - 4, 8, 8);
        ctx.fillRect(x - 4, H / 2 + 42 + r * 30 - 4, 8, 8);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  // X position of header pin index i (0 = USB end)
  pinX(i) {
    return ESP_CENTER_X - 7 * PIN_PITCH + i * PIN_PITCH;
  }

  // Breadboard hole next to a named ESP32 pin, e.g. '23', 'VIN'
  espHole(label) {
    let i = FRONT_ROW.indexOf(label);
    if (i >= 0) return [this.pinX(i), BOARD_TOP + 0.02, HOLE_Z];
    i = BACK_ROW.indexOf(label);
    if (i >= 0) return [this.pinX(i), BOARD_TOP + 0.02, -HOLE_Z];
    throw new Error(`Unknown ESP32 pin ${label}`);
  }

  buildESP32Board() {
    this.espGroup = new THREE.Group();
    this.espGroup.name = "ESP32_DevBoard";

    const pcbW = 11.0, pcbD = 5.2, pcbH = 0.22;
    const pcbGeom = new THREE.BoxGeometry(pcbW, pcbH, pcbD);
    const pcb = new THREE.Mesh(pcbGeom, this.pcbMat);
    pcb.position.set(ESP_CENTER_X, 1.9, 0);
    pcb.castShadow = true;
    this.addEdgeLines(pcb, 0x38bdf8);
    this.espGroup.add(pcb);

    // Silkscreen with pin labels
    const silk = new THREE.Mesh(
      new THREE.PlaneGeometry(pcbW * 0.98, pcbD * 0.96),
      new THREE.MeshBasicMaterial({ map: this.createESP32SilkscreenTexture(), transparent: true, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    silk.rotation.x = -Math.PI / 2;
    silk.position.y = pcbH / 2 + 0.01;
    pcb.add(silk);

    // WROOM module: metal shield can + antenna area at the far (+X) end
    const shield = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 3.0), this.shieldMat);
    shield.position.set(2.2, 0.28, 0);
    this.addEdgeLines(shield, 0x64748b);
    pcb.add(shield);
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 3.0), this.pcbMat);
    antenna.position.set(4.6, 0.15, 0);
    this.addEdgeLines(antenna, 0x38bdf8);
    pcb.add(antenna);

    // USB connector at the -X end, plus BOOT/EN buttons
    const usb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.2), this.metalPinMat);
    usb.position.set(-pcbW / 2 + 0.4, 0.3, 0);
    pcb.add(usb);
    this.usbPortWorld = new THREE.Vector3(ESP_CENTER_X - pcbW / 2 - 0.1, 2.2, 0);
    [-0.9, 0.9].forEach(z => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), this.headerMat);
      b.position.set(-pcbW / 2 + 1.6, 0.2, z);
      pcb.add(b);
    });

    // Header rows: black plastic strip + pins going down into the breadboard
    const stripGeom = new THREE.BoxGeometry(15 * PIN_PITCH, 0.5, 0.5);
    const pinGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6);
    [2.2, -2.2].forEach(z => {
      const strip = new THREE.Mesh(stripGeom, this.headerMat);
      strip.position.set(ESP_CENTER_X, 1.5, z);
      this.espGroup.add(strip);
      for (let i = 0; i < 15; i++) {
        const pin = new THREE.Mesh(pinGeom, this.metalPinMat);
        pin.position.set(this.pinX(i), 1.35, z);
        this.espGroup.add(pin);
      }
    });

    this.group.add(this.espGroup);
  }

  createESP32SilkscreenTexture() {
    const W = 1100, H = 520;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const used = {};
    KEYS.forEach(k => { used[String(k.gpio)] = k.css; });
    used[String(I2S_PINS.bclk)] = '#38bdf8';
    used[String(I2S_PINS.lrc)] = '#38bdf8';
    used[String(I2S_PINS.din)] = '#38bdf8';
    used[String(LED_GPIO)] = '#facc15';
    used.VIN = '#ef4444';
    used.GND = '#e2e8f0';

    const step = (15 * PIN_PITCH / 11.0 * 0.98) * W / 15;
    const x0 = W / 2 - 7 * step;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px monospace';
    const drawRow = (row, yPad, yText) => {
      row.forEach((label, i) => {
        const x = x0 + i * step;
        ctx.beginPath();
        ctx.arc(x, yPad, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.fillStyle = used[label] || '#64748b';
        ctx.fillText(/^\d+$/.test(label) ? `D${label}` : label, x, yText);
      });
    };
    drawRow(BACK_ROW, 38, 78);
    drawRow(FRONT_ROW, H - 38, H - 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('ESP32 DEVKIT', 330, H / 2 - 10);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '22px monospace';
    ctx.fillText('WROOM-32 · 4MB', 330, H / 2 + 28);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  buildUsbPower() {
    this.usbGroup = new THREE.Group();
    this.usbGroup.name = "USB_Power";

    // 5 V USB wall adapter off the left edge of the breadboard
    const adapter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), this.breadboardMat);
    adapter.position.set(-18.5, 1.1, 0);
    adapter.castShadow = true;
    this.addEdgeLines(adapter, 0x64748b);
    this.usbGroup.add(adapter);
    const label = this.makeLabel('USB 5V', { width: 2.2, height: 0.8, color: '#0f172a' });
    label.position.set(-18.5, 2.22, 0);
    this.usbGroup.add(label);

    // Cable from the adapter to the ESP32 USB connector
    const end = this.usbPortWorld.clone();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-17.2, 1.4, 0),
      new THREE.Vector3(-16.0, 0.3, 0.6),
      new THREE.Vector3(-14.5, 0.25, 0.4),
      new THREE.Vector3(end.x - 1.2, end.y, 0),
      end
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.16, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }));
    cable.castShadow = true;
    this.usbGroup.add(cable);
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    plug.position.set(end.x - 0.4, end.y, 0);
    this.usbGroup.add(plug);

    this.group.add(this.usbGroup);
  }

  // Position of an amplifier header pin (where the wire lands)
  ampPin(label) {
    const j = AMP_PINS.indexOf(label);
    return [AMP_CENTER.x - 1.5 + j * 0.5, AMP_CENTER.y + 0.35, AMP_CENTER.z + 1.0];
  }

  buildAmplifier() {
    this.ampGroup = new THREE.Group();
    this.ampGroup.name = "MAX98357A";

    const pcbW = 4.0, pcbD = 2.8;
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(pcbW, 0.2, pcbD), this.ampPcbMat);
    pcb.position.copy(AMP_CENTER);
    pcb.castShadow = true;
    this.addEdgeLines(pcb, 0x60a5fa);
    this.ampGroup.add(pcb);

    // Amp chip
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), this.headerMat);
    chip.position.set(0, 0.18, -0.1);
    pcb.add(chip);

    // Header pins along the front edge (towards the ESP32)
    const pinGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
    AMP_PINS.forEach((label, j) => {
      const pin = new THREE.Mesh(pinGeom, this.metalPinMat);
      pin.position.set(-1.5 + j * 0.5, -0.2, 1.0);
      pcb.add(pin);
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 0.4), this.headerMat);
    strip.position.set(0, -0.3, 1.0);
    pcb.add(strip);

    // Pin labels
    const labels = document.createElement('canvas');
    labels.width = 512;
    labels.height = 96;
    const ctx = labels.getContext('2d');
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    AMP_PINS.forEach((label, j) => {
      ctx.fillStyle = ['LRC', 'BCLK', 'DIN'].includes(label) ? '#38bdf8' : label === 'VIN' ? '#f87171' : '#e2e8f0';
      ctx.fillText(label, 256 + (-1.5 + j * 0.5) * 128, 60);
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('MAX98357A', 256, 20);
    const lblTex = new THREE.CanvasTexture(labels);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(pcbW, 0.75),
      new THREE.MeshBasicMaterial({ map: lblTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(0, 0.11, 0.45);
    pcb.add(lbl);

    // Green 2-pole screw terminal for the speaker at the back edge
    const term = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }));
    term.position.set(0.8, 0.5, -0.9);
    this.addEdgeLines(term, 0x14532d);
    pcb.add(term);
    [-0.4, 0.4].forEach(x => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), this.metalPinMat);
      screw.position.set(x, 0.42, 0);
      term.add(screw);
    });
    this.ampTerminalWorld = [
      new THREE.Vector3(AMP_CENTER.x + 0.4, AMP_CENTER.y + 0.6, AMP_CENTER.z - 1.3),
      new THREE.Vector3(AMP_CENTER.x + 1.2, AMP_CENTER.y + 0.6, AMP_CENTER.z - 1.3)
    ];

    this.group.add(this.ampGroup);
  }

  buildMiniSpeaker() {
    this.speakerGroup = new THREE.Group();
    this.speakerGroup.name = "Speaker_8ohm";

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 }));
    rim.position.y = 0.2;
    rim.castShadow = true;
    this.addEdgeLines(rim, 0x0ea5e9);
    this.speakerGroup.add(rim);

    const coneGeom = new THREE.ConeGeometry(1.6, 0.35, 32, 1, true);
    coneGeom.rotateX(Math.PI);
    const cone = new THREE.Mesh(coneGeom, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.3 }));
    cone.position.y = 0.25;
    this.speakerGroup.add(cone);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }));
    cap.position.y = 0.28;
    cap.scale.y = 0.4;
    this.speakerGroup.add(cap);

    const tabGeom = new THREE.BoxGeometry(0.3, 0.05, 0.4);
    [-0.6, 0.6].forEach(x => {
      const tab = new THREE.Mesh(tabGeom, this.goldMat);
      tab.position.set(x, 0.05, -1.9);
      this.speakerGroup.add(tab);
    });

    const label = this.makeLabel('8Ω', { width: 1.0, height: 0.5, color: '#475569' });
    label.position.set(0, 0.03, 2.4);
    this.speakerGroup.add(label);

    this.speakerGroup.position.set(11.5, BOARD_TOP, -1.8);
    this.group.add(this.speakerGroup);
  }

  buildStatusLed() {
    this.ledGroup = new THREE.Group();
    this.ledGroup.name = "StatusLED";

    // Resistor (220-330 ohm) lying on the board
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0xe7d3a8, roughness: 0.6 }));
    body.rotation.z = Math.PI / 2;
    body.position.set(-2.0, BOARD_TOP + 0.25, -3.6);
    this.ledGroup.add(body);
    [0xf97316, 0xf97316, 0x92400e].forEach((c, i) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), new THREE.MeshStandardMaterial({ color: c }));
      band.position.y = -0.25 + i * 0.2;
      body.add(band);
    });
    const leadGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
    const lead = new THREE.Mesh(leadGeom, this.metalPinMat);
    lead.rotation.z = Math.PI / 2;
    lead.position.set(-2.0, BOARD_TOP + 0.25, -3.6);
    this.ledGroup.add(lead);

    // LED (5 mm dome)
    this.ledMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x000000, roughness: 0.2, transparent: true, opacity: 0.9 });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), this.ledMat);
    dome.position.set(-0.4, BOARD_TOP + 0.55, -3.6);
    this.ledGroup.add(dome);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.ledMat);
    top.position.y = 0.25;
    dome.add(top);
    [-0.1, 0.1].forEach(dx => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), this.metalPinMat);
      leg.position.set(-0.4 + dx, BOARD_TOP + 0.15, -3.6);
      this.ledGroup.add(leg);
    });

    this.group.add(this.ledGroup);
  }

  buttonX(i) {
    return -12.4 + i * 2.25;
  }

  buildPushbuttons() {
    this.buttonsGroup = new THREE.Group();
    this.buttonsGroup.name = "KeyButtons";

    const bodyGeom = new THREE.BoxGeometry(1.2, 0.6, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
    const actuatorGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    const legGeom = new THREE.BoxGeometry(0.1, 0.5, 0.1);

    KEYS.forEach((k, i) => {
      const btnGroup = new THREE.Group();
      btnGroup.name = `KeyButton_${k.key}`;

      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.3;
      body.castShadow = true;
      this.addEdgeLines(body, 0x64748b);
      btnGroup.add(body);

      const actuator = new THREE.Mesh(actuatorGeom, new THREE.MeshStandardMaterial({ color: k.color, roughness: 0.2 }));
      actuator.position.y = 0.7;
      btnGroup.add(actuator);

      [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, this.metalPinMat);
        leg.position.set(lx, -0.15, lz);
        btnGroup.add(leg);
      });

      // Key number printed on the board in front of the button
      const label = this.makeLabel(k.key, { width: 0.8, height: 0.8, color: k.css, font: 'bold 150px sans-serif' });
      label.position.set(0, 0.02, 1.15);
      btnGroup.add(label);

      btnGroup.position.set(this.buttonX(i), BOARD_TOP, 3.4);

      actuator.userData = {
        isBreadboardButton: true,
        keyChar: k.key,
        gpio: k.gpio,
        group: btnGroup
      };

      this.interactivePushbuttons.push(actuator);
      this.pushbuttonsMap[k.key] = actuator;
      this.buttonsGroup.add(btnGroup);
    });

    this.group.add(this.buttonsGroup);
  }

  buildWires() {
    this.wiresGroup = new THREE.Group();
    this.wiresGroup.name = "Jumpers";

    const I2S_COLOR = { bclk: 0x0ea5e9, lrc: 0x0369a1, din: 0x22d3ee };
    const specs = [
      // Power for the amplifier: ESP32 5V (VIN) and GND
      { color: 0xef4444, start: this.espHole('VIN'), end: this.ampPin('VIN'), arch: 3.4, name: 'VIN_5V_to_AMP' },
      { color: 0x1e293b, start: this.espHole('GND'), end: this.ampPin('GND'), arch: 3.0, name: 'GND_to_AMP' },
      // I2S
      { color: I2S_COLOR.bclk, start: this.espHole(String(I2S_PINS.bclk)), end: this.ampPin('BCLK'), arch: 2.6, name: `GPIO${I2S_PINS.bclk}_BCLK` },
      { color: I2S_COLOR.lrc, start: this.espHole(String(I2S_PINS.lrc)), end: this.ampPin('LRC'), arch: 2.3, name: `GPIO${I2S_PINS.lrc}_LRC` },
      { color: I2S_COLOR.din, start: this.espHole(String(I2S_PINS.din)), end: this.ampPin('DIN'), arch: 2.0, name: `GPIO${I2S_PINS.din}_DIN` },
      // LED through its resistor
      { color: 0xfacc15, start: this.espHole(String(LED_GPIO)), end: [-2.9, BOARD_TOP + 0.25, -3.6], arch: 1.2, name: `GPIO${LED_GPIO}_LED` },
      // LED cathode to the back GND rail
      { color: 0x1e293b, start: [-0.3, BOARD_TOP + 0.02, -3.6], end: [-0.3, BOARD_TOP + 0.02, -4.3], arch: 0.5, name: 'LED_GND' },
      // Speaker from the amp terminal
      { color: 0xdc2626, start: this.ampTerminalWorld[0].toArray(), end: [10.9, BOARD_TOP + 0.1, -3.7], arch: 0.8, name: 'SPK_plus' },
      { color: 0x111827, start: this.ampTerminalWorld[1].toArray(), end: [12.1, BOARD_TOP + 0.1, -3.7], arch: 0.6, name: 'SPK_minus' }
    ];

    // One wire per key: GPIO -> button, and the button's other leg to the front GND rail
    KEYS.forEach((k, i) => {
      const bx = this.buttonX(i);
      specs.push({
        color: k.color,
        start: this.espHole(String(k.gpio)),
        end: [bx - 0.5, BOARD_TOP + 0.02, 2.75],
        arch: 1.0 + (i % 5) * 0.35 + (FRONT_ROW.includes(String(k.gpio)) ? 0 : 1.6),
        name: `GPIO${k.gpio}_KEY${k.key}`
      });
      specs.push({
        color: 0x1e293b,
        start: [bx + 0.5, BOARD_TOP + 0.02, 4.05],
        end: [bx + 0.5, BOARD_TOP + 0.02, 4.65],
        arch: 0.35,
        name: `KEY${k.key}_GND`
      });
    });

    specs.forEach(spec => this.createArchWire(spec));
    this.group.add(this.wiresGroup);
  }

  // Jumper wire that rises from both ends and arches over the board
  createArchWire({ color, start, end, arch, name }) {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().lerpVectors(p0, p2, 0.5);
    mid.y = Math.max(p0.y, p2.y) + arch;
    const rise = Math.min(0.6, arch * 0.6);

    const curve = new THREE.CatmullRomCurve3([
      p0,
      new THREE.Vector3(p0.x, p0.y + rise, p0.z),
      mid,
      new THREE.Vector3(p2.x, p2.y + rise, p2.z),
      p2
    ]);

    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.07, 8, false),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 })
    );
    wire.name = name;
    wire.castShadow = true;
    this.wiresGroup.add(wire);
    this.wires.push(wire);
  }

  animateButtonPress(keyChar) {
    const btn = this.pushbuttonsMap[keyChar];
    if (!btn) return;
    btn.position.y = 0.45;
    setTimeout(() => { btn.position.y = 0.7; }, 120);
  }

  // LED lit while a clip plays
  setLed(on) {
    if (this.ledMat) {
      this.ledMat.emissive.setHex(on ? 0xef4444 : 0x000000);
      this.ledMat.emissiveIntensity = on ? 1.2 : 0;
    }
  }
}
