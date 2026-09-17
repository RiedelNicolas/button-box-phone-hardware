import * as THREE from 'https://esm.sh/three@0.160.0';

/**
 * Procedural 3D model of the classic landline telephone.
 * - Side-by-Side Layout: Handset cradle on the LEFT, Keypad on the RIGHT
 * - ZERO superposition: Keypad buttons are 100% visible and accessible at all times
 * - Handset resting proudly ON TOP of raised cradle supports with exact pitch angle (NO clipping/sinking!)
 * - Clean buttons with NO "K" text, showing large crisp numbers and distinct colored borders
 * - Mechanical hook switch plungers in the left cradle pocket
 * - Dynamic coiled cord that stretches smoothly when handset is lifted
 */

export class PhoneModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "PhoneModel";

    // State
    this.isHandsetLifted = false;
    this.isXRayMode = false;
    this.interactiveButtons = [];
    this.buttonsMap = {};
    this.plungers = [];
    this.soundWaves = [];

    // Distinct signal colors for trigger keys 1 to 5
    this.triggerColors = {
      '1': { hex: 0x10b981, css: '#10b981', name: 'Emerald Green' },
      '2': { hex: 0x3b82f6, css: '#3b82f6', name: 'Electric Blue' },
      '3': { hex: 0x8b5cf6, css: '#8b5cf6', name: 'Purple' },
      '4': { hex: 0xf59e0b, css: '#f59e0b', name: 'Amber Orange' },
      '5': { hex: 0xef4444, css: '#ef4444', name: 'Crimson Red' }
    };

    // Materials - Pure White Blueprint Aesthetic
    this.initMaterials();

    // Build Sub-assemblies
    this.buildBase();
    this.buildKeypad();
    this.buildHookSwitch();
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
        const isTrigger = ['1', '2', '3', '4', '5'].includes(char);
        const triggerInfo = this.triggerColors[char];

        const btnGroup = new THREE.Group();
        btnGroup.name = `Button_${char}`;

        // Distinct color accent rim under trigger buttons 1 to 5
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
          baseY: plateHeight / 2 + 0.05
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

  buildHookSwitch() {
    this.hookSwitchGroup = new THREE.Group();
    this.hookSwitchGroup.name = "HookSwitch";

    // Mechanical hook switch plungers in left cradle pocket at X = -5.5, Z = -5.6
    const plungerGeom = new THREE.CylinderGeometry(0.32, 0.38, 1.2, 16);
    const plungerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.1
    });

    [-0.8, 0.8].forEach((xOffset) => {
      const plunger = new THREE.Mesh(plungerGeom, plungerMat);
      plunger.position.set(-5.5 + xOffset, 6.35, -5.6);
      plunger.castShadow = true;
      this.addEdgeLines(plunger, 0x0ea5e9);
      this.hookSwitchGroup.add(plunger);
      this.plungers.push(plunger);
    });

    // Switch box underneath
    const switchBoxGeom = new THREE.BoxGeometry(2.4, 1.0, 1.2);
    const switchBoxMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5
    });
    this.switchBox = new THREE.Mesh(switchBoxGeom, switchBoxMat);
    this.switchBox.position.set(-5.5, 5.4, -5.6);

    // Indicator LED
    const ledGeom = new THREE.SphereGeometry(0.2, 16, 16);
    this.switchLedMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    this.switchLed = new THREE.Mesh(ledGeom, this.switchLedMat);
    this.switchLed.position.set(0, 0.6, 0);
    this.switchBox.add(this.switchLed);

    this.hookSwitchGroup.add(this.switchBox);
    this.group.add(this.hookSwitchGroup);

    this.updatePlungers(false);
  }

  updatePlungers(isLifted) {
    // When lifted: plungers spring up to y = 7.1
    // When docked: plungers depress to y = 6.35
    const targetY = isLifted ? 7.1 : 6.35;
    this.plungers.forEach(p => {
      p.position.y = targetY;
    });

    if (this.switchLedMat) {
      this.switchLedMat.color.setHex(isLifted ? 0x10b981 : 0x64748b);
    }
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

    // Interactive clicking
    this.handsetGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { isHandset: true };
      }
    });

    // Position docked on left side with correct elevation and pitch angle
    this.dockHandsetImmediate();
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
    const sag = this.isHandsetLifted ? 2.5 : 3.5;

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

  dockHandsetImmediate() {
    this.isHandsetLifted = false;
    // Exactly elevated on top of cradle supports:
    // Y = 6.90 gives ample +1.2 units clearance above base, resting caps on cradle saddles
    // Pitch angle rotation.x = +0.232 rad (13.3°) matches the exact front-to-back slope
    this.handsetGroup.position.set(-5.5, 6.90, 0.0);
    this.handsetGroup.rotation.set(0.232, 0, 0);
    this.updatePlungers(false);
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

  setHandsetLifted(lifted, onComplete) {
    this.isHandsetLifted = lifted;
    this.updatePlungers(lifted);

    // Docked: Elevated on left cradle saddles (Y = 6.90, pitch = 0.232 rad)
    // Lifted: Hovering comfortably in air
    const targetPos = lifted
      ? new THREE.Vector3(-8.5, 14.5, -1.0)
      : new THREE.Vector3(-5.5, 6.90, 0.0);

    const targetRot = lifted
      ? new THREE.Vector3(0.42, 0.35, -0.15)
      : new THREE.Vector3(0.232, 0, 0);

    const startPos = this.handsetGroup.position.clone();
    const startRot = this.handsetGroup.rotation.clone();
    const startTime = performance.now();
    const duration = 450;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.handsetGroup.position.lerpVectors(startPos, targetPos, ease);
      this.handsetGroup.rotation.x = THREE.MathUtils.lerp(startRot.x, targetRot.x, ease);
      this.handsetGroup.rotation.y = THREE.MathUtils.lerp(startRot.y, targetRot.y, ease);
      this.handsetGroup.rotation.z = THREE.MathUtils.lerp(startRot.z, targetRot.z, ease);

      this.updateCoiledCord();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(step);
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
