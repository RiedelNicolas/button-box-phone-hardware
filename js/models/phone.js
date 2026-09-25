import * as THREE from 'https://esm.sh/three@0.160.0';
import { KEYS } from '../hardware.js';

/**
 * Procedural 3D model of the recycled phone case.
 * - Side-by-side layout: handset resting on the cradle on the LEFT, keypad on the RIGHT
 * - All 10 digit keys (1-9, 0) are triggers, each with its own color accent (no text clutter)
 * - The 8 ohm speaker sits in the handset earpiece; the status LED is on the case
 * - Pressed keys light up in their color while their clip plays
 */

export class PhoneModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "PhoneModel";

    // State
    this.isXRayMode = false;
    this.interactiveButtons = [];
    this.buttonsMap = {};
    this.soundWaves = [];
    this.activeKey = null;    // key currently highlighted (playing), or null
    this.ledBlinkTime = 0;

    // Signal colors for the 10 trigger keys (same colors as the wires in the circuit view)
    this.triggerColors = {};
    KEYS.forEach(k => {
      this.triggerColors[k.key] = { hex: k.color, css: k.css };
    });

    // Materials - Pure White Blueprint Aesthetic
    this.initMaterials();

    // Build Sub-assemblies
    this.buildBase();
    this.buildKeypad();
    this.buildStatusLed();
    this.buildHandset();
    this.buildCoiledCord();
    this.buildAcousticWaves();

    this.scene.add(this.group);
  }

  initMaterials() {
    this.baseMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.35,
      metalness: 0.05
    });

    this.bezelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.1
    });

    this.buttonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05
    });

    this.edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      linewidth: 1,
      transparent: true,
      opacity: 0.65
    });

    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.2,
      metalness: 0.8
    });

    this.speakerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7
    });

    this.speakerConeMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.5,
      metalness: 0.3
    });
  }

  addEdgeLines(mesh, color = 0x94a3b8, thresholdAngle = 24) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
    const lineMat = this.edgeLineMat.clone();
    lineMat.color.setHex(color);
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);
    return line;
  }

  buildBase() {
    this.baseGroup = new THREE.Group();
    this.baseGroup.name = "PhoneBase";

    // Side profile in (Z, Y):
    const shape = new THREE.Shape();
    shape.moveTo(-10.0, 0);
    shape.lineTo(10.0, 0);
    shape.lineTo(9.8, 1.8);
    shape.lineTo(8.2, 2.8);
    shape.lineTo(-3.5, 6.0);
    shape.lineTo(-9.0, 6.4);
    shape.lineTo(-10.0, 4.5);
    shape.closePath();

    // Width = 21.5 units
    const extrudeSettings = {
      steps: 1,
      depth: 21.5,
      bevelEnabled: true,
      bevelThickness: 1.0,
      bevelSize: 0.8,
      bevelOffset: 0,
      bevelSegments: 4
    };

    const baseGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    baseGeom.center();
    baseGeom.rotateY(-Math.PI / 2);

    this.baseMesh = new THREE.Mesh(baseGeom, this.baseMat);
    this.baseMesh.castShadow = true;
    this.baseMesh.receiveShadow = true;
    this.baseMesh.position.y = 3.2;
    this.addEdgeLines(this.baseMesh);
    this.baseGroup.add(this.baseMesh);

    // RAISED CRADLE SUPPORTS on the left side (X = -5.5)
    // 1. Upper cradle support saddle (earpiece)
    const cupGeom = new THREE.CylinderGeometry(2.4, 2.1, 1.2, 24);
    cupGeom.rotateZ(Math.PI / 2);

    this.cradleTop = new THREE.Mesh(cupGeom, this.bezelMat);
    this.cradleTop.position.set(-5.5, 6.1, -5.6);
    this.cradleTop.scale.set(1.4, 0.75, 1.2);
    this.addEdgeLines(this.cradleTop, 0x94a3b8);
    this.baseGroup.add(this.cradleTop);

    // 2. Lower cradle support saddle (mouthpiece)
    this.cradleBottom = new THREE.Mesh(cupGeom, this.bezelMat);
    this.cradleBottom.position.set(-5.5, 3.5, 5.2);
    this.cradleBottom.scale.set(1.4, 0.75, 1.2);
    this.addEdgeLines(this.cradleBottom, 0x94a3b8);
    this.baseGroup.add(this.cradleBottom);

    // Rubber feet
    const footGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const footPositions = [
      [-9.0, 0.15, -7.0],
      [9.0, 0.15, -7.0],
      [-9.0, 0.15, 7.0],
      [9.0, 0.15, 7.0]
    ];
    footPositions.forEach(pos => {
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(...pos);
      this.baseGroup.add(foot);
    });

    this.group.add(this.baseGroup);
  }

  buildKeypad() {
    this.keypadGroup = new THREE.Group();
    this.keypadGroup.name = "Keypad";

    const slopeAngle = Math.atan2(3.2, 11.5); // ≈ 0.271 rad

    // Right-side keypad plate: centered at X = +3.6
    const plateWidth = 10.4;
    const plateDepth = 10.2;
    const plateHeight = 0.45;

    const plateGeom = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
    const plateMesh = new THREE.Mesh(plateGeom, this.bezelMat);

    plateMesh.position.set(3.6, 4.65, 0.8);
    plateMesh.rotation.x = slopeAngle;
    this.keypadPlate = plateMesh;
    this.addEdgeLines(plateMesh, 0x94a3b8);
    this.keypadGroup.add(plateMesh);

    // 3 columns x 4 rows
    const buttonRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', '#']
    ];

    const btnWidth = 2.4;
    const btnHeight = 0.75;
    const btnDepth = 1.6;
    const colSpacing = 2.9;
    const rowSpacing = 2.1;

    buttonRows.forEach((row, rIdx) => {
      row.forEach((char, cIdx) => {
        const isTrigger = Boolean(this.triggerColors[char]);
        const triggerInfo = this.triggerColors[char];

        const btnGroup = new THREE.Group();
        btnGroup.name = `Button_${char}`;

        // Distinct color accent rim under each trigger key
        if (isTrigger && triggerInfo) {
          const accentRimGeom = new THREE.BoxGeometry(btnWidth + 0.25, 0.15, btnDepth + 0.25);
          const accentRimMat = new THREE.MeshStandardMaterial({
            color: triggerInfo.hex,
            roughness: 0.3,
            metalness: 0.2
          });
          const accentRim = new THREE.Mesh(accentRimGeom, accentRimMat);
          accentRim.position.y = 0.08;
          btnGroup.add(accentRim);
        }

        const btnGeom = new THREE.BoxGeometry(btnWidth, btnHeight, btnDepth);
        const btnMat = isTrigger ? this.buttonMat.clone() : this.buttonMat;
        const btnMesh = new THREE.Mesh(btnGeom, btnMat);
        btnMesh.castShadow = true;
        btnMesh.position.y = btnHeight / 2 + (isTrigger ? 0.08 : 0);

        const outlineColor = (isTrigger && triggerInfo) ? triggerInfo.hex : 0x94a3b8;
        this.addEdgeLines(btnMesh, outlineColor);
        btnGroup.add(btnMesh);

        // Texture with large bold number and NO "K" text
        const labelTexture = this.createButtonLabelTexture(char, isTrigger, triggerInfo);
        const labelGeom = new THREE.PlaneGeometry(btnWidth * 0.94, btnDepth * 0.94);
        const labelMat = new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          polygonOffset: true,
          polygonOffsetFactor: -2
        });
        const labelMesh = new THREE.Mesh(labelGeom, labelMat);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.y = btnHeight + (isTrigger ? 0.09 : 0.01);
        btnGroup.add(labelMesh);

        // Position on plate
        const xPos = (cIdx - 1) * colSpacing;
        const zPos = (rIdx - 1.5) * rowSpacing;
        btnGroup.position.set(xPos, plateHeight / 2 + 0.05, zPos);

        btnMesh.userData = {
          character: char,
          isTrigger: isTrigger,
          triggerInfo: triggerInfo,
          keyNumber: parseInt(char) || null,
          group: btnGroup,
          baseY: plateHeight / 2 + 0.05,
          mat: btnMat
        };

        this.interactiveButtons.push(btnMesh);
        this.buttonsMap[char] = btnMesh;

        plateMesh.add(btnGroup);
      });
    });

    this.group.add(this.keypadGroup);
  }

  createButtonLabelTexture(char, isTrigger, triggerInfo) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 128);

    if (isTrigger && triggerInfo) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(6, 6, 116, 116, 14);
      ctx.fill();

      ctx.strokeStyle = triggerInfo.css;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(8, 8, 112, 112, 12);
      ctx.stroke();

      ctx.fillStyle = triggerInfo.css;
      ctx.beginPath();
      ctx.arc(64, 22, 5, 0, Math.PI * 2);
      ctx.fill();

      // Clean large number (NO "K" text!)
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 64, 68);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(6, 6, 116, 116, 14);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(8, 8, 112, 112, 12);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 64, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  buildStatusLed() {
    // Status LED in the top-right corner of the keypad plate (blinks while a clip plays)
    const bezelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.2, 20);
    const bezel = new THREE.Mesh(bezelGeom, this.buttonMat);
    bezel.position.set(4.6, 0.6, -3.15);
    this.addEdgeLines(bezel, 0x94a3b8);
    this.keypadPlate.add(bezel);

    const ledGeom = new THREE.SphereGeometry(0.3, 16, 16);
    this.ledMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    this.statusLed = new THREE.Mesh(ledGeom, this.ledMat);
    this.statusLed.position.set(0, 0.12, 0);
    bezel.add(this.statusLed);
  }

  buildHandset() {
    this.handsetGroup = new THREE.Group();
    this.handsetGroup.name = "Handset";

    // Handle bridge
    const handleGeom = new THREE.BoxGeometry(2.8, 1.2, 11.6);
    this.handleMesh = new THREE.Mesh(handleGeom, this.baseMat);
    this.handleMesh.position.set(0, 0, 0);
    this.handleMesh.castShadow = true;
    this.addEdgeLines(this.handleMesh);
    this.handsetGroup.add(this.handleMesh);

    // Earpiece cup at z = -5.5
    const cupGeom = new THREE.CylinderGeometry(2.3, 2.1, 2.2, 32);
    this.earpieceMesh = new THREE.Mesh(cupGeom, this.baseMat);
    this.earpieceMesh.position.set(0, -0.7, -5.5);
    this.earpieceMesh.rotation.x = -0.15;
    this.earpieceMesh.castShadow = true;
    this.addEdgeLines(this.earpieceMesh);

    // Acoustic perforation cap
    const capGeom = new THREE.CircleGeometry(2.0, 24);
    const capTex = this.createPerforationTexture();
    const capMat = new THREE.MeshBasicMaterial({
      map: capTex,
      transparent: true
    });
    const capMesh = new THREE.Mesh(capGeom, capMat);
    capMesh.rotation.x = Math.PI / 2;
    capMesh.position.y = -1.11;
    this.earpieceMesh.add(capMesh);

    // Internal mini speaker
    this.internalSpeakerGroup = new THREE.Group();
    this.internalSpeakerGroup.name = "InternalMiniSpeaker";

    const speakerFrameGeom = new THREE.CylinderGeometry(1.7, 1.7, 0.5, 24);
    const speakerFrame = new THREE.Mesh(speakerFrameGeom, this.speakerMat);
    speakerFrame.position.y = -0.2;

    const coneGeom = new THREE.ConeGeometry(1.3, 0.4, 24, 1, true);
    coneGeom.rotateX(Math.PI);
    this.speakerCone = new THREE.Mesh(coneGeom, this.speakerConeMat);
    this.speakerCone.position.y = -0.5;

    const magnetGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16);
    const magnet = new THREE.Mesh(magnetGeom, this.metalMat);
    magnet.position.y = 0.2;

    this.internalSpeakerGroup.add(speakerFrame);
    this.internalSpeakerGroup.add(this.speakerCone);
    this.internalSpeakerGroup.add(magnet);
    this.earpieceMesh.add(this.internalSpeakerGroup);

    this.handsetGroup.add(this.earpieceMesh);

    // Mouthpiece cup at z = +5.5
    this.mouthpieceMesh = new THREE.Mesh(cupGeom, this.baseMat);
    this.mouthpieceMesh.position.set(0, -0.7, 5.5);
    this.mouthpieceMesh.rotation.x = 0.15;
    this.mouthpieceMesh.castShadow = true;
    this.addEdgeLines(this.mouthpieceMesh);

    const micCapMesh = new THREE.Mesh(capGeom, capMat);
    micCapMesh.rotation.x = Math.PI / 2;
    micCapMesh.position.y = -1.11;
    this.mouthpieceMesh.add(micCapMesh);

    this.handsetGroup.add(this.mouthpieceMesh);

    // Cord grommet
    const grommetGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
    const grommet = new THREE.Mesh(grommetGeom, this.metalMat);
    grommet.position.set(0, 0.2, 6.7);
    grommet.rotation.x = Math.PI / 2;
    this.handsetGroup.add(grommet);

    // Resting on the cradle (left side) with the same pitch as the case slope
    this.handsetGroup.position.set(-5.5, 6.90, 0.0);
    this.handsetGroup.rotation.set(0.232, 0, 0);
    this.group.add(this.handsetGroup);
  }

  createPerforationTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    const rings = [18, 38, 58, 78, 98];
    rings.forEach((r, idx) => {
      const count = (idx + 1) * 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = 128 + Math.cos(angle) * r;
        const y = 128 + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.beginPath();
    ctx.arc(128, 128, 6, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  buildCoiledCord() {
    this.cordGroup = new THREE.Group();
    this.cordGroup.name = "CoiledCord";

    this.cordMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.1
    });

    this.group.add(this.cordGroup);
    this.updateCoiledCord();
  }

  updateCoiledCord() {
    if (this.cordMesh) {
      this.cordGroup.remove(this.cordMesh);
      this.cordMesh.geometry.dispose();
    }

    // Origin on left flank of base
    const pStart = new THREE.Vector3(-9.2, 3.2, 4.0);
    const pEnd = this.group.worldToLocal(
      this.handsetGroup.localToWorld(new THREE.Vector3(0, 0.2, 6.7))
    );

    const points = [];
    const numCoils = 24;
    const pointsPerCoil = 8;
    const totalPoints = numCoils * pointsPerCoil;
    const coilRadius = 0.5;
    const sag = 3.5;

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const basePoint = new THREE.Vector3().lerpVectors(pStart, pEnd, t);
      basePoint.y -= Math.sin(t * Math.PI) * sag;

      const angle = t * numCoils * Math.PI * 2;
      const xOffset = Math.cos(angle) * coilRadius;
      const yOffset = Math.sin(angle) * coilRadius;

      basePoint.x += xOffset;
      basePoint.y += yOffset;
      points.push(basePoint);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, 150, 0.11, 6, false);
    this.cordMesh = new THREE.Mesh(tubeGeom, this.cordMat);
    this.cordGroup.add(this.cordMesh);
  }

  buildAcousticWaves() {
    this.wavesGroup = new THREE.Group();
    this.wavesGroup.name = "AcousticWaves";

    const ringGeom = new THREE.RingGeometry(0.8, 1.1, 32);
    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      ring.userData = { id: i, baseScale: 1.0, active: false };
      this.wavesGroup.add(ring);
      this.soundWaves.push(ring);
    }

    this.earpieceMesh.add(this.wavesGroup);
  }

  triggerSoundWaveAnimation() {
    this.soundWaves.forEach((ring, idx) => {
      ring.visible = true;
      ring.scale.set(0.5, 0.5, 0.5);
      ring.material.opacity = 0.8;
      ring.position.y = -1.4;

      const delay = idx * 180;
      setTimeout(() => {
        ring.userData.active = true;
        ring.userData.progress = 0;
      }, delay);
    });
  }

  updateWaves(delta) {
    // Blink the status LED while a key is active (playing)
    if (this.ledMat) {
      if (this.activeKey) {
        this.ledBlinkTime += delta;
        const on = Math.floor(this.ledBlinkTime / 0.15) % 2 === 0;
        this.ledMat.color.setHex(on ? 0xef4444 : 0x7f1d1d);
      } else {
        this.ledBlinkTime = 0;
        this.ledMat.color.setHex(0x7f1d1d);
      }
    }

    this.soundWaves.forEach(ring => {
      if (ring.userData.active) {
        ring.userData.progress += delta * 1.8;
        const p = ring.userData.progress;

        if (p >= 1.0) {
          ring.userData.active = false;
          ring.visible = false;
        } else {
          const scale = 1.0 + p * 2.8;
          ring.scale.set(scale, scale, scale);
          ring.position.y = -1.4 - p * 2.2;
          ring.material.opacity = (1.0 - p) * 0.75;
        }
      }
    });
  }

  animateButtonPress(char, onComplete) {
    const btnMesh = this.buttonsMap[char];
    if (!btnMesh) return;

    const group = btnMesh.userData.group;
    const originalY = btnMesh.userData.baseY;

    group.position.y = originalY - 0.22;

    setTimeout(() => {
      group.position.y = originalY;
      if (onComplete) onComplete();
    }, 120);
  }

  // Light up a trigger key in its own color while its clip plays (null clears the highlight)
  setActiveKey(char) {
    if (this.activeKey && this.buttonsMap[this.activeKey]) {
      const prev = this.buttonsMap[this.activeKey].userData.mat;
      prev.emissive.setHex(0x000000);
      prev.emissiveIntensity = 0;
    }
    this.activeKey = null;
    const btn = char != null ? this.buttonsMap[char] : null;
    if (btn && btn.userData.isTrigger) {
      btn.userData.mat.emissive.setHex(btn.userData.triggerInfo.hex);
      btn.userData.mat.emissiveIntensity = 0.55;
      this.activeKey = char;
    }
  }

  toggleXRayMode(enabled) {
    this.isXRayMode = enabled;
    const opacity = enabled ? 0.28 : 1.0;
    this.baseMat.transparent = enabled;
    this.baseMat.opacity = opacity;
    this.baseMat.needsUpdate = true;
    this.edgeLineMat.opacity = enabled ? 0.9 : 0.65;
    this.edgeLineMat.needsUpdate = true;
  }
}
