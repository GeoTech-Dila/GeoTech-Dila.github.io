(() => {
  const stage = document.getElementById('portfolio-book');
  const canvasHost = document.getElementById('portfolio-book-canvas');
  if (!stage || !canvasHost || !window.THREE) return;

  const TOTAL_SPREADS = 48;
  const TOTAL_PAGES = TOTAL_SPREADS * 2;
  const PAGE_WIDTH = 2.72;
  const PAGE_HEIGHT = 1.985;
  const HAND_OPEN = 'assets/portfolio-book/hand-left.webp';
  const HAND_GRAB = 'assets/portfolio-book/hand-grab-left.webp';
  const textureLoader = new THREE.TextureLoader();
  const textureCache = new Map();
  const pageCounter = stage.querySelector('[data-book-pages]');
  const progressBar = stage.querySelector('[data-book-progress]');
  const loading = stage.querySelector('.portfolio-book-loading');
  const leftHand = stage.querySelector('.portfolio-hand-left');
  const rightHand = stage.querySelector('.portfolio-hand-right');
  const zoomRange = stage.querySelector('[data-book-zoom]');
  const zoomValue = stage.querySelector('[data-book-zoom-value]');

  let renderer;
  let scene;
  let camera;
  let book;
  let baseLeft;
  let baseRight;
  let forwardTurn;
  let backwardTurn;
  let spreadIndex = 0;
  let initialized = false;
  let activeDirection = null;
  let dragStartX = 0;
  let dragProgress = 0;
  let animatingTurn = false;
  let zoom = 1;
  let fitCameraZ = 7;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let buildToken = 0;
  let orbiting = false;
  let orbitStartX = 0;
  let orbitStartY = 0;
  let orbitStartRotationX = -0.34;
  let orbitStartRotationY = 0;
  let targetRotationX = -0.34;
  let targetRotationY = 0;

  function createPageMaterial(side = THREE.FrontSide) {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
  }

  function createPageMesh(x, material) {
    const geometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, 36, 8);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const globalX = positions.getX(index) + x;
      const u = Math.min(1, Math.abs(globalX) / PAGE_WIDTH);
      positions.setZ(index, Math.sin(Math.PI * u) * 0.115 + u * 0.018);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0, 0.165);
    mesh.receiveShadow = true;
    return mesh;
  }

  function createTurn(direction) {
    const geometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, 40, 8);
    geometry.translate(direction === 'forward' ? PAGE_WIDTH / 2 : -PAGE_WIDTH / 2, 0, 0);
    geometry.userData.originalPositions = Float32Array.from(geometry.attributes.position.array);

    const group = new THREE.Group();
    const front = new THREE.Mesh(geometry, createPageMaterial(THREE.FrontSide));
    const back = new THREE.Mesh(geometry, createPageMaterial(THREE.BackSide));
    front.castShadow = true;
    back.castShadow = true;
    front.renderOrder = 4;
    back.renderOrder = 5;
    group.add(front, back);
    group.position.z = 0.185;
    group.visible = false;
    group.userData = { direction, geometry, front, back };
    return group;
  }

  function setPageTexture(mesh, source, half, mirror = false) {
    const previous = mesh.material.map;
    const map = source.clone();
    map.needsUpdate = true;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    if (mirror) {
      map.repeat.set(-0.5, 1);
      map.offset.set(half === 'left' ? 0.5 : 1, 0);
    } else {
      map.repeat.set(0.5, 1);
      map.offset.set(half === 'left' ? 0 : 0.5, 0);
    }
    mesh.material.map = map;
    mesh.material.needsUpdate = true;
    previous?.dispose();
  }

  function loadSpread(index) {
    if (index < 0 || index >= TOTAL_SPREADS) return Promise.resolve(null);
    if (textureCache.has(index)) return textureCache.get(index);
    const promise = new Promise((resolve, reject) => {
      textureLoader.load(
        `assets/portfolio-book/pages/spread-${String(index + 1).padStart(2, '0')}.webp?v=20260822-2`,
        (texture) => {
          if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.userData.spreadIndex = index;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
    textureCache.set(index, promise);
    return promise;
  }

  function preloadAround(index) {
    [index - 1, index, index + 1].forEach((item) => {
      if (item >= 0 && item < TOTAL_SPREADS) loadSpread(item).catch(() => {});
    });
  }

  function updateCounter() {
    const first = spreadIndex * 2 + 1;
    pageCounter.textContent = `${String(first).padStart(2, '0')} / ${String(first + 1).padStart(2, '0')}`;
    progressBar.style.width = `${(spreadIndex / (TOTAL_SPREADS - 1)) * 100}%`;
  }

  async function applySpread(index) {
    const token = ++buildToken;
    const texture = await loadSpread(index);
    if (!texture || token !== buildToken) return;
    spreadIndex = index;
    setPageTexture(baseLeft, texture, 'left');
    setPageTexture(baseRight, texture, 'right');
    forwardTurn.visible = false;
    backwardTurn.visible = false;
    resetTurnGeometry(forwardTurn);
    resetTurnGeometry(backwardTurn);
    updateCounter();
    preloadAround(index);
  }

  function resetTurnGeometry(turn) {
    const { geometry } = turn.userData;
    geometry.attributes.position.array.set(geometry.userData.originalPositions);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    turn.rotation.y = 0;
    turn.rotation.z = 0;
    turn.position.z = 0.185;
  }

  function updateCurl(turn, progress) {
    const { geometry, direction } = turn.userData;
    const positions = geometry.attributes.position;
    const original = geometry.userData.originalPositions;
    const lift = Math.sin(Math.PI * progress) * 0.62;
    for (let index = 0; index < positions.count; index += 1) {
      const originalX = original[index * 3];
      const originalY = original[index * 3 + 1];
      const u = Math.min(1, Math.abs(originalX) / PAGE_WIDTH);
      const verticalCurve = 0.82 + Math.cos((originalY / PAGE_HEIGHT) * Math.PI) * 0.18;
      const baseArch = Math.sin(Math.PI * u) * 0.115 + u * 0.018;
      const paperArc = Math.sin(Math.PI * u) * lift * verticalCurve;
      const looseEdge = Math.sin(Math.PI * progress) * Math.pow(u, 2) * 0.13;
      positions.setZ(index, baseArch + paperArc + looseEdge);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    turn.rotation.y = (direction === 'forward' ? -1 : 1) * Math.PI * progress;
    turn.rotation.z = (direction === 'forward' ? 1 : -1) * Math.sin(Math.PI * progress) * 0.018;
    turn.position.z = 0.185 + Math.sin(Math.PI * progress) * 0.075;
  }

  async function prepareTurn(direction) {
    if (direction === 'forward') {
      if (spreadIndex >= TOTAL_SPREADS - 1) return false;
      const [current, next] = await Promise.all([loadSpread(spreadIndex), loadSpread(spreadIndex + 1)]);
      setPageTexture(baseRight, next, 'right');
      setPageTexture(forwardTurn.userData.front, current, 'right');
      setPageTexture(forwardTurn.userData.back, next, 'left', true);
      forwardTurn.visible = true;
    } else {
      if (spreadIndex <= 0) return false;
      const [current, previous] = await Promise.all([loadSpread(spreadIndex), loadSpread(spreadIndex - 1)]);
      setPageTexture(baseLeft, previous, 'left');
      setPageTexture(backwardTurn.userData.front, current, 'left');
      setPageTexture(backwardTurn.userData.back, previous, 'right', true);
      backwardTurn.visible = true;
    }
    return true;
  }

  function activeTurn() {
    return activeDirection === 'forward' ? forwardTurn : backwardTurn;
  }

  async function beginTurn(direction, clientX) {
    if (activeDirection || animatingTurn) return false;
    const ready = await prepareTurn(direction);
    if (!ready) return false;
    activeDirection = direction;
    dragStartX = clientX;
    dragProgress = 0;
    stage.classList.add('is-dragging');
    const hand = direction === 'forward' ? rightHand : leftHand;
    hand.classList.add('is-grabbing');
    setHandPose(hand, true);
    return true;
  }

  function setTurnProgress(progress) {
    dragProgress = Math.max(0, Math.min(1, progress));
    updateCurl(activeTurn(), dragProgress);
  }

  function animateTurnTo(target) {
    if (!activeDirection) return;
    animatingTurn = true;
    const start = dragProgress;
    const startedAt = performance.now();
    const duration = 360 + Math.abs(target - start) * 260;
    const direction = activeDirection;

    function frame(now) {
      const linear = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - linear, 3);
      setTurnProgress(start + (target - start) * eased);
      if (linear < 1) {
        requestAnimationFrame(frame);
        return;
      }
      finishTurn(target === 1, direction);
    }
    requestAnimationFrame(frame);
  }

  async function finishTurn(completed, direction) {
    if (completed) {
      await applySpread(spreadIndex + (direction === 'forward' ? 1 : -1));
    } else {
      const current = await loadSpread(spreadIndex);
      setPageTexture(direction === 'forward' ? baseRight : baseLeft, current, direction === 'forward' ? 'right' : 'left');
      activeTurn().visible = false;
      resetTurnGeometry(activeTurn());
    }
    leftHand.classList.remove('is-grabbing');
    rightHand.classList.remove('is-grabbing');
    setHandPose(leftHand, false);
    setHandPose(rightHand, false);
    stage.classList.remove('is-dragging');
    activeDirection = null;
    dragProgress = 0;
    animatingTurn = false;
  }

  function moveHand(hand, clientX, clientY, side) {
    const width = hand.getBoundingClientRect().width || 250;
    const x = side === 'left' ? clientX - width * 0.82 : clientX - width * 0.18;
    hand.style.setProperty('--hand-x', `${x}px`);
    hand.style.setProperty('--hand-y', `${clientY - 28}px`);
  }

  function setHandPose(hand, grabbing) {
    const source = grabbing ? HAND_GRAB : HAND_OPEN;
    if (!hand.src.endsWith(source)) hand.src = source;
    hand.classList.toggle('is-pinching', grabbing);
  }

  function resetHands() {
    [leftHand, rightHand].forEach((hand) => {
      hand.style.removeProperty('--hand-x');
      hand.style.removeProperty('--hand-y');
      hand.classList.remove('is-following');
      setHandPose(hand, false);
    });
  }

  function setZoom(nextZoom) {
    zoom = Math.max(0.65, Math.min(2.4, nextZoom));
    stage.classList.toggle('is-zoomed', zoom > 1.15);
    if (zoomRange) zoomRange.value = String(Math.round(zoom * 100));
    if (zoomValue) zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    resize();
  }

  function resetView() {
    targetRotationX = -0.34;
    targetRotationY = 0;
    setZoom(1);
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const aspect = width / height;
    camera.aspect = aspect;
    const verticalFov = camera.fov * Math.PI / 180;
    fitCameraZ = Math.max(6.7, ((PAGE_WIDTH * 2 + 0.3) / (2 * Math.tan(verticalFov / 2) * aspect)) * 1.08);
    camera.position.z = fitCameraZ / zoom;
    if (scene?.fog) {
      scene.fog.near = camera.position.z + 3;
      scene.fog.far = camera.position.z + 20;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  async function init() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x070807, 1);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasHost.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070807, 8, 23);
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.15, 7);

    scene.add(new THREE.HemisphereLight(0xfff7ef, 0x181b17, 1.65));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
    keyLight.position.set(-3.5, 5, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xe26049, 0.85);
    rimLight.position.set(4, -2, 3);
    scene.add(rimLight);

    book = new THREE.Group();
    book.rotation.x = targetRotationX;
    book.rotation.z = 0.012;
    scene.add(book);

    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_WIDTH * 2 + 0.22, PAGE_HEIGHT + 0.22, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x8f2f2a, roughness: 0.72, metalness: 0.04 })
    );
    cover.position.z = -0.07;
    cover.receiveShadow = true;
    book.add(cover);

    const pageBlock = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_WIDTH * 2 + 0.10, PAGE_HEIGHT + 0.10, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xd9d5cd, roughness: 1 })
    );
    pageBlock.position.z = 0.085;
    book.add(pageBlock);

    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, PAGE_HEIGHT + 0.16, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x6d201d, roughness: 0.78 })
    );
    spine.position.z = 0.055;
    book.add(spine);

    baseLeft = createPageMesh(-PAGE_WIDTH / 2, createPageMaterial());
    baseRight = createPageMesh(PAGE_WIDTH / 2, createPageMaterial());
    forwardTurn = createTurn('forward');
    backwardTurn = createTurn('backward');
    book.add(baseLeft, baseRight, forwardTurn, backwardTurn);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 5.4),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 })
    );
    shadow.position.set(0, -0.24, -0.3);
    shadow.receiveShadow = true;
    scene.add(shadow);

    resize();
    await applySpread(0);
    initialized = true;
    loading.classList.add('is-ready');
    animate();
  }

  function animate() {
    if (!renderer) return;
    if (!activeDirection) {
      book.rotation.y += (targetRotationY - book.rotation.y) * 0.11;
      book.rotation.x += (targetRotationX - book.rotation.x) * 0.11;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  async function openBook() {
    stage.hidden = false;
    stage.setAttribute('aria-hidden', 'false');
    document.body.classList.add('book-open');
    if (!initialized && !renderer) await init();
    resize();
    stage.querySelector('[data-close-book]')?.focus({ preventScroll: true });
  }

  function closeBook() {
    if (activeDirection || animatingTurn) return;
    stage.hidden = true;
    stage.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('book-open');
    resetHands();
  }

  stage.addEventListener('pointerdown', async (event) => {
    if (event.target.closest('button, input')) return;
    const normalized = event.clientX / stage.clientWidth;
    const direction = normalized > 0.61 ? 'forward' : normalized < 0.39 ? 'backward' : null;
    if (!direction) {
      orbiting = true;
      orbitStartX = event.clientX;
      orbitStartY = event.clientY;
      orbitStartRotationX = targetRotationX;
      orbitStartRotationY = targetRotationY;
      stage.classList.add('is-orbiting');
      stage.setPointerCapture(event.pointerId);
      return;
    }
    if (await beginTurn(direction, event.clientX)) stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', (event) => {
    pointerTargetX = (event.clientX / stage.clientWidth - 0.5) * 2;
    pointerTargetY = (event.clientY / stage.clientHeight - 0.5) * 2;
    if (orbiting) {
      const deltaX = (event.clientX - orbitStartX) / stage.clientWidth;
      const deltaY = (event.clientY - orbitStartY) / stage.clientHeight;
      targetRotationY = Math.max(-1.25, Math.min(1.25, orbitStartRotationY + deltaX * 3.2));
      targetRotationX = Math.max(-1.2, Math.min(0.45, orbitStartRotationX + deltaY * 2.6));
      return;
    }
    if (activeDirection) {
      const distance = activeDirection === 'forward' ? dragStartX - event.clientX : event.clientX - dragStartX;
      setTurnProgress(distance / (stage.clientWidth * 0.56));
      moveHand(activeDirection === 'forward' ? rightHand : leftHand, event.clientX, event.clientY, activeDirection === 'forward' ? 'right' : 'left');
      return;
    }
    const leftSide = event.clientX < stage.clientWidth / 2;
    leftHand.classList.toggle('is-following', leftSide);
    rightHand.classList.toggle('is-following', !leftSide);
    moveHand(leftSide ? leftHand : rightHand, event.clientX, event.clientY, leftSide ? 'left' : 'right');
  });

  stage.addEventListener('pointerup', () => {
    if (orbiting) {
      orbiting = false;
      stage.classList.remove('is-orbiting');
      resetHands();
      return;
    }
    if (!activeDirection || animatingTurn) return;
    animateTurnTo(dragProgress > 0.34 ? 1 : 0);
  });
  stage.addEventListener('pointercancel', () => {
    if (orbiting) {
      orbiting = false;
      stage.classList.remove('is-orbiting');
    }
    if (activeDirection && !animatingTurn) animateTurnTo(0);
  });
  stage.addEventListener('pointerleave', () => !activeDirection && resetHands());

  document.querySelectorAll('[data-open-book]').forEach((button) => button.addEventListener('click', openBook));
  stage.querySelector('[data-close-book]')?.addEventListener('click', closeBook);
  stage.querySelector('[data-book-reset]')?.addEventListener('click', () => !activeDirection && applySpread(0));
  stage.querySelector('[data-book-view-reset]')?.addEventListener('click', resetView);
  stage.querySelector('[data-book-zoom-in]')?.addEventListener('click', () => {
    setZoom(zoom + 0.15);
  });
  stage.querySelector('[data-book-zoom-out]')?.addEventListener('click', () => {
    setZoom(zoom - 0.15);
  });
  zoomRange?.addEventListener('input', () => setZoom(Number(zoomRange.value) / 100));
  stage.addEventListener('wheel', (event) => {
    if (event.target.closest('button, input')) return;
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08));
  }, { passive: false });

  window.addEventListener('resize', resize);
  document.addEventListener('keydown', (event) => {
    if (stage.hidden) return;
    if (event.key === 'Escape') closeBook();
    if (event.key === 'ArrowRight' && !activeDirection && !animatingTurn) beginTurn('forward', stage.clientWidth).then((ready) => ready && animateTurnTo(1));
    if (event.key === 'ArrowLeft' && !activeDirection && !animatingTurn) beginTurn('backward', 0).then((ready) => ready && animateTurnTo(1));
  });
})();
