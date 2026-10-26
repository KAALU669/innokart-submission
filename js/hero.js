// InnoKart - Hero 3D Solar Charger with Sky, Eclipse, Water Shader & Pointer Ripples
// Three.js r128 Global Build only: no import statements, no newer APIs.

(function () {
  'use strict';

  window.requestAnimationFrame(() => window.requestAnimationFrame(initializeHero));

  function initializeHero() {
  const SETTINGS = {
    OBJECT_FILL: 0.86,
    OBJECT_Y_NUDGE: 0,
    WAVE_STRENGTH: 1.0,
    RIPPLE_LIFETIME: 3.2,
    AUTO_ROTATION_SPEED: (Math.PI * 2) / 14,
    MOBILE_RENDER_SCALE: 0.7
  };
  const isCompactViewport = () => window.innerWidth <= 768 || window.innerHeight <= 520;

  const canvas = document.getElementById('hero-canvas');
  const heroSection = document.getElementById('hero');
  const fallbackEl = document.getElementById('hero-fallback');
  const fallbackList = document.getElementById('fallback-parts-list');

  function dispatchHeroEvent(name) {
    window.dispatchEvent(new Event(name));
  }

  // Helper for WebGL failure fallback
  function showWebGLFallback() {
    console.warn('WebGL initialization failed or unavailable. Showing CSS gradient and plain list fallback.');
    if (heroSection) heroSection.classList.add('is-hero-fallback');
    if (canvas) canvas.classList.add('is-hidden');
    if (fallbackEl) {
      fallbackEl.classList.remove('is-hidden');
      fallbackEl.setAttribute('aria-hidden', 'false');
    }
    if (fallbackList && typeof inventions !== 'undefined' && inventions[0] && inventions[0].parts) {
      fallbackList.replaceChildren();
      inventions[0].parts.forEach((part, index) => {
        const item = document.createElement('li');
        item.className = 'fallback-part-item';
        const name = document.createElement('strong');
        name.textContent = `L0${index + 1}: ${part.name}`;
        const description = document.createElement('span');
        description.textContent = `${part.role} (${part.source})`;
        item.append(name, description);
        fallbackList.appendChild(item);
      });
    }
    dispatchHeroEvent('hero:failed');
  }

  // Check Three.js availability
  if (typeof THREE === 'undefined') {
    showWebGLFallback();
    return;
  }

  if (!canvas || !heroSection) {
    showWebGLFallback();
    return;
  }

  // 1. Accessibility: prefers-reduced-motion
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
    if (prefersReducedMotion) {
      rotationSpeed = 0;
      targetRotX = 0;
    } else if (!dragState) {
      rotationSpeed = SETTINGS.AUTO_ROTATION_SPEED;
    }
  });

  // 3. Pointer Ripples Ring Buffer (14 drops: x, y, startTime, strength)
  const MAX_DROPS = 14;
  const dropVectors = [];
  for (let i = 0; i < MAX_DROPS; i++) {
    dropVectors.push(new THREE.Vector4(0.5, 0.2, -100.0, 0.0));
  }
  let dropIndex = 0;

  function addDrop(x, y, strength) {
    const elapsed = clock ? clock.getElapsedTime() : performance.now() * 0.001;
    const clampedX = Math.max(0.02, Math.min(0.98, x));
    const clampedY = Math.max(0.02, Math.min(Math.max(0.02, postUniforms.u_horizon.value - 0.002), y));
    dropVectors[dropIndex].set(clampedX, clampedY, elapsed, strength);
    dropIndex = (dropIndex + 1) % MAX_DROPS;
  }

  // 4. Initialize WebGL Renderer & Test Context
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance'
    });

    if (!renderer || !renderer.getContext()) {
      showWebGLFallback();
      return;
    }
  } catch (err) {
    showWebGLFallback();
    return;
  }

  const isMobileAtStartup = isCompactViewport();
  const initialPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(initialPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0); // Transparent clear color for 3D pass

  // 5. Primary 3D Scene & Perspective Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.0);

  // 6. Offscreen Render Target for 3D Object Pass
  const initialW = canvas.clientWidth || window.innerWidth;
  const initialH = canvas.clientHeight || window.innerHeight;

  const renderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false
  };
  const supportsMultisample = !isMobileAtStartup && renderer.capabilities.isWebGL2
    && typeof THREE.WebGLMultisampleRenderTarget === 'function';
  const initialRenderScale = window.innerWidth <= 768 ? SETTINGS.MOBILE_RENDER_SCALE : 1;
  const targetWidth = Math.max(1, Math.round(initialW * initialPR * initialRenderScale));
  const targetHeight = Math.max(1, Math.round(initialH * initialPR * initialRenderScale));
  const renderTarget = supportsMultisample
    ? new THREE.WebGLMultisampleRenderTarget(targetWidth, targetHeight, renderTargetOptions)
    : new THREE.WebGLRenderTarget(targetWidth, targetHeight, renderTargetOptions);
  if (supportsMultisample) renderTarget.samples = 4;

  // 7. PMREMGenerator Environment Map
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x130a05);

  const sb1 = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff4e6, side: THREE.DoubleSide })
  );
  sb1.position.set(6, 8, 6);
  sb1.lookAt(0, 0, 0);
  envScene.add(sb1);

  const sb2 = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 0xe08a4b, side: THREE.DoubleSide })
  );
  sb2.position.set(-6, -4, 5);
  sb2.lookAt(0, 0, 0);
  envScene.add(sb2);

  const sb3 = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  sb3.position.set(0, 9, -7);
  sb3.lookAt(0, 0, 0);
  envScene.add(sb3);

  const envLight = new THREE.AmbientLight(0x362114, 1.2);
  envScene.add(envLight);

  const envRenderTarget = pmremGenerator.fromScene(envScene, 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  // 8. Direct Scene Lighting
  const keyLight = new THREE.DirectionalLight(0xfff6eb, 1.3);
  keyLight.position.set(5, 7, 6);
  scene.add(keyLight);

  const orangeFillLight = new THREE.DirectionalLight(0xe08a4b, 0.85);
  orangeFillLight.position.set(-5, -3, 4);
  scene.add(orangeFillLight);

  const rimLight = new THREE.DirectionalLight(0xffeedd, 0.9);
  rimLight.position.set(0, 6, -6);
  scene.add(rimLight);

  const ambientLight = new THREE.AmbientLight(0x241710, 0.8);
  scene.add(ambientLight);

  // 9. Geometry Helper
  function createRoundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }

  // 10. Procedural Textures
  function createSolarGridTexture() {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 768;
    const ctx = texCanvas.getContext('2d');

    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, texCanvas.width, texCanvas.height);

    const cols = 2;
    const rows = 4;
    const padX = 24;
    const padY = 28;
    const cellW = (texCanvas.width - padX * (cols + 1)) / cols;
    const cellH = (texCanvas.height - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = padX + c * (cellW + padX);
        const cy = padY + r * (cellH + padY);

        const grad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
        grad.addColorStop(0, '#0c223c');
        grad.addColorStop(0.5, '#13355e');
        grad.addColorStop(1, '#091c33');
        ctx.fillStyle = grad;

        const chamfer = 14;
        ctx.beginPath();
        ctx.moveTo(cx + chamfer, cy);
        ctx.lineTo(cx + cellW - chamfer, cy);
        ctx.lineTo(cx + cellW, cy + chamfer);
        ctx.lineTo(cx + cellW, cy + cellH - chamfer);
        ctx.lineTo(cx + cellW - chamfer, cy + cellH);
        ctx.lineTo(cx + chamfer, cy + cellH);
        ctx.lineTo(cx, cy + cellH - chamfer);
        ctx.lineTo(cx, cy + chamfer);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(180, 215, 255, 0.22)';
        ctx.lineWidth = 1;
        const fingers = 16;
        for (let f = 1; f < fingers; f++) {
          const fy = cy + (f * cellH) / fingers;
          ctx.beginPath();
          ctx.moveTo(cx + 4, fy);
          ctx.lineTo(cx + cellW - 4, fy);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        const b1 = cx + cellW * 0.33;
        const b2 = cx + cellW * 0.67;
        ctx.beginPath();
        ctx.moveTo(b1, cy);
        ctx.lineTo(b1, cy + cellH);
        ctx.moveTo(b2, cy);
        ctx.lineTo(b2, cy + cellH);
        ctx.stroke();

        ctx.fillStyle = '#e08a4b';
        ctx.fillRect(b1 - 2, cy - padY * 0.5, 4, padY * 0.5);
        ctx.fillRect(b2 - 2, cy - padY * 0.5, 4, padY * 0.5);
      }
    }

    ctx.strokeStyle = '#22384f';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, texCanvas.width - 20, texCanvas.height - 20);

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createBambooTexture() {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 768;
    const ctx = texCanvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, texCanvas.width, 0);
    bgGrad.addColorStop(0, '#9c663b');
    bgGrad.addColorStop(0.3, '#b77f4c');
    bgGrad.addColorStop(0.7, '#a67040');
    bgGrad.addColorStop(1, '#8f5c32');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, texCanvas.width, texCanvas.height);

    for (let i = 0; i < 350; i++) {
      const gx = Math.random() * texCanvas.width;
      const gw = Math.random() * 2 + 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70, 40, 20, 0.12)' : 'rgba(230, 175, 120, 0.15)';
      ctx.fillRect(gx, 0, gw, texCanvas.height);
    }

    const nodePositions = [180, 390, 600];
    nodePositions.forEach(ny => {
      const nodeGrad = ctx.createLinearGradient(0, ny - 10, 0, ny + 10);
      nodeGrad.addColorStop(0, 'rgba(60, 30, 15, 0)');
      nodeGrad.addColorStop(0.45, 'rgba(60, 30, 15, 0.45)');
      nodeGrad.addColorStop(0.55, 'rgba(240, 190, 130, 0.4)');
      nodeGrad.addColorStop(1, 'rgba(60, 30, 15, 0)');
      ctx.fillStyle = nodeGrad;
      ctx.fillRect(0, ny - 10, texCanvas.width, 20);
    });

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // 11. Build the 5 Separate Layers along Z (each its own THREE.Group)
  const chargerModel = new THREE.Group();
  const layerGroups = [];

  const W = 2.9;
  const H = 4.3;

  // LAYER 1: Front glass with solar cell grid
  const groupLayer1 = new THREE.Group();
  groupLayer1.name = 'Layer1_FrontGlass';

  const solarTexture = createSolarGridTexture();
  const solarPlaneGeo = new THREE.PlaneGeometry(W - 0.25, H - 0.25);
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTexture,
    roughness: 0.25,
    metalness: 0.35
  });
  const solarMesh = new THREE.Mesh(solarPlaneGeo, solarMat);
  groupLayer1.add(solarMesh);

  const glassShape = createRoundedRectShape(W - 0.1, H - 0.1, 0.14);
  const glassGeo = new THREE.ExtrudeGeometry(glassShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  });
  glassGeo.center();
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    roughness: 0.04,
    metalness: 0.1
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.z = 0.03;
  groupLayer1.add(glassMesh);

  layerGroups.push(groupLayer1);
  chargerModel.add(groupLayer1);

  // LAYER 2: Copper frame (rounded rectangle, beveled)
  const groupLayer2 = new THREE.Group();
  groupLayer2.name = 'Layer2_CopperFrame';

  const frameOuter = createRoundedRectShape(W + 0.15, H + 0.15, 0.22);
  const frameHole = createRoundedRectShape(W - 0.28, H - 0.28, 0.14);
  frameOuter.holes.push(frameHole);

  const frameGeo = new THREE.ExtrudeGeometry(frameOuter, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04
  });
  frameGeo.center();

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xdf7c40,
    metalness: 0.94,
    roughness: 0.2
  });
  const frameMesh = new THREE.Mesh(frameGeo, copperMat);
  groupLayer2.add(frameMesh);

  const rivetGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 16);
  const cornerOffsets = [
    [-W * 0.44, -H * 0.45],
    [W * 0.44, -H * 0.45],
    [-W * 0.44, H * 0.45],
    [W * 0.44, H * 0.45]
  ];
  cornerOffsets.forEach(([rx, ry]) => {
    const rivet = new THREE.Mesh(rivetGeo, copperMat);
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(rx, ry, 0.08);
    groupLayer2.add(rivet);
  });

  layerGroups.push(groupLayer2);
  chargerModel.add(groupLayer2);

  // LAYER 3: Battery pack (a row of cylinders)
  const groupLayer3 = new THREE.Group();
  groupLayer3.name = 'Layer3_BatteryPack';

  const cellRadius = 0.24;
  const cellLength = 2.6;
  const cellGeo = new THREE.CylinderGeometry(cellRadius, cellRadius, cellLength, 32);

  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x1d3d2c,
    roughness: 0.4,
    metalness: 0.25
  });

  const terminalGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24);
  const terminalMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.22
  });

  const baseCapGeo = new THREE.CylinderGeometry(cellRadius * 0.95, cellRadius * 0.95, 0.04, 24);
  const nickelMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.95,
    roughness: 0.2
  });

  const cellXPositions = [-0.64, 0, 0.64];
  cellXPositions.forEach(cx => {
    const cellMesh = new THREE.Mesh(cellGeo, cellMat);
    cellMesh.position.set(cx, 0, 0);

    const posTerm = new THREE.Mesh(terminalGeo, terminalMat);
    posTerm.position.set(cx, cellLength / 2 + 0.04, 0);

    const negTerm = new THREE.Mesh(baseCapGeo, nickelMat);
    negTerm.position.set(cx, -cellLength / 2 - 0.02, 0);

    groupLayer3.add(cellMesh);
    groupLayer3.add(posTerm);
    groupLayer3.add(negTerm);
  });

  const busbarStripGeo = new THREE.BoxGeometry(1.4, 0.06, 0.04);
  const topBusbar = new THREE.Mesh(busbarStripGeo, nickelMat);
  topBusbar.position.set(0, cellLength / 2 + 0.05, 0);
  const btmBusbar = new THREE.Mesh(busbarStripGeo, nickelMat);
  btmBusbar.position.set(0, -cellLength / 2 - 0.03, 0);
  groupLayer3.add(topBusbar);
  groupLayer3.add(btmBusbar);

  layerGroups.push(groupLayer3);
  chargerModel.add(groupLayer3);

  // LAYER 4: Controller board (dark board with chips)
  const groupLayer4 = new THREE.Group();
  groupLayer4.name = 'Layer4_ControllerBoard';

  const pcbShape = createRoundedRectShape(W - 0.2, H - 0.2, 0.12);
  const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, { depth: 0.06, bevelEnabled: false });
  pcbGeo.center();
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x111914,
    roughness: 0.75,
    metalness: 0.15
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  groupLayer4.add(pcbMesh);

  const icMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.35, metalness: 0.1 });
  const mainChip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.07), icMat);
  mainChip.position.set(0, 0.35, 0.05);
  groupLayer4.add(mainChip);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.95, roughness: 0.2 });
  const pinGeo = new THREE.BoxGeometry(0.04, 0.03, 0.02);
  for (let p = -0.28; p <= 0.28; p += 0.09) {
    const pinL = new THREE.Mesh(pinGeo, pinMat);
    pinL.position.set(-0.39, 0.35 + p, 0.03);
    const pinR = new THREE.Mesh(pinGeo, pinMat);
    pinR.position.set(0.39, 0.35 + p, 0.03);
    groupLayer4.add(pinL);
    groupLayer4.add(pinR);
  }

  const inductorMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.5, metalness: 0.4 });
  const inductor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.14), inductorMat);
  inductor.position.set(-0.7, -0.6, 0.08);
  groupLayer4.add(inductor);

  const smdBlackMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.4 });
  const smdTanMat = new THREE.MeshStandardMaterial({ color: 0xb58b57, roughness: 0.5 });
  const smdPositions = [
    [0.7, 0.8, 0.22, 0.14, smdBlackMat],
    [0.7, 0.55, 0.18, 0.12, smdBlackMat],
    [0.7, -0.4, 0.32, 0.22, smdBlackMat],
    [-0.7, 0.85, 0.16, 0.1, smdTanMat],
    [-0.7, 0.65, 0.16, 0.1, smdTanMat],
    [-0.7, 0.45, 0.16, 0.1, smdTanMat],
    [0, -0.55, 0.28, 0.16, smdBlackMat],
    [0.4, -0.9, 0.2, 0.12, smdTanMat],
    [-0.4, -0.9, 0.2, 0.12, smdTanMat]
  ];
  smdPositions.forEach(([sx, sy, sw, sh, mat]) => {
    const smd = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.05), mat);
    smd.position.set(sx, sy, 0.04);
    groupLayer4.add(smd);
  });

  const usbcMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.2 });
  const usbcLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.12), usbcMat);
  usbcLeft.position.set(-0.55, -H / 2 + 0.12, 0.05);
  const usbcRight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.12), usbcMat);
  usbcRight.position.set(0.55, -H / 2 + 0.12, 0.05);
  groupLayer4.add(usbcLeft);
  groupLayer4.add(usbcRight);

  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xe08a4b,
    emissive: 0xe08a4b,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), ledMat);
  led.position.set(-0.7, 1.2, 0.05);
  groupLayer4.add(led);

  layerGroups.push(groupLayer4);
  chargerModel.add(groupLayer4);

  // LAYER 5: Bamboo back panel
  const groupLayer5 = new THREE.Group();
  groupLayer5.name = 'Layer5_BambooBackPanel';

  const bambooTexture = createBambooTexture();
  const bambooShape = createRoundedRectShape(W + 0.05, H + 0.05, 0.18);
  const bambooGeo = new THREE.ExtrudeGeometry(bambooShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03
  });
  bambooGeo.center();

  const bambooMat = new THREE.MeshStandardMaterial({
    map: bambooTexture,
    roughness: 0.65,
    metalness: 0.05
  });
  const bambooMesh = new THREE.Mesh(bambooGeo, bambooMat);
  groupLayer5.add(bambooMesh);

  const screwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.25 });
  const screwOffsets = [
    [-W * 0.42, -H * 0.43],
    [W * 0.42, -H * 0.43],
    [-W * 0.42, H * 0.43],
    [W * 0.42, H * 0.43]
  ];
  screwOffsets.forEach(([sx, sy]) => {
    const screw = new THREE.Mesh(screwGeo, brassMat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx, sy, -0.07);
    groupLayer5.add(screw);
  });

  layerGroups.push(groupLayer5);
  chargerModel.add(groupLayer5);

  scene.add(chargerModel);

  // Z-coordinates for Stacked (0.0) vs Equal Separation (1.0)
  const closedZ = [0.18, 0.09, 0, -0.09, -0.18];
  layerGroups.forEach((group, index) => {
    group.position.z = closedZ[index];
  });

  // 12. Full-Screen Quad & Custom Fragment Shader (Sky, Eclipse, Water, Swell & Pointer Ripples)
  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const postUniforms = {
    u_sceneTexture: { value: renderTarget.texture },
    u_resolution: { value: new THREE.Vector2(initialW * initialPR, initialH * initialPR) },
    u_time: { value: 0.0 },
    u_mobile: { value: isCompactViewport() ? 1.0 : 0.0 },
    u_horizon: { value: 0.40 },
    u_waveStrength: { value: SETTINGS.WAVE_STRENGTH },
    u_rippleLifetime: { value: SETTINGS.RIPPLE_LIFETIME },
    u_drops: { value: dropVectors }
  };

  const postMaterial = new THREE.ShaderMaterial({
    uniforms: postUniforms,
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = vec4(position.xy, 0.0, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D u_sceneTexture;',
      'uniform vec2 u_resolution;',
      'uniform float u_time;',
      'uniform float u_mobile;',
      'uniform float u_horizon;',
      'uniform float u_waveStrength;',
      'uniform float u_rippleLifetime;',
      'uniform vec4 u_drops[14];', // each vec4 is: (x, y, startTime, strength)
      'varying vec2 vUv;',

      // Sky Color Generator: Dark brown top -> amber at horizon + black eclipse disc & glowing corona ring
      'vec3 getSkyColor(vec2 uv) {',
      '  float tSky = clamp((uv.y - u_horizon) / max(0.001, 1.0 - u_horizon), 0.0, 1.0);',
      '  vec3 amberHorizon = vec3(0.88, 0.47, 0.22);',
      '  vec3 warmMid      = vec3(0.20, 0.10, 0.05);',
      '  vec3 darkTop      = vec3(0.04, 0.027, 0.02);',
      '  vec3 sky = mix(amberHorizon, warmMid, smoothstep(0.0, 0.35, tSky));',
      '  sky = mix(sky, darkTop, smoothstep(0.35, 1.0, tSky));',

      // Eclipse in upper right
      '  float aspect = u_resolution.x / u_resolution.y;',
      '  vec2 aspectUV = vec2(uv.x * aspect, uv.y);',
      '  float eclipseX = mix(0.80, 0.68, u_mobile);',
      '  vec2 eclipseCenter = vec2(eclipseX * aspect, 0.76);',
      '  float dEclipse = length(aspectUV - eclipseCenter);',
      '  float discR = mix(0.075, 0.055, u_mobile);',
      '  float discEdge = 1.0 - smoothstep(discR - 0.0025, discR + 0.0025, dEclipse);',
      '  sky = mix(sky, vec3(0.005, 0.003, 0.002), discEdge);',
      '  float rDist = max(dEclipse - discR, 0.0);',
      '  float ringGlow = mix(1.0, 0.72, u_mobile) * (1.35 * exp(-rDist * 42.0) + 0.45 * exp(-rDist * 10.0));',
      '  vec3 coronaColor = vec3(1.0, 0.72, 0.40);',
      '  sky += coronaColor * ringGlow * (1.0 - discEdge);',
      '  return sky;',
      '}',

      'void main() {',
      '  vec2 uv = vUv;',
      '  float horizonY = u_horizon;',
      '  float aspect = u_resolution.x / u_resolution.y;',

      // Thin glowing horizon line
      '  float distToHorizon = abs(uv.y - horizonY);',
      '  float horizonGlow = exp(-distToHorizon * 135.0) * 0.95;',
      '  vec3 horizonColor = vec3(0.96, 0.62, 0.32);',

      '  vec3 finalColor;',

      '  if (uv.y >= horizonY) {',
      // UPPER 60%: SKY SCENE
      '    vec3 sky = getSkyColor(uv);',
      '    vec4 obj = texture2D(u_sceneTexture, uv);',
      '    finalColor = sky * (1.0 - obj.a) + obj.rgb;',
      '    finalColor += horizonColor * horizonGlow;',
      '  } else {',
      // LOWER 40%: WATER SCENE
      '    float depth = (horizonY - uv.y) / horizonY;', // 0 at horizon, 1 at bottom

      // Dynamic pointer ripples calculation from 14-drop ring buffer
      '    vec2 rippleOffset = vec2(0.0);',
      '    float rippleGlint = 0.0;',

      '    for (int i = 0; i < 14; i++) {',
      '      vec4 drop = u_drops[i];',
      '      float age = u_time - drop.z;',
      '      if (age > 0.0 && age < u_rippleLifetime) {',
      '        float speed = 0.45;',
      '        float radius = age * speed;',
      '        vec2 delta = vec2((uv.x - drop.x) * aspect, uv.y - drop.y);',
      '        float dist = length(delta);',
      '        float ringDist = abs(dist - radius);',
      '        float ringWidth = 0.08 + age * 0.025;',

      '        if (ringDist < ringWidth) {',
      '          float ringNorm = ringDist / ringWidth;',
      '          float envelope = cos(ringNorm * 3.14159265);',
      '          float wave = sin((dist - radius) * 58.0);',

      // Quadratic decay over ~4s
      '          float decay = (1.0 - age / u_rippleLifetime);',
      '          decay = decay * decay;',

      // Spatial expansion attenuation
      '          float spatialDecay = 1.0 / (1.0 + dist * 3.2);',
      '          float amp = envelope * wave * decay * spatialDecay * drop.w * 0.016 * u_waveStrength;',

      '          vec2 dir = dist > 0.001 ? normalize(delta) : vec2(0.0, 1.0);',
      '          dir.x /= aspect;', // revert aspect for UV displacement

      '          rippleOffset += dir * amp;',
      '          rippleGlint += abs(amp) * 16.0 * (1.0 - depth * 0.4);',
      '        }',
      '      }',
      '    }',

      // Mirrored Y coordinate above horizon with pointer ripple bend
      '    float mirroredY = horizonY + (horizonY - uv.y);',
      '    vec2 reflectedUV = vec2(uv.x + rippleOffset.x, mirroredY + rippleOffset.y);',
      '    reflectedUV = clamp(reflectedUV, vec2(0.001, horizonY + 0.001), vec2(0.999, 0.999));',

      // Sample reflected sky and the rotating, stacked charger.
      '    vec3 refSky = getSkyColor(reflectedUV);',
      '    vec4 refObj = texture2D(u_sceneTexture, reflectedUV);',
      '    vec3 refScene = refSky * (1.0 - refObj.a) + refObj.rgb;',

      // Water depth fade into deep warm water
      '    vec3 deepWater = vec3(0.025, 0.015, 0.01);',
      '    float reflectionFade = exp(-depth * 2.2);',
      '    float textSafeFade = 1.0 - smoothstep(0.12, 0.72, depth);',
      '    reflectionFade *= mix(1.0, textSafeFade, u_mobile);',
      '    vec3 water = mix(deepWater, refScene * vec3(0.85, 0.80, 0.75), reflectionFade * 0.88);',

      // Ripple specular highlights
      '    water += vec3(0.98, 0.72, 0.42) * rippleGlint;',

      // Horizon glow in water
      '    finalColor = water + horizonColor * horizonGlow;',
      '  }',

      '  gl_FragColor = vec4(finalColor, 1.0);',
      '}'
    ].join('\n'),
    depthWrite: false,
    depthTest: false
  });

  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
  postScene.add(postQuad);

  // 15. Visibility & Pause Management (Off-screen or tab hidden)
  let isHeroVisible = true;
  let isTabVisible = !document.hidden;
  let isRendering = false;
  let introCompleted = Boolean(window.innoIntroDone);
  let lastFrameTime = performance.now();

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    lastFrameTime = performance.now();
    checkAndResumeLoop();
  });

  const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isHeroVisible = entry.isIntersecting;
      checkAndResumeLoop();
    });
  }, { threshold: 0.02 });

  heroObserver.observe(heroSection);

  function checkAndResumeLoop() {
    const shouldRender = introCompleted && isHeroVisible && isTabVisible;
    if (shouldRender && !isRendering) {
      isRendering = true;
      requestAnimationFrame(animate);
    }
  }

  // 16. Responsive Sizing & Viewport Positioning
  let basePosY = 0;
  let targetScale = 1.0;
  let horizonScreenY = window.innerHeight * 0.62;
  let introRiseStartedAt = null;
  let introRiseComplete = false;
  let heroReadyDispatched = false;

  function calculateHorizonScreenY() {
    const isMobile = isCompactViewport();
    if (isMobile) return canvas.clientHeight * 0.58;
    const anchor = heroSection.querySelector('.hero-actions');
    const frameRect = canvas.getBoundingClientRect();
    if (!anchor || !frameRect.height) return horizonScreenY;
    const anchorRect = anchor.getBoundingClientRect();
    const screenY = isMobile ? anchorRect.top : anchorRect.bottom + 10;
    return THREE.MathUtils.clamp(screenY - frameRect.top, 0.18 * frameRect.height, 0.88 * frameRect.height);
  }

  function handleResize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const isMobile = isCompactViewport();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    const renderScale = isMobile ? SETTINGS.MOBILE_RENDER_SCALE : 1;

    camera.aspect = width / height;
    camera.fov = isMobile
      ? THREE.MathUtils.clamp(42 + (1.3 - camera.aspect) * 5, 42, 48)
      : 42;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(pr);

    // Update offscreen render target & shader uniforms
    const targetWidth = Math.max(1, Math.round(width * pr * renderScale));
    const targetHeight = Math.max(1, Math.round(height * pr * renderScale));
    renderTarget.setSize(targetWidth, targetHeight);
    postUniforms.u_resolution.value.set(targetWidth, targetHeight);
    if (renderTarget.isWebGLMultisampleRenderTarget) {
      renderTarget.samples = isMobile ? 0 : 4;
    }

    postUniforms.u_mobile.value = isMobile ? 1.0 : 0.0;
    horizonScreenY = calculateHorizonScreenY();
    const horizonUV = 1 - horizonScreenY / height;
    postUniforms.u_horizon.value = THREE.MathUtils.clamp(horizonUV, 0.12, 0.9);

    camera.position.set(0, 0, 8.4);
    const fieldOfView = camera.fov * Math.PI / 180;
    const visibleWorldHeight = 2 * camera.position.z * Math.tan(fieldOfView / 2);
    const navHeight = isMobile
      ? 0
      : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
    const availableSkyPixels = Math.max(70, horizonScreenY - navHeight);
    const availableWorldHeight = visibleWorldHeight * availableSkyPixels / height;
    const availableWorldWidth = visibleWorldHeight * camera.aspect * (isMobile ? 0.60 : 0.30);
    const rotatedWidth = Math.hypot(W, 0.55);
    targetScale = Math.min(
      availableWorldHeight * SETTINGS.OBJECT_FILL / 4.55,
      availableWorldWidth / rotatedWidth
    );
    targetScale = THREE.MathUtils.clamp(targetScale, 0.12, 0.9);
    chargerModel.scale.setScalar(targetScale);
    chargerModel.position.x = isMobile
      ? 0
      : camera.position.z * Math.tan(fieldOfView / 2) * camera.aspect * 0.45;
    const bandCenter = (navHeight + horizonScreenY) * 0.5;
    basePosY = ((height * 0.5 - bandCenter) / height) * visibleWorldHeight + SETTINGS.OBJECT_Y_NUDGE;
    chargerModel.position.y = basePosY;
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  const layoutObserver = new ResizeObserver(handleResize);
  layoutObserver.observe(heroSection);
  const heroContent = heroSection.querySelector('.hero-content');
  const heroActions = heroSection.querySelector('.hero-actions');
  if (heroContent) layoutObserver.observe(heroContent);
  if (heroActions) layoutObserver.observe(heroActions);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(handleResize);
  handleResize();

  // 17. Drag rotation and water-only ripples
  let currentRotX = 0;
  let targetRotX = 0;
  let rotationAngle = Math.PI / 4;
  let rotationUnlocked = false;
  let rotationSpeed = prefersReducedMotion || !rotationUnlocked ? 0 : SETTINGS.AUTO_ROTATION_SPEED;
  let dragState = null;
  let lastRippleMoveTime = 0;

  function addWaterRipple(clientX, clientY, strength) {
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right
      || clientY < rect.top + horizonScreenY || clientY > rect.bottom) return;
    addDrop(
      (clientX - rect.left) / rect.width,
      1 - ((clientY - rect.top) / rect.height),
      strength
    );
  }

  function onPointerDown(event) {
    if (event.target !== canvas || event.button !== 0 || dragState) return;
    canvas.setPointerCapture(event.pointerId);
    dragState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      moved: false,
      dragging: event.pointerType === 'mouse',
      cancelled: false
    };
    targetRotX = 0;
  }

  function onPointerMove(event) {
    if (dragState && event.pointerId === dragState.pointerId) {
      const dx = event.clientX - dragState.lastX;
      const dy = event.clientY - dragState.startY;
      const now = performance.now();
      if (dragState.pointerType !== 'mouse' && !dragState.dragging) {
        if (Math.abs(event.clientX - dragState.startX) < 4 && Math.abs(dy) < 4) return;
        if (Math.abs(dy) >= Math.abs(event.clientX - dragState.startX)) {
          dragState.cancelled = true;
          return;
        }
        dragState.dragging = true;
      }
      if (dragState.dragging) {
        dragState.moved = dragState.moved || Math.abs(event.clientX - dragState.startX) > 4;
        rotationAngle += dx * 0.009;
        const dt = Math.max((now - dragState.lastTime) / 1000, 0.001);
        rotationSpeed = THREE.MathUtils.clamp((dx * 0.009) / dt, -3.8, 3.8);
        dragState.lastX = event.clientX;
        dragState.lastTime = now;
        if (now - lastRippleMoveTime >= 100) {
          lastRippleMoveTime = now;
          addWaterRipple(event.clientX, event.clientY, 0.35);
        }
      }
      return;
    }

    if (event.pointerType === 'mouse') {
      const normY = (event.clientY / window.innerHeight) * 2 - 1;
      targetRotX = prefersReducedMotion ? 0 : THREE.MathUtils.clamp(normY * 0.07, -0.07, 0.07);
      if (event.target === canvas && performance.now() - lastRippleMoveTime >= 140) {
        lastRippleMoveTime = performance.now();
        addWaterRipple(event.clientX, event.clientY, 0.35);
      }
    }
  }

  function onPointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    if (!dragState.moved && !dragState.cancelled) {
      addWaterRipple(event.clientX, event.clientY, 0.65);
    }
    dragState = null;
  }

  function onPointerCancel(event) {
    if (dragState && event.pointerId === dragState.pointerId) dragState = null;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerup', onPointerUp, { passive: true });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: true });

  // 19. Main Animation Loop
  const clock = new THREE.Clock();

  function beginIntroRise(event) {
    if (introRiseStartedAt !== null) return;
    introCompleted = true;
    rotationUnlocked = true;
    rotationSpeed = prefersReducedMotion ? 0 : SETTINGS.AUTO_ROTATION_SPEED;
    introRiseStartedAt = performance.now();
    introRiseComplete = false;
    const splashY = Math.max(0.02, postUniforms.u_horizon.value - 0.025);
    const sunX = event && event.detail && Number.isFinite(event.detail.sunX)
      ? event.detail.sunX
      : (isCompactViewport() ? 0.68 : 0.8);
    addDrop(sunX, splashY, 0.72);
    checkAndResumeLoop();
  }

  window.addEventListener('intro:done', beginIntroRise, { once: true });
  if (introCompleted) beginIntroRise();

  function animate() {
    if (!isHeroVisible || !isTabVisible) {
      isRendering = false;
      return;
    }
    isRendering = true;
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    const now = performance.now();
    const dt = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05);
    lastFrameTime = now;

    // 19d. Pointer tilt and rotation inertia
    if (prefersReducedMotion) {
      currentRotX = 0;
    } else {
      const pointerEase = 1 - Math.exp(-dt * 5);
      currentRotX += (targetRotX - currentRotX) * pointerEase;
    }
    if (!dragState) {
      const returnEase = 1 - Math.exp(-dt * 1.4);
      const autoSpeed = prefersReducedMotion || !rotationUnlocked
        ? 0
        : SETTINGS.AUTO_ROTATION_SPEED;
      rotationSpeed += (autoSpeed - rotationSpeed) * returnEase;
      rotationAngle += rotationSpeed * dt;
    }

    let idleFloatY = 0;
    let idleRotZ = 0;
    let idleRotX = 0;

    if (!prefersReducedMotion) {
      idleFloatY = Math.sin(elapsed * 0.7) * 0.025;
      idleRotZ = Math.sin(elapsed * 0.5) * 0.008;
      idleRotX = Math.cos(elapsed * 0.55) * 0.012;
    }

    // 19e. Keep the five layers stacked and rotate the complete charger.
    const isDesktop = !isCompactViewport();
    chargerModel.rotation.x = currentRotX + (isDesktop ? 0.06 : 0.08) + idleRotX;
    chargerModel.rotation.y = rotationAngle - (isDesktop ? 0.12 : 0.16);
    chargerModel.rotation.z = idleRotZ;
    const riseProgress = introRiseStartedAt === null
      ? 0
      : Math.min(1, (now - introRiseStartedAt) / 2400);
    const riseEase = 1 - Math.pow(1 - riseProgress, 3);
    chargerModel.scale.setScalar(targetScale);
    chargerModel.position.y = basePosY - (1 - riseEase) * 2.2 + idleFloatY;
    if (riseProgress >= 1 && !introRiseComplete) {
      introRiseComplete = true;
    }

    // 19g. Pass 1: Render 3D object to offscreen render target
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // 19h. Pass 2: Render full-screen quad with Sky, Eclipse, Water & Pointer Ripples
    renderer.setRenderTarget(null);
    postUniforms.u_time.value = elapsed;
    renderer.render(postScene, postCamera);

    if (!heroReadyDispatched) {
      heroReadyDispatched = true;
      dispatchHeroEvent('hero:ready');
    }
  }

  // Start rendering
  checkAndResumeLoop();
  }
})();
