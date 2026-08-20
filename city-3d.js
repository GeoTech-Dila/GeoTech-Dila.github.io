(function () {
  const container = document.getElementById('city-scene');
  if (!container || !window.THREE) return;

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb7d2cd);
  scene.fog = new THREE.Fog(0xb7d2cd, 29, 48);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xf4f3e9, 0x52655d, 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-10, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  scene.add(sun);

  const palette = {
    paper: 0xf1f0e8,
    ink: 0x161a17,
    concrete: 0xc9cbc3,
    darkConcrete: 0x6f7771,
    glass: 0x3f7380,
    green: 0x567760,
    coral: 0xdf604a,
    gold: 0xe5bd65,
    road: 0x333835,
    blue: 0x5a91a0
  };

  function material(color, roughness = 0.72, metalness = 0.08) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  const materials = {
    paper: material(palette.paper, 0.76),
    ink: material(palette.ink, 0.62, 0.32),
    concrete: material(palette.concrete, 0.86),
    dark: material(palette.darkConcrete, 0.72, 0.14),
    glass: new THREE.MeshStandardMaterial({ color: palette.glass, roughness: 0.18, metalness: 0.48, emissive: 0x112d35, emissiveIntensity: 0.45 }),
    green: material(palette.green, 0.9),
    coral: new THREE.MeshStandardMaterial({ color: palette.coral, roughness: 0.48, metalness: 0.16, emissive: 0x3b0904, emissiveIntensity: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: palette.gold, roughness: 0.4, metalness: 0.5 }),
    road: new THREE.MeshStandardMaterial({ color: palette.road, roughness: .78, metalness: .12, emissive: 0x090b0a, emissiveIntensity: .38 }),
    blue: material(palette.blue, 0.48, 0.28)
  };

  function box(parent, size, position, mat, rotationY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, radius, height, position, mat, sides = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function beam(parent, start, end, radius, mat) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), mat);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function roadBetween(parent, from, to, width = 1.32) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const centerX = (from[0] + to[0]) / 2;
    const centerZ = (from[1] + to[1]) / 2;
    const normalX = -dz / length;
    const normalZ = dx / length;
    box(parent, [length + .14, .12, width + .34], [centerX, .54, centerZ], materials.paper, -angle);
    const road = box(parent, [length, .16, width], [centerX, .62, centerZ], materials.road, -angle);
    [-1, 1].forEach((side) => {
      const offset = side * (width / 2 - .09);
      box(parent, [length - .12, .035, .075], [centerX + normalX * offset, .72, centerZ + normalZ * offset], materials.gold, -angle);
    });
    for (let index = 1; index < Math.floor(length); index += 2) {
      const amount = index / length;
      box(parent, [.62, .035, .07], [from[0] + dx * amount, .72, from[1] + dz * amount], materials.paper, -angle);
    }
    return road;
  }

  function glowingRoadBetween(parent, from, to, width = 1.62) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff7056, transparent: true, opacity: .1, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(length, .08, width), glowMaterial);
    glow.position.set((from[0] + to[0]) / 2, .79, (from[1] + to[1]) / 2);
    glow.rotation.y = -angle;
    glow.userData.zone = 'certificates';
    glow.userData.successRoad = true;
    glow.userData.glowLayer = true;
    parent.add(glow);
    const core = new THREE.Mesh(new THREE.BoxGeometry(length, .06, .2), new THREE.MeshBasicMaterial({ color: 0xff5f45, transparent: true, opacity: .48, depthWrite: false }));
    core.position.set((from[0] + to[0]) / 2, .84, (from[1] + to[1]) / 2);
    core.rotation.y = -angle;
    core.userData.zone = 'certificates';
    core.userData.successRoad = true;
    parent.add(core);
    return [glow, core];
  }

  function tree(parent, x, z, scale = 1) {
    cylinder(parent, .09 * scale, .75 * scale, [x, .92 * scale, z], materials.dark, 8);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.42 * scale, .9 * scale, 8), materials.green);
    crown.position.set(x, 1.55 * scale, z);
    crown.castShadow = true;
    parent.add(crown);
  }

  const city = new THREE.Group();
  scene.add(city);

  const island = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 13.1, 0.8, 10), materials.paper);
  island.position.y = 0;
  island.receiveShadow = true;
  city.add(island);
  const underIsland = new THREE.Mesh(new THREE.CylinderGeometry(12.8, 11.6, 1.8, 10), materials.dark);
  underIsland.position.y = -1.15;
  city.add(underIsland);
  const grid = new THREE.GridHelper(24, 24, 0x8c9d92, 0xc8d2cb);
  grid.position.y = .44;
  grid.material.transparent = true;
  grid.material.opacity = .24;
  city.add(grid);

  const landmarkPositions = {
    about: new THREE.Vector3(-7.2, .6, -3.2),
    experience: new THREE.Vector3(-3.8, .6, 3.7),
    projects: new THREE.Vector3(.5, .6, -.5),
    certificates: new THREE.Vector3(5.1, .6, -3.1),
    contact: new THREE.Vector3(7.4, .6, 3.2)
  };
  const labelAnchors = {
    about: new THREE.Vector3(-7.2, 3.2, -3.2),
    experience: new THREE.Vector3(-3.8, 4.1, 3.7),
    projects: new THREE.Vector3(.5, 6.5, -.5),
    certificates: new THREE.Vector3(5.1, 2.8, -3.1),
    contact: new THREE.Vector3(7.4, 6.1, 3.2)
  };

  const routePoints = [
    [-7.2, -3.2], [-5.6, .1], [-3.8, 3.7], [-1.8, 1.8], [.5, -.5], [2.8, -1.4], [5.1, -3.1], [6.3, -.2], [7.4, 3.2]
  ];
  routePoints.slice(0, -1).forEach((point, index) => roadBetween(city, point, routePoints[index + 1], index === 4 || index === 5 ? 1.58 : 1.32));
  const successRoadMeshes = routePoints
    .slice(0, -1)
    .map((point, index) => glowingRoadBetween(city, point, routePoints[index + 1], index === 4 || index === 5 ? 1.82 : 1.56))
    .flat();

  const house = new THREE.Group();
  house.position.copy(landmarkPositions.about);
  box(house, [3.1, .35, 2.5], [0, .25, 0], materials.concrete);
  box(house, [2.7, 1.35, 2.1], [0, 1.08, 0], materials.paper);
  box(house, [1.75, 1.15, 1.25], [.35, 2.15, -.2], materials.concrete);
  box(house, [3.05, .18, 2.45], [0, 1.83, 0], materials.coral);
  box(house, [1.4, .56, .08], [-.45, 1.15, -1.07], materials.glass);
  box(house, [.55, .9, .08], [1.0, .98, -1.07], materials.ink);
  [-1.3, 1.45].forEach((x) => tree(house, x, 1.75, .72));
  city.add(house);

  const museum = new THREE.Group();
  museum.position.copy(landmarkPositions.experience);
  box(museum, [4.1, .32, 2.7], [0, .26, 0], materials.concrete);
  box(museum, [3.6, 1.45, 2.2], [0, 1.12, .05], materials.paper);
  box(museum, [4.15, .28, 2.75], [0, 2.05, 0], materials.gold);
  for (let x = -1.45; x <= 1.45; x += .72) cylinder(museum, .11, 1.55, [x, 1.18, -1.18], materials.paper, 12);
  box(museum, [1.25, 1.1, .08], [0, 1.12, -1.29], materials.glass);
  const museumRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, .08, 10, 44), materials.coral);
  museumRing.position.set(0, 2.75, 0);
  museumRing.rotation.x = Math.PI / 2;
  museum.add(museumRing);
  city.add(museum);

  const trade = new THREE.Group();
  trade.position.copy(landmarkPositions.projects);
  box(trade, [4.8, .34, 4.2], [0, .25, 0], materials.concrete);
  const towers = [
    [-1.25, -.8, 1.25, 1.2, 4.7, materials.glass],
    [.15, .65, 1.45, 1.4, 3.55, materials.coral],
    [1.35, -.75, 1.2, 1.25, 5.6, materials.dark],
    [-1.15, 1.05, 1.1, 1.0, 2.8, materials.gold]
  ];
  towers.forEach(([x, z, width, depth, height, mat]) => {
    box(trade, [width, height, depth], [x, height / 2 + .45, z], mat);
    for (let y = 1.0; y < height; y += .7) box(trade, [width + .04, .055, depth + .04], [x, y + .45, z], materials.paper);
  });
  box(trade, [3.8, .12, .5], [0, .65, -1.82], materials.coral);
  city.add(trade);

  const certificates = new THREE.Group();
  certificates.position.copy(landmarkPositions.certificates);
  for (let index = 0; index < 5; index += 1) {
    const z = -1.3 + index * .67;
    beam(certificates, [-1.0, .6, z], [-1.0, 1.75, z], .055, materials.gold);
    beam(certificates, [1.0, .6, z], [1.0, 1.75, z], .055, materials.gold);
    beam(certificates, [-1.0, 1.75, z], [1.0, 1.75, z], .055, index === 4 ? materials.coral : materials.paper);
  }
  const medal = new THREE.Mesh(new THREE.TorusGeometry(.48, .09, 10, 32), materials.coral);
  medal.position.set(0, 2.25, 1.35);
  medal.rotation.y = Math.PI / 2;
  certificates.add(medal);
  city.add(certificates);

  const mast = new THREE.Group();
  mast.position.copy(landmarkPositions.contact);
  beam(mast, [-.85, .55, 0], [0, 5.25, 0], .085, materials.ink);
  beam(mast, [.85, .55, 0], [0, 5.25, 0], .085, materials.ink);
  for (let y = 1.3; y < 4.7; y += .72) beam(mast, [-.65 + y * .08, y, 0], [.65 - y * .08, y, 0], .045, materials.coral);
  beam(mast, [-1.25, 4.55, 0], [1.25, 4.55, 0], .065, materials.ink);
  const signalRings = [];
  [0, .5, 1].forEach((offset) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.55 + offset * .35, .035, 8, 40), new THREE.MeshBasicMaterial({ color: palette.coral, transparent: true, opacity: .85 }));
    ring.position.set(0, 5.45, 0);
    ring.rotation.x = Math.PI / 2;
    mast.add(ring);
    signalRings.push(ring);
  });
  city.add(mast);

  const backgroundBuildings = [
    [-9, 2, 1.25, 1.2, 2.4, materials.blue], [-7.2, 4.8, 1.1, 1.0, 3.2, materials.dark],
    [-1.0, 5.8, 1.2, 1.25, 2.1, materials.green], [3.3, 4.9, 1.3, 1.0, 3.0, materials.blue],
    [8.8, -1.0, 1.15, 1.3, 2.65, materials.dark], [2.1, -5.7, 1.25, 1.1, 2.2, materials.green],
    [-3.3, -5.8, 1.3, 1.2, 2.75, materials.blue], [-9.1, -.4, 1.1, 1.0, 1.8, materials.gold]
  ];
  backgroundBuildings.forEach(([x, z, width, depth, height, mat]) => {
    box(city, [width, height, depth], [x, height / 2 + .45, z], mat);
    box(city, [width + .08, .08, depth + .08], [x, height + .48, z], materials.paper);
  });
  [[-10, -4], [-9, -5], [-6, 6], [-1, -7], [4, 6], [9, 5], [10, 2], [7, -6], [3.8, -5.3]].forEach(([x, z], index) => tree(city, x, z, .68 + (index % 3) * .1));

  [house, museum, trade, certificates, mast].forEach((group, index) => {
    const zone = ['about', 'experience', 'projects', 'certificates', 'contact'][index];
    group.traverse((object) => {
      if (object.isMesh) object.userData.zone = zone;
    });
  });

  const activeBeacon = new THREE.Group();
  const beaconCore = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshBasicMaterial({ color: palette.coral }));
  activeBeacon.add(beaconCore);
  const beaconRings = [];
  [0, 1].forEach((index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.42 + index * .28, .035, 8, 32), new THREE.MeshBasicMaterial({ color: index ? 0xffffff : palette.coral, transparent: true, opacity: .75 }));
    ring.rotation.x = Math.PI / 2;
    activeBeacon.add(ring);
    beaconRings.push(ring);
  });
  scene.add(activeBeacon);

  const routeCurve = new THREE.CatmullRomCurve3(routePoints.map(([x, z]) => new THREE.Vector3(x, .78, z)), false, 'catmullrom', .18);
  const routeOrb = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), new THREE.MeshBasicMaterial({ color: palette.coral }));
  scene.add(routeOrb);
  let routeProgress = 0;
  let targetRouteProgress = 0;

  let radius = 27;
  let theta = 1.56;
  let phi = .88;
  let targetRadius = radius;
  let targetTheta = theta;
  let targetPhi = phi;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let successRoadHovered = false;
  let successRoadPointerX = 0;
  let successRoadPointerY = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function hitTest(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(city.children, true).find((item) => item.object.userData.zone);
  }

  function positionCamera() {
    camera.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(0, 1.1, 0);
  }

  function resetCamera() {
    targetRadius = container.clientWidth < 600 ? 30 : 27;
    targetTheta = 1.56;
    targetPhi = .88;
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!dragging) {
      const hit = hitTest(event);
      successRoadHovered = hit?.object.userData.successRoad === true;
      const rect = renderer.domElement.getBoundingClientRect();
      successRoadPointerX = event.clientX - rect.left;
      successRoadPointerY = event.clientY - rect.top;
      container.classList.toggle('is-success-road-hovered', successRoadHovered);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    targetTheta -= dx * .006;
    targetPhi = THREE.MathUtils.clamp(targetPhi + dy * .0045, .5, 1.24);
    startX = event.clientX;
    startY = event.clientY;
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
    if (moved) return;
    const hit = hitTest(event);
    if (!hit) return;
    const node = document.querySelector(`.map-node[data-zone="${hit.object.userData.zone}"]`);
    if (node && !node.disabled) node.click();
  });
  renderer.domElement.addEventListener('pointercancel', () => {
    dragging = false;
    successRoadHovered = false;
    container.classList.remove('is-success-road-hovered');
    renderer.domElement.style.cursor = 'grab';
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (dragging) return;
    successRoadHovered = false;
    container.classList.remove('is-success-road-hovered');
    renderer.domElement.style.cursor = 'grab';
  });
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    targetRadius = THREE.MathUtils.clamp(targetRadius + event.deltaY * .012, 19, 36);
  }, { passive: false });
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  document.querySelector('.city-camera-reset')?.addEventListener('click', resetCamera);

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 48 : 38;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  positionCamera();

  function syncOverlayPositions() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const targetZone = document.getElementById('map-player')?.dataset.targetZone || 'about';
    const zones = [targetZone, ...Object.keys(labelAnchors).filter((zone) => zone !== targetZone)];
    const labelWidth = width < 600 ? 126 : 172;
    const labelHeight = width < 600 ? 72 : 82;
    const placed = [];
    const offsets = [[0, 0], [0, -84], [0, 84], [-118, 0], [118, 0], [-105, -70], [105, 70], [-105, 70], [105, -70]];

    zones.forEach((zone) => {
      const point = labelAnchors[zone];
      const projected = point.clone().project(camera);
      const rawX = (projected.x * .5 + .5) * width;
      const rawY = (-projected.y * .5 + .5) * height;
      let chosen = null;
      for (const [offsetX, offsetY] of offsets) {
        const x = THREE.MathUtils.clamp(rawX + offsetX, labelWidth / 2 + 8, width - labelWidth / 2 - 8);
        const y = THREE.MathUtils.clamp(rawY + offsetY, labelHeight / 2 + 8, height - labelHeight / 2 - 8);
        const candidate = { x, y, left: x - labelWidth / 2, right: x + labelWidth / 2, top: y - labelHeight / 2, bottom: y + labelHeight / 2 };
        const overlaps = placed.some((box) => candidate.left < box.right + 5 && candidate.right > box.left - 5 && candidate.top < box.bottom + 5 && candidate.bottom > box.top - 5);
        if (!overlaps) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) {
        const lane = placed.length % 2 ? placed.length : -placed.length;
        const x = THREE.MathUtils.clamp(rawX, labelWidth / 2 + 8, width - labelWidth / 2 - 8);
        const y = THREE.MathUtils.clamp(rawY + lane * 54, labelHeight / 2 + 8, height - labelHeight / 2 - 8);
        chosen = { x, y, left: x - labelWidth / 2, right: x + labelWidth / 2, top: y - labelHeight / 2, bottom: y + labelHeight / 2 };
      }
      placed.push(chosen);
      const node = document.querySelector(`.map-node[data-zone="${zone}"]`);
      if (!node) return;
      node.style.setProperty('--x', `${(chosen.x / width) * 100}%`, 'important');
      node.style.setProperty('--y', `${(chosen.y / height) * 100}%`, 'important');
    });
    const targetNode = document.querySelector(`.map-node[data-zone="${targetZone}"]`);
    const player = document.getElementById('map-player');
    if (targetNode && player) {
      player.style.left = targetNode.style.getPropertyValue('--x');
      player.style.top = targetNode.style.getPropertyValue('--y');
    }
    if (successRoadHovered) {
      const roadLabel = document.querySelector('.map-node[data-zone="certificates"]');
      if (roadLabel) {
        const x = THREE.MathUtils.clamp(successRoadPointerX, labelWidth / 2 + 8, width - labelWidth / 2 - 8);
        const y = THREE.MathUtils.clamp(successRoadPointerY - 48, labelHeight / 2 + 8, height - labelHeight / 2 - 8);
        roadLabel.style.setProperty('--x', `${(x / width) * 100}%`, 'important');
        roadLabel.style.setProperty('--y', `${(y / height) * 100}%`, 'important');
      }
    }
  }

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    radius += (targetRadius - radius) * .09;
    theta += (targetTheta - theta) * .09;
    phi += (targetPhi - phi) * .09;
    positionCamera();
    routeProgress += (targetRouteProgress - routeProgress) * .045;
    routeOrb.position.copy(routeCurve.getPoint(THREE.MathUtils.clamp(routeProgress, 0, 1)));
    routeOrb.position.y += Math.sin(elapsed * 3) * .08;
    museumRing.rotation.z = elapsed * .35;
    signalRings.forEach((ring, index) => {
      ring.scale.setScalar(1 + ((elapsed * .55 + index * .28) % 1) * .55);
      ring.material.opacity = .8 - ((elapsed * .55 + index * .28) % 1) * .65;
    });
    beaconRings.forEach((ring, index) => {
      const pulse = (elapsed * .8 + index * .45) % 1;
      ring.scale.setScalar(.85 + pulse * .7);
      ring.material.opacity = .8 - pulse * .72;
    });
    activeBeacon.rotation.y = elapsed * .45;
    activeBeacon.position.y += (1.05 - activeBeacon.position.y) * .08;
    const certificateActive = document.getElementById('map-player')?.dataset.targetZone === 'certificates';
    successRoadMeshes.forEach((road, index) => {
      const pulse = .5 + Math.sin(elapsed * 3.1 + index * .65) * .5;
      const targetOpacity = road.userData.glowLayer
        ? (successRoadHovered ? .68 : certificateActive ? .42 + pulse * .18 : .1 + pulse * .05)
        : (successRoadHovered ? .98 : certificateActive ? .72 + pulse * .18 : .44 + pulse * .08);
      road.material.opacity += (targetOpacity - road.material.opacity) * .16;
      road.scale.z += (((successRoadHovered && road.userData.glowLayer ? 1.15 : 1)) - road.scale.z) * .14;
    });
    syncOverlayPositions();
    renderer.render(scene, camera);
  }

  function setActiveZone(zone) {
    const point = landmarkPositions[zone] || landmarkPositions.about;
    activeBeacon.visible = zone !== 'certificates';
    activeBeacon.position.set(point.x, 1.05, point.z);
  }

  function setProgress(value) {
    targetRouteProgress = THREE.MathUtils.clamp(value, 0, 1);
  }

  window.careerCity3D = { resetCamera, setActiveZone, setProgress, renderer, scene, camera };
  setActiveZone('about');
  animate();
})();
