import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/addons/controls/OrbitControls.js';

/**
 * Three.js Scene Manager with Blueprint Lighting, Floor Grid,
 * Orbit Controls, Raycasting, and Smooth Camera Transitions.
 */

export class BlueprintScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth;
    this.height = canvasContainer.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc); // Crisp blueprint white

    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLighting();
    this.initBlueprintFloor();
    this.initRaycaster();

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.updatables = [];
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.5, 200);
    // Default isometric view of phone
    this.camera.position.set(22, 24, 28);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't dip below floor
    this.controls.minDistance = 8;
    this.controls.maxDistance = 85;
    this.controls.target.set(0, 4, 0);
  }

  initLighting() {
    // Ambient light - clean soft white fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    // Key Light with soft directional shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.keyLight.position.set(25, 40, 20);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 10;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.camera.left = -22;
    this.keyLight.shadow.camera.right = 22;
    this.keyLight.shadow.camera.top = 22;
    this.keyLight.shadow.camera.bottom = -22;
    this.keyLight.shadow.bias = -0.0003;
    this.scene.add(this.keyLight);

    // Cool Technical Rim Light for blueprint edge separation
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-25, 20, -25);
    this.scene.add(rimLight);

    // Front soft fill
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(0, 15, 30);
    this.scene.add(fillLight);
  }

  initBlueprintFloor() {
    this.floorGroup = new THREE.Group();

    // Subtle technical grid
    // Primary grid (large squares)
    const gridMajor = new THREE.GridHelper(70, 35, 0x94a3b8, 0xe2e8f0);
    gridMajor.position.y = 0;
    gridMajor.material.opacity = 0.55;
    gridMajor.material.transparent = true;
    this.floorGroup.add(gridMajor);

    // Shadow receiver plane
    const shadowPlaneGeom = new THREE.PlaneGeometry(100, 100);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.08 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    this.floorGroup.add(shadowPlane);

    this.scene.add(this.floorGroup);
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // Camera position for a preset view, pushed back on narrow (portrait) viewports so the
  // whole model stays in frame. refAspect is the aspect ratio the preset was tuned for.
  framedPosition(camPos, lookAt, refAspect = 1.3) {
    const aspect = this.width / this.height;
    const k = Math.max(1, refAspect / aspect);
    return lookAt.clone().add(camPos.clone().sub(lookAt).multiplyScalar(k));
  }

  setCamera(camPos, lookAt) {
    this.camera.position.copy(camPos);
    this.controls.target.copy(lookAt);
    this.controls.update();
  }

  animateCameraTo(targetCamPos, targetLookAt, duration = 650) {
    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth quintic ease
      const ease = 1 - Math.pow(1 - progress, 4);

      this.camera.position.lerpVectors(startCamPos, targetCamPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  render(time) {
    requestAnimationFrame(this.render);

    const delta = 0.016; // approx 60fps delta
    this.updatables.forEach(fn => fn(delta, time));

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
