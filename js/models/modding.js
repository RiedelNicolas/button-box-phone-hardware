import * as THREE from 'https://esm.sh/three@0.160.0';

/**
 * 3D Model for Hardware Modding & Internal Architecture (Fase 2 / Arquitectura Lógica).
 * Shows the internal layout of the converted telephone:
 * - The mechanical hook switch interrupting the 5V line (0µA cut-off)
 * - JQ6500 module secured to the internal phone base
 * - Handset earpiece housing the retrofitted 8Ω mini speaker
 * - Wiring paths with animated signal pulses
 */

export class ModdingModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "ModdingArchitecture";

    this.pulseParticles = [];
    this.isCircuitActive = true;

    this.initMaterials();
    this.buildExplodedChassis();
    this.buildInternalHookSwitch();
    this.buildInternalJQ6500();
    this.buildHandsetCutaway();
    this.buildWiringRoutes();

    this.scene.add(this.group);
  }

  initMaterials() {
    // Semi-transparent phantom chassis
    this.chassisMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.1
    });

    this.cutawayMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3
    });

    this.pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.2
    });

    this.copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2
    });

    this.silverMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.2
    });

    this.edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.8
    });
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
    const trayGeom = new THREE.BoxGeometry(18, 1.2, 19);
    const tray = new THREE.Mesh(trayGeom, this.chassisMat);
    tray.position.set(0, 0.6, 0);
    this.addEdgeLines(tray, 0x94a3b8);
    this.chassisGroup.add(tray);

    // DC Power Jack mounted on rear panel
    const jackGeom = new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16);
    jackGeom.rotateX(Math.PI / 2);
    const jack = new THREE.Mesh(jackGeom, this.silverMat);
    jack.position.set(5.5, 1.4, -9.5);
    this.chassisGroup.add(jack);

    this.group.add(this.chassisGroup);
  }

  buildInternalHookSwitch() {
    this.hookGroup = new THREE.Group();
    this.hookGroup.name = "HookSwitchMechanism";

    // Structural bracket
    const bracketGeom = new THREE.BoxGeometry(3.6, 4.0, 2.2);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const bracket = new THREE.Mesh(bracketGeom, bracketMat);
    bracket.position.set(0, 3.2, -5.5);
    this.addEdgeLines(bracket, 0x0ea5e9);
    this.hookGroup.add(bracket);

    // Spring-loaded rocker lever
    const leverGeom = new THREE.BoxGeometry(4.2, 0.4, 1.2);
    const leverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
    this.rockerLever = new THREE.Mesh(leverGeom, leverMat);
    this.rockerLever.position.set(0, 5.0, -5.5);
    this.hookGroup.add(this.rockerLever);

    // Leaf spring mechanical contacts (Normally Open when pressed down by phone)
    const leafGeom = new THREE.BoxGeometry(1.8, 0.08, 0.6);
    this.contactLeafTop = new THREE.Mesh(leafGeom, this.copperMat);
    this.contactLeafTop.position.set(0, 4.3, -5.5);

    this.contactLeafBottom = new THREE.Mesh(leafGeom, this.copperMat);
    this.contactLeafBottom.position.set(0, 3.9, -5.5);

    this.hookGroup.add(this.contactLeafTop);
    this.hookGroup.add(this.contactLeafBottom);

    // Contact spark / glow indicator
    const glowGeom = new THREE.SphereGeometry(0.22, 16, 16);
    this.contactGlowMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.contactGlow = new THREE.Mesh(glowGeom, this.contactGlowMat);
    this.contactGlow.position.set(0.6, 4.1, -5.5);
    this.hookGroup.add(this.contactGlow);

    this.group.add(this.hookGroup);
  }

  buildInternalJQ6500() {
    this.moduleGroup = new THREE.Group();
    this.moduleGroup.name = "InternalJQ6500";

    // JQ6500 module mounted inside the chassis on standoffs
    const pcbGeom = new THREE.BoxGeometry(5.0, 0.2, 3.8);
    const pcb = new THREE.Mesh(pcbGeom, this.pcbMat);
    pcb.position.set(0, 2.0, 1.5);
    this.addEdgeLines(pcb, 0x38bdf8);
    this.moduleGroup.add(pcb);

    // 4 Standoff pillars
    const standGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
    [[-2.2, -1.6], [2.2, -1.6], [-2.2, 1.6], [2.2, 1.6]].forEach(([sx, sz]) => {
      const stand = new THREE.Mesh(standGeom, this.silverMat);
      stand.position.set(sx, 1.6, sz + 1.5);
      this.moduleGroup.add(stand);
    });

    this.group.add(this.moduleGroup);
  }

  buildHandsetCutaway() {
    this.handsetCutaway = new THREE.Group();
    this.handsetCutaway.position.set(11.5, 5.0, 0);
    this.handsetCutaway.rotation.set(0.3, -0.4, 0.2);

    // Cutaway translucent handset shell
    const shellGeom = new THREE.CylinderGeometry(2.4, 2.4, 15, 24, 1, true, 0, Math.PI);
    const shell = new THREE.Mesh(shellGeom, this.cutawayMat);
    this.addEdgeLines(shell, 0x0ea5e9);
    this.handsetCutaway.add(shell);

    // Mini 8Ω Speaker installed inside the top earpiece chamber
    const spkGeom = new THREE.CylinderGeometry(2.0, 2.0, 0.6, 24);
    const spkMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.7
    });
    const spk = new THREE.Mesh(spkGeom, spkMat);
    spk.position.set(0, 5.0, 0);
    spk.rotation.z = Math.PI / 2;
    this.addEdgeLines(spk, 0x38bdf8);
    this.handsetCutaway.add(spk);

    // Cyan diaphragm cone
    const coneGeom = new THREE.ConeGeometry(1.6, 0.4, 24, 1, true);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.set(0.2, 5.0, 0);
    cone.rotation.z = -Math.PI / 2;
    this.handsetCutaway.add(cone);

    this.group.add(this.handsetCutaway);
  }

  buildWiringRoutes() {
    this.wiringGroup = new THREE.Group();

    // 1. 5V line from DC Jack to Hook Switch Contact (Red)
    this.addRoute([
      [5.5, 1.4, -9.5],
      [5.5, 2.2, -7.0],
      [1.0, 3.8, -5.8]
    ], 0xef4444, "DC_to_HookSwitch");

    // 2. Switched 5V from Hook Switch Contact to JQ6500 VCC (Bright Amber/Red)
    this.addRoute([
      [-0.8, 4.2, -5.5],
      [-2.0, 2.2, -2.5],
      [-2.0, 2.2, 0.0]
    ], 0xf59e0b, "Switched_5V_to_VCC");

    // 3. Audio lines (SPK+ / SPK-) from JQ6500 into Handset Cord
    this.addRoute([
      [-1.2, 2.2, 0.0],
      [-7.5, 2.0, 4.0],
      [-5.0, 3.5, 7.0],
      [7.5, 4.5, 4.0],
      [11.5, 8.5, 0.5]
    ], 0x0ea5e9, "Audio_Lines");

    // 4. Keypad GND bus
    this.addRoute([
      [0.0, 1.4, -9.5],
      [1.5, 1.8, 0.0],
      [3.5, 1.8, 2.0]
    ], 0x1e293b, "GND_Bus");

    this.group.add(this.wiringGroup);
  }

  addRoute(pointsArray, color, name) {
    const points = pointsArray.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    const geom = new THREE.TubeGeometry(curve, 32, 0.09, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = name;
    this.wiringGroup.add(mesh);
  }

  updateCircuitState(isLive) {
    this.isCircuitActive = isLive;
    if (this.contactGlowMat) {
      this.contactGlowMat.color.setHex(isLive ? 0x10b981 : 0x475569);
    }
    if (this.contactLeafTop) {
      // Physically bend contact leaf to touch or separate
      this.contactLeafTop.position.y = isLive ? 3.98 : 4.3;
    }
  }
}
