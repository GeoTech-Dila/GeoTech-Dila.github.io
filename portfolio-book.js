(() => {
  const stage = document.getElementById('portfolio-book');
  const canvasHost = document.getElementById('portfolio-book-canvas');
  if (!stage || !canvasHost || !window.THREE) return;

  const TOTAL_SPREADS = 48;
  const TOTAL_PAGES = TOTAL_SPREADS * 2;
  const PAGE_WIDTH = 2.72;
  const PAGE_HEIGHT = 1.985;
  const HAND_OPEN = 'assets/portfolio-book/hand-left-v2.webp?v=20260823-2';
  const HAND_GRAB = 'assets/portfolio-book/hand-grab-left-v2.webp?v=20260823-2';
  const textureLoader = new THREE.TextureLoader();
  const textureCache = new Map();
  const pageCounter = stage.querySelector('[data-book-pages]');
  const progressBar = stage.querySelector('[data-book-progress]');
  const loading = stage.querySelector('.portfolio-book-loading');
  const leftHand = stage.querySelector('.portfolio-hand-left');
  const rightHand = stage.querySelector('.portfolio-hand-right');
  const cursorHint = stage.querySelector('.portfolio-book-cursor-hint');
  const zoomRange = stage.querySelector('[data-book-zoom]');
  const zoomValue = stage.querySelector('[data-book-zoom-value]');
  const analysisHud = stage.querySelector('.portfolio-analysis-hud');
  const scanLine = stage.querySelector('.portfolio-scan-line');
  const analysisProject = stage.querySelector('[data-analysis-project]');
  const analysisLocation = stage.querySelector('[data-analysis-location]');
  const analysisType = stage.querySelector('[data-analysis-type]');
  const analysisTools = stage.querySelector('[data-analysis-tools]');

  const ANALYSIS_PROFILES = [
    { through: 1, project: 'GeoTech.D portfolyo seçkisi', location: 'Türkiye', analysis: 'Yetkinlik + Mekânsal yaklaşım', tools: 'QGIS · Python · CityEngine' },
    { through: 4, project: 'Mesleki gelişim ve sertifikalar', location: 'İzmir', analysis: 'AR-GE + İklim + Tasarım', tools: 'Archify · Climathon' },
    { through: 8, project: 'Python çalışmaları', location: 'Dijital çalışma alanı', analysis: 'Veri üretimi + Otomasyon', tools: 'Python · Jupyter' },
    { through: 9, project: 'Şehir planlama proje seçkisi', location: 'İzmir + Sakarya', analysis: 'Stüdyo projeleri + Araştırma', tools: 'QGIS · Netcad · CityEngine' },
    { through: 11, project: 'Şehir Planlama Projesi II', location: 'İzmir · Bayraklı', analysis: 'Alan analizi + Yerleşim planı', tools: 'QGIS · AutoCAD' },
    { through: 23, project: 'Şehir Planlama Projesi III', location: 'İzmir · Selçuk', analysis: 'Üst ölçek + Mevcut durum + Sentez', tools: 'QGIS · Netcad · SPSS' },
    { through: 31, project: 'Şehir Planlama Projesi IV', location: 'İzmir · Selçuk', analysis: 'Uygulama planı + 3B modelleme', tools: 'QGIS · AutoCAD · CityEngine' },
    { through: 40, project: 'Su kaynaklarına duyarlı sektörel kalkınma', location: 'Sakarya', analysis: 'Su kaynakları + Sektör + Afet riski', tools: 'QGIS · SPSS · AutoCAD' },
    { through: 45, project: 'TÜBİTAK 2209-A kentsel ısı adası', location: 'İzmir · Konak', analysis: 'Termal yüzey + Gölge + Yaya konforu', tools: 'Google Earth Engine · QGIS · CityEngine' },
    { through: 47, project: 'Geleceğin kentleri için GeoTech.D', location: 'Akıllı kentler', analysis: 'Mekânsal planlama + Dijital çözüm', tools: 'QGIS · Python · CityEngine' }
  ];

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
  let zoom = 0.88;
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
  let neonFrame;
  let memoryBackdrop;
  let memoryPulse = 0;
  let memoryWorldIndex = -1;
  const memoryWorlds = [];
  const particleSystems = [];
  let analysisProfileIndex = -1;
  let analysisRefreshTimer;
  const scanStartedAt = performance.now();

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

  function memoryMaterial(color, opacity, lit = false) {
    const Material = lit ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
    const material = new Material({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: lit
    });
    if (lit) {
      material.roughness = .7;
      material.metalness = .08;
    }
    material.userData.baseOpacity = opacity;
    return material;
  }

  function addMemoryObject(world, object) {
    object.traverse((child) => {
      if (!child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.depthWrite = false;
        if (material.userData.baseOpacity == null) material.userData.baseOpacity = material.opacity;
        material.opacity = 0;
      });
    });
    world.add(object);
    return object;
  }

  function memoryLine(points, color, opacity, closed = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    material.userData.baseOpacity = opacity;
    return closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  }

  function createCoastalWorld(world) {
    const coast = [];
    for (let step = 0; step <= 36; step += 1) {
      const y = -2.65 + step * .15;
      coast.push(new THREE.Vector3(-4.18 - Math.sin(step * .42) * .24, y, .12));
    }
    addMemoryObject(world, memoryLine(coast, 0x7ad8dc, .72));
    addMemoryObject(world, memoryLine(coast.map((point) => point.clone().add(new THREE.Vector3(-.11, 0, -.02))), 0xeaf7f2, .22));

    [-1.82, 1.82].forEach((baseY, routeIndex) => {
      const route = [];
      for (let step = 0; step <= 52; step += 1) {
        const x = -5.2 + step * .2;
        route.push(new THREE.Vector3(x, baseY + Math.sin(step * .23 + routeIndex) * .12, .06));
      }
      addMemoryObject(world, memoryLine(route, routeIndex ? 0xff8066 : 0xe3e9e2, routeIndex ? .42 : .22));
      addMemoryObject(world, memoryLine(route.map((point) => point.clone().add(new THREE.Vector3(0, .07, -.01))), 0xff9b85, .12));
    });

    const buildingData = [
      [-4.28, -1.65, .48, 1.15], [-3.78, -.6, .64, 1.75], [-3.4, 1.02, .45, 1.2],
      [3.25, -1.52, .52, 1.35], [3.72, -.12, .7, 2.05], [4.28, 1.15, .5, 1.48],
      [-2.72, 2.02, .7, .52], [-1.72, 2.16, .92, .42], [1.62, 2.12, .88, .46], [2.68, 1.98, .64, .58]
    ];
    buildingData.forEach(([x, y, width, height], index) => {
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, .34 + index % 2 * .1),
        memoryMaterial(index % 3 === 1 ? 0xe26049 : index % 3 === 2 ? 0xb8dadd : 0xf3eee6, .24, true)
      );
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(building.geometry),
        memoryMaterial(index % 3 === 1 ? 0xff8a72 : 0xe8f1ed, .52)
      );
      building.add(edges);
      building.position.set(x, y, .02 + index * .015);
      building.rotation.z = (index % 2 ? 1 : -1) * .025;
      addMemoryObject(world, building);
    });

    [-4.65, -3.55, 3.08, 4.58].forEach((x, index) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(.035, .32, .035), memoryMaterial(0xffb19f, .5));
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(.18, 0), memoryMaterial(0xb8d7c3, .42, true));
      crown.scale.y = 1.16;
      crown.position.y = .32;
      tree.add(trunk, crown);
      tree.position.set(x, index % 2 ? -2 : 2.05, .16);
      addMemoryObject(world, tree);
    });
  }

  function createWaterWorld(world) {
    const riverPoints = [];
    for (let step = 0; step <= 48; step += 1) {
      const x = -5.4 + step * .225;
      const y = 1.62 + Math.sin(step * .3) * .28 + Math.sin(step * .83) * .06;
      riverPoints.push(new THREE.Vector3(x, y, .08));
    }
    [-.12, 0, .12].forEach((offset, index) => {
      addMemoryObject(world, memoryLine(
        riverPoints.map((point) => point.clone().add(new THREE.Vector3(0, offset, -index * .01))),
        index === 1 ? 0x7ce3e7 : 0xbfeaec,
        index === 1 ? .78 : .2
      ));
    });

    [[-4.3, -1.8], [-3.55, -.95], [3.25, -1.65], [4.2, -.75], [4.55, .55]].forEach(([x, y], index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(.16 + index % 2 * .035, .018, 8, 32),
        memoryMaterial(index % 2 ? 0xff8a70 : 0xb7f0ee, .72)
      );
      ring.position.set(x, y, .14);
      addMemoryObject(world, ring);
    });

    [[-4.55, -.65, .8, .45], [-3.72, -1.82, 1.08, .38], [3.65, -1.25, 1.18, .46], [4.35, .25, .72, .55]].forEach(([x, y, width, height], index) => {
      const sector = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, .16),
        memoryMaterial(index % 2 ? 0xd8e6ce : 0xe26049, .24, true)
      );
      sector.position.set(x, y, 0);
      addMemoryObject(world, sector);
    });
  }

  function createTerrainWorld(world) {
    for (let layer = 0; layer < 9; layer += 1) {
      const points = [];
      const radiusX = 3.1 + layer * .25;
      const radiusY = 1.25 + layer * .16;
      for (let step = 0; step < 80; step += 1) {
        const angle = (step / 80) * Math.PI * 2;
        const variation = Math.sin(angle * 3 + layer) * .1 + Math.cos(angle * 5 - layer) * .045;
        points.push(new THREE.Vector3(
          Math.cos(angle) * (radiusX + variation),
          Math.sin(angle) * (radiusY + variation),
          -.08 - layer * .025
        ));
      }
      addMemoryObject(world, memoryLine(points, layer % 3 === 0 ? 0xff8066 : 0xd5e2d6, layer % 3 === 0 ? .42 : .14, true));
    }

    [[-4.4, 1.62, .68, .3], [-3.55, 2.08, .9, .26], [3.45, 1.72, .82, .32], [4.35, 2.18, .66, .25], [-4.15, -2.05, .74, .28], [4.05, -2, .9, .3]].forEach(([x, y, width, height], index) => {
      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, .12 + index * .025),
        memoryMaterial(index % 2 ? 0xe26049 : 0xcad8bf, .28, true)
      );
      terrace.position.set(x, y, .02);
      terrace.rotation.z = (index % 2 ? 1 : -1) * .12;
      addMemoryObject(world, terrace);
    });
  }

  function createDataWorld(world) {
    for (let layer = 0; layer < 5; layer += 1) {
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(6.4 + layer * .42, 2.65 + layer * .25, .035)),
        memoryMaterial(layer % 2 ? 0x78d7da : 0xff8066, .18 + layer * .035)
      );
      frame.position.set((layer - 2) * .05, (layer - 2) * .07, -.12 - layer * .13);
      frame.rotation.z = (layer - 2) * .012;
      addMemoryObject(world, frame);
    }

    [-4.45, -3.92, -3.38, 3.35, 3.92, 4.48].forEach((x, index) => {
      const height = .62 + (index * .47) % 1.55;
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(.26, height, .26),
        memoryMaterial(index % 3 === 0 ? 0xe26049 : index % 2 ? 0xb9dce0 : 0xf0ede4, .3, true)
      );
      column.position.set(x, -2.25 + height / 2, .06);
      addMemoryObject(world, column);
    });

    const nodePositions = [];
    for (let index = 0; index < 34; index += 1) {
      const side = index % 2 ? 1 : -1;
      nodePositions.push(side * (3.05 + (index * .27) % 1.8), -2.1 + (index * .49) % 4.25, .16);
    }
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    const nodeMaterial = new THREE.PointsMaterial({
      color: 0xffa18d,
      size: .045,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    nodeMaterial.userData.baseOpacity = .82;
    addMemoryObject(world, new THREE.Points(nodeGeometry, nodeMaterial));
  }

  function createMemoryBackdrop() {
    memoryBackdrop = new THREE.Group();
    memoryBackdrop.position.z = -1.34;
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 9),
      new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })
    );
    wall.position.z = -.72;
    memoryBackdrop.add(wall);

    const ribbons = [
      { color: 0xff705a, count: 360, phase: .2, width: .42, mode: 0, opacity: .92 },
      { color: 0x75efad, count: 340, phase: 1.8, width: .38, mode: 1, opacity: .82 },
      { color: 0xffb09f, count: 260, phase: 3.3, width: .28, mode: 2, opacity: .7 },
      { color: 0x9be5bc, count: 280, phase: 4.7, width: .32, mode: 3, opacity: .72 },
      { color: 0xff5f52, count: 240, phase: 5.8, width: .24, mode: 4, opacity: .88 },
      { color: 0xff7863, count: 420, phase: 7.1, width: .36, mode: 5, opacity: .94 },
      { color: 0x6ff3ae, count: 400, phase: 8.6, width: .34, mode: 6, opacity: .9 }
    ];

    function random(seed) {
      const value = Math.sin(seed * 91.345 + 17.17) * 43758.5453;
      return value - Math.floor(value);
    }

    ribbons.forEach((ribbon, ribbonIndex) => {
      const positions = new Float32Array(ribbon.count * 3);
      const sizes = new Float32Array(ribbon.count);
      const phases = new Float32Array(ribbon.count);
      const alphas = new Float32Array(ribbon.count);

      for (let index = 0; index < ribbon.count; index += 1) {
        const t = index / Math.max(1, ribbon.count - 1);
        let x;
        let y;
        if (ribbon.mode === 0) {
          x = -6.35 + t * 12.7;
          y = -2.55 + t * 5.1 + Math.sin(t * Math.PI * 4.2) * .58;
        } else if (ribbon.mode === 1) {
          x = 6.2 - t * 12.4;
          y = -1.7 + t * 3.45 + Math.cos(t * Math.PI * 3.1) * .72;
        } else if (ribbon.mode === 2) {
          x = -2.45 + Math.sin(t * Math.PI * 1.45) * 3.25;
          y = -4.25 + t * 8.5;
        } else if (ribbon.mode === 3) {
          x = 2.5 + Math.cos(t * Math.PI * 1.55) * 2.65;
          y = 4.15 - t * 8.3;
        } else if (ribbon.mode === 4) {
          x = -5.65 + t * 11.3;
          y = .15 + Math.sin(t * Math.PI * 6.4) * 1.05;
        } else if (ribbon.mode === 5) {
          x = -6.25 + t * 12.5;
          y = 2.25 + Math.sin(t * Math.PI * 3.5) * .42 + Math.cos(t * Math.PI * 8) * .12;
        } else {
          x = 6.2 - t * 12.4;
          y = -2.28 + Math.cos(t * Math.PI * 3.8) * .38 + Math.sin(t * Math.PI * 7.2) * .13;
        }

        const spread = ribbon.width * (.28 + Math.sin(Math.PI * t) * .9);
        const scatterX = (random(index + ribbonIndex * 401) - .5) * spread;
        const scatterY = (random(index * 2.7 + ribbonIndex * 719) - .5) * spread;
        positions[index * 3] = x + scatterX;
        positions[index * 3 + 1] = y + scatterY;
        positions[index * 3 + 2] = -.18 + random(index * 4.1 + ribbonIndex * 89) * .48;
        sizes[index] = 1.85 + Math.pow(random(index * 7.9 + ribbonIndex * 31), 2.05) * 6.2;
        phases[index] = ribbon.phase + t * 10 + random(index * 5.3) * 3;
        alphas[index] = .28 + random(index * 11.7 + ribbonIndex) * .72;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(ribbon.color) },
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uOpacity: { value: ribbon.opacity }
        },
        vertexShader: `
          uniform float uTime;
          uniform float uPulse;
          attribute float aSize;
          attribute float aPhase;
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vec3 animated = position;
            animated.x += sin(uTime * .42 + aPhase) * .035;
            animated.y += cos(uTime * .34 + aPhase * 1.31) * .035;
            vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
            float twinkle = 1.0 + sin(uTime * 1.7 + aPhase * 2.2) * .16;
            gl_PointSize = aSize * twinkle * (1.0 + uPulse * .72);
            gl_Position = projectionMatrix * viewPosition;
            vAlpha = aAlpha;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(.5));
            float core = 1.0 - smoothstep(.03, .24, distanceToCenter);
            float glow = 1.0 - smoothstep(.08, .5, distanceToCenter);
            float alpha = (core * .9 + glow * .72) * vAlpha * uOpacity;
            if (alpha < .012) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false
      });
      const particles = new THREE.Points(geometry, material);
      particles.rotation.z = (ribbonIndex - 2) * .025;
      particles.userData.phase = ribbon.phase;
      particleSystems.push(particles);
      memoryBackdrop.add(particles);
    });
    scene.add(memoryBackdrop);
  }

  function updateMemoryScene(index) {
    memoryWorldIndex = Math.floor(index / 12);
    memoryPulse = 1;
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

  function updateAnalysisProfile(index) {
    if (!analysisHud) return;
    const matchedIndex = ANALYSIS_PROFILES.findIndex((profile) => index <= profile.through);
    const nextIndex = matchedIndex === -1 ? ANALYSIS_PROFILES.length - 1 : matchedIndex;
    if (nextIndex === analysisProfileIndex) return;
    analysisProfileIndex = nextIndex;
    const profile = ANALYSIS_PROFILES[nextIndex];
    analysisProject.textContent = profile.project;
    analysisLocation.textContent = profile.location;
    analysisType.textContent = profile.analysis;
    analysisTools.textContent = profile.tools;
    analysisHud.classList.remove('is-refreshing');
    void analysisHud.offsetWidth;
    analysisHud.classList.add('is-refreshing');
    window.clearTimeout(analysisRefreshTimer);
    analysisRefreshTimer = window.setTimeout(() => analysisHud.classList.remove('is-refreshing'), 620);
  }

  function screenPoint(x, y, z, width, height) {
    const point = new THREE.Vector3(x, y, z).applyMatrix4(book.matrixWorld).project(camera);
    return {
      x: (point.x * .5 + .5) * width,
      y: (-point.y * .5 + .5) * height
    };
  }

  function updateAnalysisHud(now) {
    if (!analysisHud || !scanLine || !book || !camera) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    book.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const topLeft = screenPoint(-PAGE_WIDTH - .08, PAGE_HEIGHT / 2 + .08, .2, width, height);
    const topRight = screenPoint(PAGE_WIDTH + .08, PAGE_HEIGHT / 2 + .08, .2, width, height);
    const bottomLeft = screenPoint(-PAGE_WIDTH - .08, -PAGE_HEIGHT / 2 - .08, .2, width, height);
    const bottomRight = screenPoint(PAGE_WIDTH + .08, -PAGE_HEIGHT / 2 - .08, .2, width, height);
    const left = Math.max(10, Math.min(topLeft.x, bottomLeft.x));
    const right = Math.min(width - 10, Math.max(topRight.x, bottomRight.x));
    const top = Math.max(74, Math.min(topLeft.y, topRight.y));
    const bottom = Math.min(height - 72, Math.max(bottomLeft.y, bottomRight.y));
    const progress = ((now - scanStartedAt) % 5200) / 5200;
    const scanY = top + (bottom - top) * (.04 + progress * .92);

    scanLine.style.left = `${left}px`;
    scanLine.style.top = `${scanY}px`;
    scanLine.style.width = `${Math.max(0, right - left)}px`;
    analysisHud.style.setProperty('--analysis-left', `${left + 8}px`);
    analysisHud.style.setProperty('--analysis-right', `${right - 8}px`);
    analysisHud.style.setProperty('--analysis-top', `${Math.max(82, top - 66)}px`);
    analysisHud.style.setProperty('--analysis-bottom', `${Math.min(height - 58, bottom + 15)}px`);
  }

  async function applySpread(index) {
    const token = ++buildToken;
    const texture = await loadSpread(index);
    if (!texture || token !== buildToken) return;
    spreadIndex = index;
    updateMemoryScene(index);
    updateAnalysisProfile(index);
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
    const normalOrientation = Math.cos(Math.PI * progress);
    for (let index = 0; index < positions.count; index += 1) {
      const originalX = original[index * 3];
      const originalY = original[index * 3 + 1];
      const u = Math.min(1, Math.abs(originalX) / PAGE_WIDTH);
      const verticalCurve = 0.82 + Math.cos((originalY / PAGE_HEIGHT) * Math.PI) * 0.18;
      const baseArch = Math.sin(Math.PI * u) * 0.115 + u * 0.018;
      const paperArc = Math.sin(Math.PI * u) * lift * verticalCurve;
      const looseEdge = Math.sin(Math.PI * progress) * Math.pow(u, 2) * 0.13;
      positions.setZ(index, (baseArch + paperArc + looseEdge) * normalOrientation);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    turn.rotation.y = (direction === 'forward' ? -1 : 1) * Math.PI * progress;
    turn.rotation.z = (direction === 'forward' ? 1 : -1) * Math.sin(Math.PI * progress) * 0.018;
    const landingLift = Math.pow(progress, 3) * 0.042;
    turn.position.z = 0.185 + Math.sin(Math.PI * progress) * 0.075 + landingLift;
  }

  async function prepareTurn(direction) {
    if (direction === 'forward') {
      if (spreadIndex >= TOTAL_SPREADS - 1) return false;
      const [current, next] = await Promise.all([loadSpread(spreadIndex), loadSpread(spreadIndex + 1)]);
      setPageTexture(baseRight, next, 'right');
      setPageTexture(forwardTurn.userData.front, current, 'right');
      setPageTexture(forwardTurn.userData.back, next, 'left', true);
      forwardTurn.userData.sourceTexture = current;
      forwardTurn.userData.targetTexture = next;
      forwardTurn.userData.targetIndex = spreadIndex + 1;
      forwardTurn.visible = true;
    } else {
      if (spreadIndex <= 0) return false;
      const [current, previous] = await Promise.all([loadSpread(spreadIndex), loadSpread(spreadIndex - 1)]);
      setPageTexture(baseLeft, previous, 'left');
      setPageTexture(backwardTurn.userData.front, current, 'left');
      setPageTexture(backwardTurn.userData.back, previous, 'right', true);
      backwardTurn.userData.sourceTexture = current;
      backwardTurn.userData.targetTexture = previous;
      backwardTurn.userData.targetIndex = spreadIndex - 1;
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
    positionActiveHand();
    return true;
  }

  function setTurnProgress(progress) {
    dragProgress = Math.max(0, Math.min(1, progress));
    updateCurl(activeTurn(), dragProgress);
    positionActiveHand();
  }

  function animateTurnTo(target) {
    if (!activeDirection) return;
    animatingTurn = true;
    const start = dragProgress;
    const startedAt = performance.now();
    const duration = 460 + Math.abs(target - start) * 340;
    const direction = activeDirection;

    function frame(now) {
      const linear = Math.min(1, (now - startedAt) / duration);
      const eased = linear * linear * (3 - 2 * linear);
      setTurnProgress(start + (target - start) * eased);
      if (linear < 1) {
        requestAnimationFrame(frame);
        return;
      }
      finishTurn(target === 1, direction);
    }
    requestAnimationFrame(frame);
  }

  function finishTurn(completed, direction) {
    const turn = activeTurn();
    if (completed) {
      const texture = turn.userData.targetTexture;
      spreadIndex = turn.userData.targetIndex;
      updateMemoryScene(spreadIndex);
      updateAnalysisProfile(spreadIndex);
      setPageTexture(baseLeft, texture, 'left');
      setPageTexture(baseRight, texture, 'right');
      forwardTurn.visible = false;
      backwardTurn.visible = false;
      resetTurnGeometry(forwardTurn);
      resetTurnGeometry(backwardTurn);
      updateCounter();
      preloadAround(spreadIndex);
    } else {
      setPageTexture(
        direction === 'forward' ? baseRight : baseLeft,
        turn.userData.sourceTexture,
        direction === 'forward' ? 'right' : 'left'
      );
      turn.visible = false;
      resetTurnGeometry(turn);
    }
    turn.userData.sourceTexture = null;
    turn.userData.targetTexture = null;
    turn.userData.targetIndex = null;
    leftHand.classList.remove('is-grabbing');
    rightHand.classList.remove('is-grabbing');
    setHandPose(leftHand, false);
    setHandPose(rightHand, false);
    stage.classList.remove('is-dragging');
    activeDirection = null;
    dragProgress = 0;
    animatingTurn = false;
  }

  function projectToStage(point) {
    const rect = stage.getBoundingClientRect();
    point.project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * rect.width,
      y: (-point.y * 0.5 + 0.5) * rect.height
    };
  }

  function getBookCorner(side) {
    if (!book || !camera) return null;
    const point = new THREE.Vector3(side === 'left' ? -PAGE_WIDTH : PAGE_WIDTH, -PAGE_HEIGHT / 2, 0.24);
    book.localToWorld(point);
    return projectToStage(point);
  }

  function getBookScreenPolygon() {
    if (!book || !camera) return [];
    return [
      [-PAGE_WIDTH, PAGE_HEIGHT / 2],
      [PAGE_WIDTH, PAGE_HEIGHT / 2],
      [PAGE_WIDTH, -PAGE_HEIGHT / 2],
      [-PAGE_WIDTH, -PAGE_HEIGHT / 2]
    ].map(([x, y]) => {
      const point = new THREE.Vector3(x, y, 0.24);
      book.localToWorld(point);
      return projectToStage(point);
    });
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const currentPoint = polygon[index];
      const previousPoint = polygon[previous];
      const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
        && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
          / (previousPoint.y - currentPoint.y) + currentPoint.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function updateCursorHint(clientX, clientY) {
    if (!cursorHint || orbiting) return;
    const rect = stage.getBoundingClientRect();
    const point = { x: clientX - rect.left, y: clientY - rect.top };
    const normalizedX = point.x / rect.width;
    const canTurnBackward = normalizedX < 0.43 && spreadIndex > 0;
    const canTurnForward = normalizedX > 0.57 && spreadIndex < TOTAL_SPREADS - 1;
    const overBook = (canTurnBackward || canTurnForward)
      && pointInPolygon(point, getBookScreenPolygon());
    cursorHint.style.setProperty('--cursor-x', `${point.x}px`);
    cursorHint.style.setProperty('--cursor-y', `${point.y}px`);
    stage.classList.toggle('is-book-hover', overBook);
  }

  function hideCursorHint() {
    stage.classList.remove('is-book-hover');
  }

  function getTurningCorner() {
    const turn = activeTurn();
    if (!turn || !activeDirection) return null;
    const positions = turn.userData.geometry.attributes.position;
    const rowStart = positions.count - 41;
    const index = activeDirection === 'forward' ? positions.count - 1 : rowStart;
    const point = new THREE.Vector3(positions.getX(index), positions.getY(index), positions.getZ(index));
    turn.localToWorld(point);
    return projectToStage(point);
  }

  function placeHandAtContact(hand, contact, side, grabbing) {
    if (!contact) return;
    const rect = hand.getBoundingClientRect();
    const width = rect.width || 250;
    const height = rect.height || width * 1.48;
    const anchorX = grabbing ? (side === 'left' ? 0.91 : 0.09) : (side === 'left' ? 0.86 : 0.14);
    const anchorY = grabbing ? 0.105 : 0.045;
    hand.style.setProperty('--hand-x', `${contact.x - width * anchorX}px`);
    hand.style.setProperty('--hand-y', `${contact.y - height * anchorY}px`);
  }

  function positionActiveHand() {
    if (!activeDirection) return;
    const side = activeDirection === 'forward' ? 'right' : 'left';
    placeHandAtContact(side === 'right' ? rightHand : leftHand, getTurningCorner(), side, true);
  }

  function positionIdleHand(hand, clientX, side) {
    const corner = getBookCorner(side);
    if (!corner) return;
    const inward = side === 'left' ? 1 : -1;
    const pointerOffset = Math.max(0, Math.min(34, Math.abs(clientX - corner.x) * 0.08));
    placeHandAtContact(hand, {
      x: corner.x + inward * pointerOffset,
      y: corner.y + 10
    }, side, false);
  }

  function positionRestingHands() {
    const leftCorner = getBookCorner('left');
    const rightCorner = getBookCorner('right');
    if (leftCorner) placeHandAtContact(leftHand, { x: leftCorner.x - 18, y: leftCorner.y + 18 }, 'left', false);
    if (rightCorner) placeHandAtContact(rightHand, { x: rightCorner.x + 18, y: rightCorner.y + 18 }, 'right', false);
  }

  function setHandPose(hand, grabbing) {
    const source = grabbing ? HAND_GRAB : HAND_OPEN;
    if (!hand.src.endsWith(source)) hand.src = source;
    hand.classList.toggle('is-pinching', grabbing);
  }

  function resetHands() {
    [leftHand, rightHand].forEach((hand) => {
      hand.classList.remove('is-following');
      setHandPose(hand, false);
    });
    requestAnimationFrame(positionRestingHands);
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
    setZoom(0.88);
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
    if (initialized && !activeDirection) requestAnimationFrame(positionRestingHands);
  }

  async function init() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x000000, 1);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasHost.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 23);
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

    const coverGeometry = new THREE.BoxGeometry(PAGE_WIDTH * 2 + 0.22, PAGE_HEIGHT + 0.22, 0.18);
    const cover = new THREE.Mesh(
      coverGeometry,
      new THREE.MeshStandardMaterial({ color: 0x8f2f2a, roughness: 0.72, metalness: 0.04 })
    );
    cover.position.z = -0.07;
    cover.receiveShadow = true;
    book.add(cover);

    neonFrame = new THREE.Group();
    const frameLayers = [
      { scale: 1.002, color: 0xffe1d9, opacity: 1 },
      { scale: 1.018, color: 0xff765c, opacity: .84 },
      { scale: 1.052, color: 0xe26049, opacity: .48 },
      { scale: 1.095, color: 0xd94f3d, opacity: .22 }
    ];
    neonFrame.userData.layers = frameLayers.map((layer, index) => {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(coverGeometry),
        new THREE.LineBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          blending: index ? THREE.AdditiveBlending : THREE.NormalBlending,
          depthWrite: false,
          toneMapped: false
        })
      );
      edges.scale.set(layer.scale, layer.scale, 1 + (layer.scale - 1) * 2);
      edges.position.z = -0.07;
      edges.renderOrder = 3 + index;
      edges.userData.baseOpacity = layer.opacity;
      neonFrame.add(edges);
      return edges;
    });
    neonFrame.userData.glowBars = [];
    const coverWidth = PAGE_WIDTH * 2 + 0.22;
    const coverHeight = PAGE_HEIGHT + 0.22;
    [
      { thickness: .03, spread: .012, color: 0xffe0d8, opacity: 1 },
      { thickness: .105, spread: .052, color: 0xff765c, opacity: .62 },
      { thickness: .24, spread: .12, color: 0xe26049, opacity: .27 },
      { thickness: .42, spread: .21, color: 0xd94f3d, opacity: .1 }
    ].forEach((layer, layerIndex) => {
      const material = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const horizontalGeometry = new THREE.BoxGeometry(
        coverWidth + layer.spread * 2,
        layer.thickness,
        .022
      );
      const verticalGeometry = new THREE.BoxGeometry(
        layer.thickness,
        coverHeight + layer.spread * 2,
        .022
      );
      const top = new THREE.Mesh(horizontalGeometry, material);
      const bottom = new THREE.Mesh(horizontalGeometry, material);
      const left = new THREE.Mesh(verticalGeometry, material);
      const right = new THREE.Mesh(verticalGeometry, material);
      top.position.set(0, coverHeight / 2 + layer.spread, .035);
      bottom.position.set(0, -coverHeight / 2 - layer.spread, .035);
      left.position.set(-coverWidth / 2 - layer.spread, 0, .035);
      right.position.set(coverWidth / 2 + layer.spread, 0, .035);
      [top, bottom, left, right].forEach((bar) => {
        bar.renderOrder = 2 + layerIndex;
        bar.userData.baseOpacity = layer.opacity;
        neonFrame.add(bar);
        neonFrame.userData.glowBars.push(bar);
      });
    });
    book.add(neonFrame);

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

    const spineNeon = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, PAGE_HEIGHT + 0.11, 0.025),
      new THREE.MeshBasicMaterial({
        color: 0xff8a70,
        transparent: true,
        opacity: .86,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    spineNeon.position.z = 0.192;
    spineNeon.renderOrder = 6;
    spineNeon.userData.baseOpacity = .86;
    neonFrame.add(spineNeon);
    neonFrame.userData.spine = spineNeon;

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
    resetHands();
    animate();
  }

  function animate() {
    if (!renderer) return;
    const now = performance.now();
    if (!activeDirection) {
      book.rotation.y += (targetRotationY - book.rotation.y) * 0.11;
      book.rotation.x += (targetRotationX - book.rotation.x) * 0.11;
    }
    if (neonFrame) {
      const pulse = .94 + Math.sin(now * .00135) * .06;
      neonFrame.userData.layers.forEach((layer, index) => {
        layer.material.opacity = layer.userData.baseOpacity * (pulse - index * .045);
      });
      neonFrame.userData.glowBars.forEach((bar, index) => {
        bar.material.opacity = bar.userData.baseOpacity * (pulse - Math.floor(index / 4) * .04);
      });
      neonFrame.userData.spine.material.opacity = neonFrame.userData.spine.userData.baseOpacity * pulse;
    }
    if (memoryBackdrop) {
      memoryPulse *= .92;
      particleSystems.forEach((particles, index) => {
        particles.material.uniforms.uTime.value = now * .001;
        particles.material.uniforms.uPulse.value = memoryPulse;
        particles.rotation.z += Math.sin(now * .00018 + particles.userData.phase) * .000015;
        particles.position.x = book.rotation.y * (.08 + index * .012);
        particles.position.y = Math.sin(now * .00022 + index) * .035 - book.rotation.x * .018;
      });
      memoryBackdrop.rotation.z = book.rotation.y * -.012;
      memoryBackdrop.position.x = book.rotation.y * .038;
    }
    updateAnalysisHud(now);
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
    hideCursorHint();
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
    updateCursorHint(event.clientX, event.clientY);
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
      return;
    }
    const leftSide = event.clientX < stage.clientWidth / 2;
    leftHand.classList.toggle('is-following', leftSide);
    rightHand.classList.toggle('is-following', !leftSide);
    positionIdleHand(leftSide ? leftHand : rightHand, event.clientX, leftSide ? 'left' : 'right');
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
  stage.addEventListener('pointerleave', () => {
    hideCursorHint();
    if (!activeDirection) resetHands();
  });

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
