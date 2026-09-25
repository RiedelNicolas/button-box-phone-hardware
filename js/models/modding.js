import * as THREE from 'https://esm.sh/three@0.160.0';
import { KEYS } from '../hardware.js';

/**
 * 3D model of the internal layout of the converted phone (exploded / X-ray view):
 * - Phone case tray with a USB cable entry on the rear panel (always-on USB power)
 * - ESP32 dev board and MAX98357A amplifier mounted on standoffs
 * - Wire bundle from the 10 keypad buttons to the ESP32 GPIOs
 * - Speaker lines up the handset cord to the 8 ohm speaker in the earpiece
 * - Status LED on the front of the case
 */

export class ModdingModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "ModdingArchitecture";

    this.initMaterials();
    this.buildExplodedChassis();
    this.buildInternalBoards();
    this.buildKeypadButtons();
    this.buildHandsetCutaway();
    this.buildWiringRoutes();

    this.scene.add(this.group);
  }

  initMaterials() {
    // Semi-transparent phantom chassis
    this.chassisMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.35, roughness: 0.2, metalness: 0.1 });
    this.cutawayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45, roughness: 0.3 });
    this.pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.2 });
    this.ampPcbMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.1 });
    this.silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    this.edgeLineMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.8 });
  }

  addEdgeLines(mesh, color = 0x64748b) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
    const lineMat = this.edgeLineMat.clone();
    lineMat.color.setHex(color);
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);
    return line;
  }

  buildExplodedChassis() {
    this.chassisGroup = new THREE.Group();

    // Bottom chassis tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 19), this.chassisMat);
    tray.position.set(0, 0.6, 0);
    this.addEdgeLines(tray, 0x94a3b8);
    this.chassisGroup.add(tray);

    // USB cable entering through the rear panel (grommet + cable stub)
    const grommet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16).rotateX(Math.PI / 2), this.silverMat);
    grommet.position.set(-4.0, 1.4, -9.5);
    this.chassisGroup.add(grommet);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.0, 1.4, -13.0),
        new THREE.Vector3(-4.0, 1.4, -11.0),
        new THREE.Vector3(-4.0, 1.4, -9.5)
      ]), 16, 0.18, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    this.chassisGroup.add(cable);

    // Status LED on the front edge
    this.ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), this.ledMat);
    led.position.set(6.5, 1.5, 9.4);
    this.chassisGroup.add(led);

    this.group.add(this.chassisGroup);
  }

  buildInternalBoards() {
    this.boardsGroup = new THREE.Group();
    this.boardsGroup.name = "InternalBoards";

    const standGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
    const addStandoffs = (cx, cz, hx, hz) => {
      [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([sx, sz]) => {
        const stand = new THREE.Mesh(standGeom, this.silverMat);
        stand.position.set(cx + sx, 1.6, cz + sz);
        this.boardsGroup.add(stand);
      });
    };

    // ESP32 dev board
    const esp = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 2.8), this.pcbMat);
    esp.position.set(-3.0, 2.1, -5.0);
    this.addEdgeLines(esp, 0x38bdf8);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.6), this.silverMat);
    shield.position.set(1.3, 0.22, 0);
    esp.add(shield);
    this.boardsGroup.add(esp);
    addStandoffs(-3.0, -5.0, 2.4, 1.1);

    // MAX98357A amplifier
    const amp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.8), this.ampPcbMat);
    amp.position.set(3.5, 2.1, -5.0);
    this.addEdgeLines(amp, 0x60a5fa);
    this.boardsGroup.add(amp);
    addStandoffs(3.5, -5.0, 0.8, 0.6);

    this.group.add(this.boardsGroup);
  }

  buildKeypadButtons() {
    // The 10 rubber push buttons under the keypad (keys 1-9 in a 3x3 grid, 0 below 8)
    this.keysGroup = new THREE.Group();
    const geom = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16);
    this.keyPositions = {};
    KEYS.forEach(k => {
      const n = k.key === '0' ? 10 : parseInt(k.key, 10);
      const col = k.key === '0' ? 1 : (n - 1) % 3;
      const row = k.key === '0' ? 3 : Math.floor((n - 1) / 3);
      const pos = new THREE.Vector3(1.5 + col * 1.6, 1.4, 1.0 + row * 1.6);
      const btn = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: k.color, roughness: 0.5 }));
      btn.position.copy(pos);
      this.keysGroup.add(btn);
      this.keyPositions[k.key] = pos;
    });
    this.group.add(this.keysGroup);
  }

  buildHandsetCutaway() {
    this.handsetCutaway = new THREE.Group();
    this.handsetCutaway.position.set(11.5, 5.0, 0);
    this.handsetCutaway.rotation.set(0.3, -0.4, 0.2);

    const shellGeom = new THREE.CylinderGeometry(2.4, 2.4, 15, 24, 1, true, 0, Math.PI);
    const shell = new THREE.Mesh(shellGeom, this.cutawayMat);
    this.addEdgeLines(shell, 0x0ea5e9);
    this.handsetCutaway.add(shell);

    // 8 ohm speaker in the earpiece chamber
    const spk = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.7 }));
    spk.position.set(0, 5.0, 0);
    spk.rotation.z = Math.PI / 2;
    this.addEdgeLines(spk, 0x38bdf8);
    this.handsetCutaway.add(spk);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    cone.position.set(0.2, 5.0, 0);
    cone.rotation.z = -Math.PI / 2;
    this.handsetCutaway.add(cone);

    this.group.add(this.handsetCutaway);
  }

  buildWiringRoutes() {
    this.wiringGroup = new THREE.Group();

    // 1. USB 5 V into the ESP32 board
    this.addRoute([[-4.0, 1.4, -9.5], [-4.8, 1.9, -7.5], [-5.6, 2.2, -5.0]], 0xef4444, "USB_5V_to_ESP32");

    // 2. ESP32 5V/GND and I2S (BCLK, LRC, DIN) to the amplifier
    this.addRoute([[-0.2, 2.2, -5.4], [1.2, 2.8, -5.6], [2.4, 2.2, -5.4]], 0xef4444, "VIN_to_AMP");
    this.addRoute([[-0.2, 2.2, -5.0], [1.2, 2.9, -5.0], [2.4, 2.2, -5.0]], 0x0ea5e9, "I2S_BCLK");
    this.addRoute([[-0.2, 2.2, -4.7], [1.2, 3.0, -4.6], [2.4, 2.2, -4.7]], 0x0369a1, "I2S_LRC");
    this.addRoute([[-0.2, 2.2, -4.4], [1.2, 3.1, -4.2], [2.4, 2.2, -4.4]], 0x22d3ee, "I2S_DIN");

    // 3. Speaker lines from the amplifier through the handset cord
    this.addRoute([[4.6, 2.2, -5.0], [7.5, 2.2, -2.0], [8.5, 3.5, 3.0], [11.5, 8.5, 0.5]], 0x0ea5e9, "Speaker_Lines");

    // 4. One wire per keypad button to its GPIO on the ESP32
    KEYS.forEach((k, i) => {
      const p = this.keyPositions[k.key];
      this.addRoute([
        [p.x, p.y + 0.2, p.z],
        [p.x - 1.0, 2.4, p.z - 2.0],
        [-3.0 + (i - 4.5) * 0.35, 2.6, -2.6],
        [-3.0 + (i - 4.5) * 0.45, 2.2, -3.7]
      ], k.color, `Key${k.key}_GPIO${k.gpio}`, 0.05);
    });

    // 5. Common GND bus for the buttons
    this.addRoute([[-5.6, 2.2, -4.2], [-1.0, 1.6, 0.0], [1.5, 1.5, 5.8]], 0x1e293b, "GND_Bus");

    // 6. LED wire to the front of the case
    this.addRoute([[-1.0, 2.2, -3.8], [3.0, 1.8, 4.0], [6.5, 1.5, 9.2]], 0xfacc15, "LED");

    this.group.add(this.wiringGroup);
  }

  addRoute(pointsArray, color, name, radius = 0.09) {
    const points = pointsArray.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    const geom = new THREE.TubeGeometry(curve, 32, radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.2 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = name;
    this.wiringGroup.add(mesh);
  }
}
