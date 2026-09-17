import * as THREE from 'https://esm.sh/three@0.160.0';

/**
 * Procedural 3D model of the Breadboard PoC Circuit (Fase 1).
 * Features:
 * - 400-point breadboard with realistic tie-point grid and power rails (+/-)
 * - MB102 power supply module with DC barrel jack, power switch, and 5V jumpers
 * - JQ6500-16P MP3 module straddling the central DIP channel
 * - 5 tactile pushbuttons (6x6mm) wired to pins K1-K5
 * - Slim 8Ω 1W mini speaker connected to SPK+ and SPK-
 * - Color-coded Dupont jumper wires with catenary curves
 */

export class BreadboardModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "BreadboardPoC";

    this.interactivePushbuttons = [];
    this.pushbuttonsMap = {};
    this.wires = [];
    this.isCircuitPowered = true;

    this.initMaterials();
    this.buildBreadboard();
    this.buildMB102Module();
    this.buildJQ6500Module();
    this.buildPushbuttons();
    this.buildMiniSpeaker();
    this.buildDupontJumpers();

    this.scene.add(this.group);
  }

  initMaterials() {
    this.breadboardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05
    });

    this.pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Tech dark blue/black PCB
      roughness: 0.3,
      metalness: 0.2
    });

    this.mb102PcbMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Classic MB102 royal blue PCB
      roughness: 0.4,
      metalness: 0.1
    });

    this.metalPinMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.2,
      metalness: 0.85
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.8
    });

    this.edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      linewidth: 1,
      transparent: true,
      opacity: 0.6
    });
  }

  addEdgeLines(mesh, color = 0x94a3b8, threshold = 26) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, threshold);
    const lineMat = this.edgeLineMat.clone();
    lineMat.color.setHex(color);
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);
    return line;
  }

  buildBreadboard() {
    this.boardGroup = new THREE.Group();

    // 400-Point Breadboard: approx 16.5cm x 5.5cm x 0.9cm
    const width = 22;
    const depth = 8.5;
    const height = 1.0;

    const boardGeom = new THREE.BoxGeometry(width, height, depth);
    const boardMesh = new THREE.Mesh(boardGeom, this.breadboardMat);
    boardMesh.position.y = height / 2;
    boardMesh.castShadow = true;
    boardMesh.receiveShadow = true;
    this.addEdgeLines(boardMesh);
    this.boardGroup.add(boardMesh);

    // Central trough/groove (standard 0.3" DIP divider)
    const troughGeom = new THREE.BoxGeometry(width * 0.85, 0.2, 0.6);
    const troughMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
    const trough = new THREE.Mesh(troughGeom, troughMat);
    trough.position.set(1.5, height, 0);
    this.boardGroup.add(trough);

    // Realistic tie-point hole texture and colored power bus lines
    const faceTex = this.createBreadboardFaceTexture();
    const faceGeom = new THREE.PlaneGeometry(width * 0.96, depth * 0.94);
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const faceMesh = new THREE.Mesh(faceGeom, faceMat);
    faceMesh.rotation.x = -Math.PI / 2;
    faceMesh.position.y = height + 0.01;
    this.boardGroup.add(faceMesh);

    this.group.add(this.boardGroup);
  }

  createBreadboardFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 384);

    // Top power bus lines: Blue (-) and Red (+)
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444'; // Red (+)
    ctx.beginPath();
    ctx.moveTo(120, 28);
    ctx.lineTo(980, 28);
    ctx.stroke();

    ctx.strokeStyle = '#3b82f6'; // Blue (-)
    ctx.beginPath();
    ctx.moveTo(120, 68);
    ctx.lineTo(980, 68);
    ctx.stroke();

    // Bottom power bus lines
    ctx.strokeStyle = '#3b82f6'; // Blue (-)
    ctx.beginPath();
    ctx.moveTo(120, 316);
    ctx.lineTo(980, 316);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444'; // Red (+)
    ctx.beginPath();
    ctx.moveTo(120, 356);
    ctx.lineTo(980, 356);
    ctx.stroke();

    // Central trough divider line
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(100, 186, 890, 12);

    // Draw tie-point holes grid
    ctx.fillStyle = '#475569';
    const cols = 30;
    const colStep = (960 - 140) / cols;

    for (let c = 0; c < cols; c++) {
      const x = 140 + c * colStep;
      // Top power rails holes
      ctx.fillRect(x - 2.5, 25.5, 5, 5);
      ctx.fillRect(x - 2.5, 65.5, 5, 5);

      // Terminal rows A, B, C, D, E
      for (let r = 0; r < 5; r++) {
        const y = 98 + r * 16;
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }

      // Terminal rows F, G, H, I, J
      for (let r = 0; r < 5; r++) {
        const y = 212 + r * 16;
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }

      // Bottom power rails holes
      ctx.fillRect(x - 2.5, 313.5, 5, 5);
      ctx.fillRect(x - 2.5, 353.5, 5, 5);
    }

    // Coordinates silkscreen (numbers 1 to 30)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    for (let c = 0; c < cols; c += 5) {
      const x = 140 + c * colStep;
      ctx.fillText((c + 1).toString(), x, 92);
      ctx.fillText((c + 1).toString(), x, 298);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  buildMB102Module() {
    this.mb102Group = new THREE.Group();
    this.mb102Group.name = "MB102_PowerModule";

    // PCB board spanning the left side of the protoboard
    const pcbGeom = new THREE.BoxGeometry(4.2, 0.25, 8.8);
    const pcbMesh = new THREE.Mesh(pcbGeom, this.mb102PcbMat);
    pcbMesh.position.set(-8.8, 1.3, 0);
    this.addEdgeLines(pcbMesh, 0x60a5fa);
    this.mb102Group.add(pcbMesh);

    // DC Barrel Jack (5.5 x 2.1 mm)
    const jackGeom = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 16);
    const jackMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const jack = new THREE.Mesh(jackGeom, jackMat);
    jack.rotation.z = Math.PI / 2;
    jack.position.set(-1.4, 0.8, -2.4);
    pcbMesh.add(jack);

    // Inner metal pin of barrel jack
    const pinGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const innerPin = new THREE.Mesh(pinGeom, this.goldMat);
    innerPin.rotation.z = Math.PI / 2;
    innerPin.position.set(-0.2, 0, 0);
    jack.add(innerPin);

    // Power Push Switch (self-locking)
    const switchBaseGeom = new THREE.BoxGeometry(0.9, 0.6, 0.9);
    const switchBaseMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const switchBase = new THREE.Mesh(switchBaseGeom, switchBaseMat);
    switchBase.position.set(0.6, 0.4, -2.4);

    const switchBtnGeom = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const switchBtnMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Red power button
    this.mb102SwitchBtn = new THREE.Mesh(switchBtnGeom, switchBtnMat);
    this.mb102SwitchBtn.position.y = 0.5;
    switchBase.add(this.mb102SwitchBtn);
    pcbMesh.add(switchBase);

    // USB-A output port
    const usbGeom = new THREE.BoxGeometry(1.4, 0.7, 1.2);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const usbPort = new THREE.Mesh(usbGeom, usbMat);
    usbPort.position.set(-1.0, 0.5, 2.2);
    pcbMesh.add(usbPort);

    // Power LED (Green 3mm LED)
    const ledGeom = new THREE.SphereGeometry(0.25, 16, 16);
    this.mb102LedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Bright green when ON
    this.mb102Led = new THREE.Mesh(ledGeom, this.mb102LedMat);
    this.mb102Led.position.set(0.8, 0.35, -0.6);
    pcbMesh.add(this.mb102Led);

    // Voltage Selection Jumpers (set to 5V)
    const jumperBaseGeom = new THREE.BoxGeometry(0.8, 0.5, 1.2);
    const jumperBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    [-3.2, 3.2].forEach(z => {
      const jBase = new THREE.Mesh(jumperBaseGeom, jumperBaseMat);
      jBase.position.set(0.8, 0.35, z);

      // Yellow jumper shunt
      const shuntGeom = new THREE.BoxGeometry(0.4, 0.4, 0.5);
      const shuntMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
      const shunt = new THREE.Mesh(shuntGeom, shuntMat);
      shunt.position.set(0, 0.35, 0.2); // Positioned on 5V pins
      jBase.add(shunt);

      pcbMesh.add(jBase);
    });

    this.group.add(this.mb102Group);
  }

  buildJQ6500Module() {
    this.jq6500Group = new THREE.Group();
    this.jq6500Group.name = "JQ6500-16P";

    // JQ6500-16P DIP PCB (approx 2.4cm x 1.8cm)
    const pcbWidth = 4.8;
    const pcbDepth = 3.6;
    const pcbHeight = 0.22;

    const pcbGeom = new THREE.BoxGeometry(pcbWidth, pcbHeight, pcbDepth);
    const pcbMesh = new THREE.Mesh(pcbGeom, this.pcbMat);
    pcbMesh.position.set(-2.0, 1.8, 0);
    this.addEdgeLines(pcbMesh, 0x38bdf8);
    this.jq6500Group.add(pcbMesh);

    // Silkscreen pin labels and module branding
    const silkTex = this.createJQ6500SilkscreenTexture();
    const silkGeom = new THREE.PlaneGeometry(pcbWidth * 0.95, pcbDepth * 0.95);
    const silkMat = new THREE.MeshBasicMaterial({
      map: silkTex,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const silkMesh = new THREE.Mesh(silkGeom, silkMat);
    silkMesh.rotation.x = -Math.PI / 2;
    silkMesh.position.y = pcbHeight / 2 + 0.01;
    pcbMesh.add(silkMesh);

    // JQ6500 Main Controller IC Chip (SOIC-24)
    const icGeom = new THREE.BoxGeometry(2.0, 0.3, 1.4);
    const icMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const mainIC = new THREE.Mesh(icGeom, icMat);
    mainIC.position.set(-0.4, 0.22, -0.1);
    pcbMesh.add(mainIC);

    // 16-Mbit SPI Flash Chip (W25Q16 SOIC-8)
    const flashGeom = new THREE.BoxGeometry(1.0, 0.25, 0.9);
    const flashChip = new THREE.Mesh(flashGeom, icMat);
    flashChip.position.set(1.4, 0.2, 0.6);
    pcbMesh.add(flashChip);

    // Micro-USB port on left edge
    const usbGeom = new THREE.BoxGeometry(0.7, 0.4, 1.0);
    const usbPort = new THREE.Mesh(usbGeom, this.metalPinMat);
    usbPort.position.set(-pcbWidth / 2 - 0.2, 0.15, 0);
    pcbMesh.add(usbPort);

    // 16 Through-hole DIP Pins (8 top, 8 bottom)
    const pinGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const pinCols = 8;
    const pinSpacing = (pcbWidth - 0.8) / (pinCols - 1);

    for (let i = 0; i < pinCols; i++) {
      const x = -pcbWidth / 2 + 0.4 + i * pinSpacing;
      // Top row pins (Pins 1..8: VCC, SPK+, SPK-, GND, etc.)
      const pinTop = new THREE.Mesh(pinGeom, this.metalPinMat);
      pinTop.position.set(x, -0.3, -pcbDepth / 2 + 0.3);
      pcbMesh.add(pinTop);

      // Bottom row pins (Pins 9..16: K5, K4, K3, K2, K1, etc.)
      const pinBottom = new THREE.Mesh(pinGeom, this.metalPinMat);
      pinBottom.position.set(x, -0.3, pcbDepth / 2 - 0.3);
      pcbMesh.add(pinBottom);
    }

    this.group.add(this.jq6500Group);
  }

  createJQ6500SilkscreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 384);

    // Board title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('JQ6500-16P', 256, 175);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '16px monospace';
    ctx.fillText('MP3 SOUND MODULE', 256, 205);

    // Top Pin Labels (1-8): VCC, SPK+, SPK-, GND, ...
    ctx.font = 'bold 18px monospace';
    const topPins = ['VCC', 'SPK+', 'SPK-', 'GND', 'ROUT', 'LOUT', 'TX', 'RX'];
    const step = 440 / 7;
    topPins.forEach((label, idx) => {
      const x = 36 + idx * step;
      ctx.fillStyle = (idx === 0) ? '#ef4444' : (idx === 3) ? '#94a3b8' : (idx < 3) ? '#38bdf8' : '#e2e8f0';
      ctx.fillText(label, x, 32);

      // Gold solder pad circle
      ctx.beginPath();
      ctx.arc(x, 48, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    });

    // Bottom Pin Labels (16-9): K1, K2, K3, K4, K5, BUSY, ...
    const bottomPins = ['K1', 'K2', 'K3', 'K4', 'K5', 'BUSY', 'VPP', 'ADKEY'];
    bottomPins.forEach((label, idx) => {
      const x = 36 + idx * step;
      ctx.fillStyle = (idx < 5) ? '#10b981' : '#cbd5e1';
      ctx.fillText(label, x, 360);

      // Gold solder pad circle
      ctx.beginPath();
      ctx.arc(x, 336, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  buildPushbuttons() {
    this.buttonsGroup = new THREE.Group();
    this.buttonsGroup.name = "PoCPushbuttons";

    // 5 Tactile Pushbuttons (6x6x5mm)
    // Placed in breadboard rows corresponding to K1, K2, K3, K4, K5 triggers
    const bodyGeom = new THREE.BoxGeometry(1.2, 0.6, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.3
    });

    const actuatorGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
    const colors = [0x10b981, 0x3b82f6, 0x8b5cf6, 0xf59e0b, 0xef4444]; // Distinct trigger colors

    for (let i = 0; i < 5; i++) {
      const btnGroup = new THREE.Group();
      btnGroup.name = `BreadboardBtn_K${i + 1}`;

      // Metal switch housing
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.3;
      body.castShadow = true;
      this.addEdgeLines(body, 0x64748b);
      btnGroup.add(body);

      // Color plunger actuator
      const actMat = new THREE.MeshStandardMaterial({
        color: colors[i],
        roughness: 0.2
      });
      const actuator = new THREE.Mesh(actuatorGeom, actMat);
      actuator.position.y = 0.7;
      btnGroup.add(actuator);

      // 4 Leg pins
      const legGeom = new THREE.BoxGeometry(0.1, 0.5, 0.1);
      [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, this.metalPinMat);
        leg.position.set(lx, -0.15, lz);
        btnGroup.add(leg);
      });

      // Position on the right side of the breadboard
      const xPos = 2.4 + i * 1.6;
      const zPos = 2.4;
      btnGroup.position.set(xPos, 1.0, zPos);

      // Metadata for click interaction
      actuator.userData = {
        isBreadboardButton: true,
        keyNumber: i + 1,
        keyLabel: `K${i + 1}`,
        group: btnGroup,
        baseY: 1.0
      };

      this.interactivePushbuttons.push(actuator);
      this.pushbuttonsMap[i + 1] = actuator;

      this.buttonsGroup.add(btnGroup);
    }

    this.group.add(this.buttonsGroup);
  }

  buildMiniSpeaker() {
    this.speakerGroup = new THREE.Group();
    this.speakerGroup.name = "PoC_MiniSpeaker";

    // Slim 8 Ohm 1W speaker (placed right above or beside breadboard)
    const rimGeom = new THREE.CylinderGeometry(2.0, 2.0, 0.4, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.y = 0.2;
    rim.castShadow = true;
    this.addEdgeLines(rim, 0x0ea5e9);
    this.speakerGroup.add(rim);

    // Mylar/translucent speaker cone
    const coneGeom = new THREE.ConeGeometry(1.6, 0.35, 32, 1, true);
    coneGeom.rotateX(Math.PI);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vivid cyan diaphragm
      roughness: 0.3,
      metalness: 0.3
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = 0.25;
    this.speakerGroup.add(cone);

    // Center dust cap
    const capGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.y = 0.28;
    cap.scale.y = 0.4;
    this.speakerGroup.add(cap);

    // Solder tabs (+ and -)
    const tabGeom = new THREE.BoxGeometry(0.3, 0.05, 0.4);
    [-0.8, 0.8].forEach((x, idx) => {
      const tab = new THREE.Mesh(tabGeom, this.goldMat);
      tab.position.set(x, 0.05, 1.9);
      this.speakerGroup.add(tab);
    });

    // Position on right-top of breadboard
    this.speakerGroup.position.set(6.8, 1.0, -2.6);
    this.group.add(this.speakerGroup);
  }

  buildDupontJumpers() {
    this.wiresGroup = new THREE.Group();
    this.wiresGroup.name = "DupontJumpers";

    // Color-coded jumper wires:
    // 1. Red (+5V power from MB102 rail to JQ6500 VCC)
    // 2. Black (GND from MB102 rail to JQ6500 GND)
    // 3. SPK+ and SPK- wires from JQ6500 to the mini speaker
    // 4. K1..K5 wires from JQ6500 pins to the 5 pushbuttons
    // 5. GND jumpers connecting buttons to bottom GND rail

    const wireSpecs = [
      // 5V Power Wire (Red)
      {
        color: 0xef4444,
        start: [-6.8, 1.2, -3.4],
        end: [-4.0, 1.9, -1.5],
        sag: -1.2,
        name: "5V_VCC"
      },
      // Common GND Wire (Black)
      {
        color: 0x1e293b,
        start: [-6.8, 1.2, -2.6],
        end: [-2.2, 1.9, -1.5],
        sag: -0.9,
        name: "GND_Main"
      },
      // SPK+ to Speaker (Cyan)
      {
        color: 0x0ea5e9,
        start: [-3.4, 1.9, -1.5],
        end: [6.0, 1.2, -0.8],
        sag: -1.8,
        name: "SPK_Positive"
      },
      // SPK- to Speaker (Slate/Dark Cyan)
      {
        color: 0x0369a1,
        start: [-2.8, 1.9, -1.5],
        end: [7.6, 1.2, -0.8],
        sag: -1.6,
        name: "SPK_Negative"
      },
      // K1 Wire (Green)
      {
        color: 0x10b981,
        start: [-4.0, 1.9, 1.5],
        end: [2.4, 1.4, 2.4],
        sag: -1.4,
        name: "K1_Trigger"
      },
      // K2 Wire (Blue)
      {
        color: 0x3b82f6,
        start: [-3.4, 1.9, 1.5],
        end: [4.0, 1.4, 2.4],
        sag: -1.5,
        name: "K2_Trigger"
      },
      // K3 Wire (Purple)
      {
        color: 0x8b5cf6,
        start: [-2.8, 1.9, 1.5],
        end: [5.6, 1.4, 2.4],
        sag: -1.6,
        name: "K3_Trigger"
      },
      // K4 Wire (Amber)
      {
        color: 0xf59e0b,
        start: [-2.2, 1.9, 1.5],
        end: [7.2, 1.4, 2.4],
        sag: -1.7,
        name: "K4_Trigger"
      },
      // K5 Wire (Rose)
      {
        color: 0xf43f5e,
        start: [-1.6, 1.9, 1.5],
        end: [8.8, 1.4, 2.4],
        sag: -1.8,
        name: "K5_Trigger"
      }
    ];

    wireSpecs.forEach(spec => {
      this.createCatenaryWire(spec);
    });

    this.group.add(this.wiresGroup);
  }

  createCatenaryWire({ color, start, end, sag, name }) {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const p1 = new THREE.Vector3().lerpVectors(p0, p2, 0.5);
    p1.y += sag; // gravity curve or elevation

    const curve = new THREE.CatmullRomCurve3([
      p0,
      new THREE.Vector3(p0.x, p0.y + 0.6, p0.z),
      p1,
      new THREE.Vector3(p2.x, p2.y + 0.6, p2.z),
      p2
    ]);

    const geom = new THREE.TubeGeometry(curve, 36, 0.08, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1
    });

    const wire = new THREE.Mesh(geom, mat);
    wire.name = name;
    wire.castShadow = true;
    this.wiresGroup.add(wire);
    this.wires.push(wire);
  }

  animateButtonPress(keyNumber) {
    const btn = this.pushbuttonsMap[keyNumber];
    if (!btn) return;

    btn.position.y = 0.45; // press down
    setTimeout(() => {
      btn.position.y = 0.7; // spring up
    }, 120);
  }

  setPower(powered) {
    this.isCircuitPowered = powered;
    if (this.mb102LedMat) {
      this.mb102LedMat.color.setHex(powered ? 0x22c55e : 0x475569);
    }
    if (this.mb102SwitchBtn) {
      this.mb102SwitchBtn.position.y = powered ? 0.35 : 0.55;
    }
  }
}
