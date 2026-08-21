(function () {
  const container = document.getElementById('city-scene');
  if (!container || !window.THREE) return;

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070907);
  scene.fog = new THREE.Fog(0x070907, 29, 48);

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
    ground: new THREE.MeshStandardMaterial({ color: 0x780006, roughness: .88, metalness: .03, emissive: 0x080000, emissiveIntensity: .04 }),
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

  function ribbonGeometry(curve, width, y, segments = 180) {
    const positions = [];
    const indices = [];
    for (let index = 0; index <= segments; index += 1) {
      const amount = index / segments;
      const point = curve.getPoint(amount);
      const tangent = curve.getTangent(amount).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const left = point.clone().addScaledVector(normal, width / 2);
      const right = point.clone().addScaledVector(normal, -width / 2);
      positions.push(left.x, y, left.z, right.x, y, right.z);
      if (index < segments) {
        const offset = index * 2;
        indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function curvedRoad(parent, points, width = 1.28) {
    const meshes = [];
    const dashMeshes = [];
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'catmullrom',
      .42
    );
    const border = new THREE.Mesh(ribbonGeometry(curve, width + .34, .55), materials.paper);
    border.receiveShadow = true;
    parent.add(border);
    meshes.push(border);
    const road = new THREE.Mesh(ribbonGeometry(curve, width, .64), materials.road);
    road.receiveShadow = true;
    parent.add(road);
    meshes.push(road);

    [-1, 1].forEach((side) => {
      const edgeCurve = new THREE.CatmullRomCurve3(
        Array.from({ length: 81 }, (_, index) => {
          const amount = index / 80;
          const point = curve.getPoint(amount);
          const tangent = curve.getTangent(amount).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          return point.addScaledVector(normal, side * (width / 2 - .08));
        }),
        false,
        'catmullrom',
        .3
      );
      const edge = new THREE.Mesh(ribbonGeometry(edgeCurve, .075, .735, 180), materials.gold);
      parent.add(edge);
      meshes.push(edge);
    });

    for (let amount = .035; amount < .98; amount += .075) {
      const start = curve.getPoint(amount);
      const end = curve.getPoint(Math.min(amount + .035, 1));
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const dash = box(parent, [Math.hypot(dx, dz), .035, .07], [(start.x + end.x) / 2, .75, (start.z + end.z) / 2], materials.paper, -Math.atan2(dz, dx));
      dash.userData.routeAmount = amount;
      dashMeshes.push(dash);
    }
    return { curve, meshes, dashMeshes };
  }

  function curvedRoadGlow(parent, curve, width = 1.5) {
    const glow = new THREE.Mesh(
      ribbonGeometry(curve, width, .79),
      new THREE.MeshBasicMaterial({ color: 0xff7056, transparent: true, opacity: .1, depthWrite: false })
    );
    glow.userData.zone = 'certificates';
    glow.userData.successRoad = true;
    glow.userData.glowLayer = true;
    parent.add(glow);
    const core = new THREE.Mesh(
      ribbonGeometry(curve, .12, .86),
      new THREE.MeshBasicMaterial({ color: 0x050705, transparent: true, opacity: 1, depthWrite: false, depthTest: false })
    );
    core.renderOrder = 20;
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

  const island = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 13.1, 0.8, 10), materials.ground);
  island.position.y = 0;
  island.receiveShadow = true;
  city.add(island);
  const underIsland = new THREE.Mesh(new THREE.CylinderGeometry(12.8, 11.6, 1.8, 10), materials.dark);
  underIsland.position.y = -1.15;
  city.add(underIsland);
  const grid = new THREE.GridHelper(24, 24, 0xf2b5a9, 0x721b18);
  grid.position.y = .44;
  grid.material.transparent = true;
  grid.material.opacity = .3;
  city.add(grid);

  const landmarkPositions = {
    about: new THREE.Vector3(-7.2, .6, -3.2),
    university: new THREE.Vector3(-8.9, .6, 1.8),
    experience: new THREE.Vector3(-3.8, .6, 3.7),
    projects: new THREE.Vector3(.5, .6, -.5),
    certificates: new THREE.Vector3(5.1, .6, -3.1),
    contact: new THREE.Vector3(7.4, .6, 3.2)
  };
  const labelAnchors = {
    about: new THREE.Vector3(-7.2, 3.2, -3.2),
    university: new THREE.Vector3(-8.9, 5.05, 1.8),
    experience: new THREE.Vector3(-3.8, 4.1, 3.7),
    projects: new THREE.Vector3(.5, 6.5, -.5),
    certificates: new THREE.Vector3(5.1, 2.8, -3.1),
    contact: new THREE.Vector3(7.4, 6.1, 3.2)
  };

  const routePoints = [
    [-8.8, -4.8], [-10.4, -4.2], [-11.35, -2.2], [-11.45, 1.8],
    [-10.6, 4.2], [-7.2, 5.8], [-3.8, 5.55], [-1.25, 5.3],
    [3.65, 3.0], [3.55, -.45], [3.55, -3.1], [4.0, -4.75],
    [5.1, -4.75], [6.8, -4.5], [8.75, -2.2], [9.1, .4],
    [8.9, 2.1], [8.7, 3.2]
  ];
  const routeStopProgress = [0, 3 / 17, 6 / 17, 9 / 17, 12 / 17, 1];
  const routeRoad = curvedRoad(city, routePoints);
  const routeRoadCurve = routeRoad.curve;
  const routeRevealMeshes = routeRoad.meshes;
  const routeDashMeshes = routeRoad.dashMeshes;
  const successRoadMeshes = curvedRoadGlow(city, routeRoadCurve);

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

  const university = new THREE.Group();
  university.position.copy(landmarkPositions.university);
  box(university, [4.15, .28, 3.15], [0, .25, 0], materials.concrete);
  box(university, [3.75, .12, 2.78], [0, .48, 0], materials.paper);
  box(university, [2.3, 2.8, .72], [0, 1.92, .94], materials.paper);
  box(university, [.72, 2.15, 2.35], [-1.52, 1.58, -.15], materials.paper);
  box(university, [.72, 2.15, 2.35], [1.52, 1.58, -.15], materials.paper);
  box(university, [2.08, 1.58, .12], [0, 1.48, .55], materials.glass);
  box(university, [2.5, .18, .95], [0, 3.38, .88], materials.coral);
  box(university, [1.52, .14, .58], [0, .62, -1.16], materials.coral);
  [-.78, -.39, 0, .39, .78].forEach((x) => {
    cylinder(university, .055, 1.58, [x, 1.45, -.98], materials.paper, 10);
  });
  [-.68, 0, .68].forEach((x) => tree(university, x, -1.72, .48));
  const campusHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.28, .045, 8, 52),
    new THREE.MeshBasicMaterial({ color: palette.coral, transparent: true, opacity: .68 })
  );
  campusHalo.position.set(0, 3.78, .1);
  campusHalo.rotation.x = Math.PI / 2;
  university.add(campusHalo);
  city.add(university);

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
    [-10.4, 5.2, 1.05, 1.0, 2.2, materials.blue], [-7.4, 5.8, 1.0, .9, 2.7, materials.dark],
    [-.8, 7.6, 1.2, 1.25, 2.1, materials.green], [5.3, 5.8, 1.3, 1.0, 3.0, materials.blue],
    [8.8, -1.0, 1.15, 1.3, 2.65, materials.dark], [2.1, -5.7, 1.25, 1.1, 2.2, materials.green],
    [-3.3, -5.8, 1.3, 1.2, 2.75, materials.blue], [-10.2, -1.0, 1.0, .9, 1.65, materials.gold]
  ];
  backgroundBuildings.forEach(([x, z, width, depth, height, mat]) => {
    box(city, [width, height, depth], [x, height / 2 + .45, z], mat);
    box(city, [width + .08, .08, depth + .08], [x, height + .48, z], materials.paper);
  });
  [[-10, -4], [-9, -5], [-6, 6], [-1, -7], [4, 6], [9, 5], [10, 2], [7, -6], [3.8, -5.3]].forEach(([x, z], index) => tree(city, x, z, .68 + (index % 3) * .1));

  [house, university, museum, trade, certificates, mast].forEach((group, index) => {
    const zone = ['about', 'university', 'experience', 'projects', 'certificates', 'contact'][index];
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

  const routeCurve = new THREE.CatmullRomCurve3(routePoints.map(([x, z]) => new THREE.Vector3(x, .78, z)), false, 'catmullrom', .42);
  const routeOrb = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), new THREE.MeshBasicMaterial({ color: palette.coral }));
  scene.add(routeOrb);
  let routeProgress = 0;
  let targetRouteProgress = 0;

  function setRouteMeshProgress(mesh, progress) {
    const total = mesh.geometry.index?.count || mesh.geometry.attributes.position.count;
    const count = Math.floor((total * progress) / 6) * 6;
    mesh.geometry.setDrawRange(0, Math.max(0, Math.min(total, count)));
  }

  [...routeRevealMeshes, ...successRoadMeshes].forEach((mesh) => setRouteMeshProgress(mesh, 0));
  routeDashMeshes.forEach((dash) => { dash.visible = false; });

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
    [...routeRevealMeshes, ...successRoadMeshes].forEach((mesh) => setRouteMeshProgress(mesh, routeProgress));
    routeDashMeshes.forEach((dash) => { dash.visible = dash.userData.routeAmount <= routeProgress; });
    routeOrb.visible = routeProgress > .003;
    routeOrb.position.copy(routeCurve.getPoint(THREE.MathUtils.clamp(routeProgress, 0, 1)));
    routeOrb.position.y += Math.sin(elapsed * 3) * .08;
    museumRing.rotation.z = elapsed * .35;
    campusHalo.rotation.z = elapsed * .22;
    campusHalo.material.opacity = .5 + Math.sin(elapsed * 2.1) * .18;
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
        : (successRoadHovered ? 1 : certificateActive ? .98 : .9 + pulse * .06);
      road.material.opacity += (targetOpacity - road.material.opacity) * .16;
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
    const scaled = THREE.MathUtils.clamp(value, 0, 1) * (routeStopProgress.length - 1);
    const index = Math.min(Math.floor(scaled), routeStopProgress.length - 2);
    targetRouteProgress = THREE.MathUtils.lerp(routeStopProgress[index], routeStopProgress[index + 1], scaled - index);
  }

  window.careerCity3D = { resetCamera, setActiveZone, setProgress, renderer, scene, camera };
  setActiveZone('about');
  animate();
})();
