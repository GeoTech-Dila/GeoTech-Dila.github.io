const header = document.querySelector('.site-header');
const themeButton = document.querySelector('.theme-toggle');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 40);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

themeButton.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('portfolio-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

if (localStorage.getItem('portfolio-theme') === 'dark') document.body.classList.add('dark');
document.getElementById('year').textContent = new Date().getFullYear();

function openProjectDialog(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (!dialog) return;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.querySelector('.dialog-close')?.focus();
}

document.querySelectorAll('[data-open-project]').forEach((button) => {
  button.addEventListener('click', () => openProjectDialog(button.dataset.openProject));
});

document.querySelectorAll('.project-dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
});

const projectShowcase = document.querySelector('[data-project-showcase]');

if (projectShowcase) {
  const track = projectShowcase.querySelector('.project-track');
  const slides = [...projectShowcase.querySelectorAll('[data-project-slide]')];
  const current = projectShowcase.querySelector('[data-project-current]');
  const meter = projectShowcase.querySelector('[data-project-meter]');
  let projectIndex = 0;
  let dragStart = 0;
  let dragDelta = 0;
  let dragging = false;
  let suppressClick = false;
  let projectTransitionTimer = null;

  function showProject(nextIndex, instant = false) {
    const previousIndex = projectIndex;
    const normalizedIndex = (nextIndex + slides.length) % slides.length;
    const changed = normalizedIndex !== previousIndex;

    if (changed && !instant) {
      const direction = nextIndex < previousIndex ? 'prev' : 'next';
      window.clearTimeout(projectTransitionTimer);
      projectShowcase.classList.remove('is-transitioning');
      projectShowcase.dataset.direction = direction;
      projectShowcase.dataset.transition = slides[normalizedIndex].dataset.transition || 'wipe';
      slides[previousIndex].classList.add('is-leaving');
      void projectShowcase.offsetWidth;
      projectShowcase.classList.add('is-transitioning');
      projectTransitionTimer = window.setTimeout(() => {
        projectShowcase.classList.remove('is-transitioning');
        slides.forEach((slide) => slide.classList.remove('is-leaving'));
      }, 1050);
    }

    projectIndex = normalizedIndex;
    track.style.transform = `translate3d(-${projectIndex * 100}%, 0, 0)`;
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === projectIndex));
    current.textContent = String(projectIndex + 1).padStart(2, '0');
    meter.style.transform = `translateX(${projectIndex * 100}%)`;
  }

  projectShowcase.querySelector('[data-project-prev]').addEventListener('click', () => showProject(projectIndex - 1));
  projectShowcase.querySelector('[data-project-next]').addEventListener('click', () => showProject(projectIndex + 1));

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showProject(projectIndex - 1);
    if (event.key === 'ArrowRight') showProject(projectIndex + 1);
  });

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('a, button')) return;
    dragging = true;
    suppressClick = false;
    dragStart = event.clientX;
    dragDelta = 0;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragDelta = event.clientX - dragStart;
    suppressClick = Math.abs(dragDelta) > 8;
    const offset = (dragDelta / track.clientWidth) * 100;
    track.style.transform = `translate3d(${(-projectIndex * 100) + offset}%, 0, 0)`;
  });

  function finishProjectDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    const threshold = Math.min(110, track.clientWidth * .14);
    if (dragDelta < -threshold) showProject(projectIndex + 1);
    else if (dragDelta > threshold) showProject(projectIndex - 1);
    else showProject(projectIndex);
  }

  track.addEventListener('pointerup', finishProjectDrag);
  track.addEventListener('pointercancel', finishProjectDrag);
  track.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  projectShowcase.showProject = showProject;
  showProject(0, true);
}

const studyCities = {
  'İzmir': {
    index: '01 / 04', code: 'İZ', coordinates: [27.1428, 38.4237],
    type: 'Mekânsal analiz · Planlama · Araştırma',
    text: 'Kentsel ısı adası, yaya gölgelenmesi ve Selçuk planlama analizlerinin yanında profesyonel şehir planlama çalışmalarını yürüttüğüm ana çalışma alanı.',
    tools: ['QGIS', 'Google Earth Engine', 'CityEngine', 'Netcad'],
    actions: '<button type="button" data-open-study-dialog="heat-island-dialog">TÜBİTAK projesini aç ↗</button><button type="button" data-slide-index="2">Selçuk çalışması ↗</button>'
  },
  'Sakarya': {
    index: '02 / 04', code: 'SA', coordinates: [30.4033, 40.7569],
    type: 'Bitirme projesi · Erişilebilirlik · Veri üretimi',
    text: 'Kadın dostu kent yaklaşımıyla toplumsal cinsiyet, donatı erişimi ve kentsel hizmet göstergelerini değerlendirdiğim bitirme projesinin çalışma alanı.',
    tools: ['QGIS', 'Ağ analizi', 'Erişilebilirlik', 'Mekânsal veri'],
    actions: '<button type="button" data-slide-index="0">Projeyi gör ↗</button>'
  },
  'Konya': {
    index: '03 / 04', code: 'KO', coordinates: [32.4846, 37.8746],
    type: 'Canlı harita · Afet ve dirençlilik verisi',
    text: 'Koruma, izleme ve acil durum verilerini katmanlı bir harita deneyiminde buluşturan KOR-İZ çalışmasının kapsadığı bölge.',
    tools: ['Mekânsal veri', 'Katman analizi', 'Karar desteği'],
    actions: '<a href="https://we-konya-webgis.vercel.app" target="_blank" rel="noreferrer">Canlı haritayı aç ↗</a><button type="button" data-slide-index="3">Sunumda gör ↗</button>'
  },
  'İstanbul': {
    index: '04 / 04', code: 'İS', coordinates: [28.9784, 41.0082],
    type: 'Belediye deneyimi · Çekmeköy',
    text: 'Plan tadilatı, 18. madde uygulaması, DOP hesabı, saha çalışmaları ve planlama mevzuatı üzerine belediye deneyimi edindiğim kent.',
    tools: ['Planlama', 'Saha verisi', 'Mevzuat', 'DOP hesabı'],
    actions: '<button type="button" data-open-zone="experience">Deneyimi aç ↗</button>'
  }
};

const projectViewButtons = [...document.querySelectorAll('[data-project-view]')];
const projectViewPanels = [...document.querySelectorAll('[data-project-view-panel]')];
let projectViewTimer = null;

function setProjectView(view) {
  projectViewButtons.forEach((button) => {
    const selected = button.dataset.projectView === view;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  projectViewPanels.forEach((panel) => {
    const selected = panel.dataset.projectViewPanel === view;
    panel.hidden = !selected;
    panel.classList.remove('is-view-entering');
    if (selected) {
      void panel.offsetWidth;
      panel.classList.add('is-view-entering');
    }
  });
  clearTimeout(projectViewTimer);
  projectViewTimer = setTimeout(() => {
    projectViewPanels.forEach((panel) => panel.classList.remove('is-view-entering'));
  }, 900);
}

projectViewButtons.forEach((button) => button.addEventListener('click', () => setProjectView(button.dataset.projectView)));

const turkeyMap = document.getElementById('turkey-study-map');
if (turkeyMap && window.TURKEY_PROVINCES) {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const provinceLayer = turkeyMap.querySelector('.province-layer');
  const markerLayer = turkeyMap.querySelector('.city-marker-layer');
  const allPairs = [];

  function collectPairs(value) {
    if (typeof value?.[0] === 'number') allPairs.push(value);
    else value?.forEach(collectPairs);
  }

  window.TURKEY_PROVINCES.features.forEach((feature) => collectPairs(feature.geometry.coordinates));
  function mercatorPoint(pair) {
    const longitude = pair[0] * Math.PI / 180;
    const latitude = Math.max(-85, Math.min(85, pair[1])) * Math.PI / 180;
    return [longitude, Math.log(Math.tan(Math.PI / 4 + latitude / 2))];
  }

  const projectedPairs = allPairs.map(mercatorPoint);
  const longitudes = projectedPairs.map((pair) => pair[0]);
  const latitudes = projectedPairs.map((pair) => pair[1]);
  const bounds = {
    minX: Math.min(...longitudes), maxX: Math.max(...longitudes),
    minY: Math.min(...latitudes), maxY: Math.max(...latitudes)
  };
  const mapWidth = 1100;
  const mapHeight = 500;
  const mapPadding = 48;
  const scale = Math.min((mapWidth - mapPadding * 2) / (bounds.maxX - bounds.minX), (mapHeight - mapPadding * 2) / (bounds.maxY - bounds.minY));
  const offsetX = (mapWidth - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetY = (mapHeight - (bounds.maxY - bounds.minY) * scale) / 2;

  function projectCoordinate(pair) {
    const projected = mercatorPoint(pair);
    return [offsetX + (projected[0] - bounds.minX) * scale, offsetY + (bounds.maxY - projected[1]) * scale];
  }

  function geometryPath(geometry) {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.map((polygon) => polygon.map((ring) => ring.map((pair, index) => {
      const [x, y] = projectCoordinate(pair);
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('') + 'Z').join('')).join('');
  }

  function selectStudyCity(cityName) {
    const city = studyCities[cityName];
    if (!city) return;
    const cityStory = document.querySelector('.city-story');
    document.getElementById('city-story-index').textContent = city.index;
    document.getElementById('city-story-title').textContent = cityName;
    document.getElementById('city-story-type').textContent = city.type;
    document.getElementById('city-story-text').textContent = city.text;
    document.getElementById('city-story-tools').innerHTML = city.tools.map((tool) => `<span>${tool}</span>`).join('');
    document.getElementById('city-story-actions').innerHTML = city.actions;
    provinceLayer.querySelectorAll('.province-path').forEach((path) => path.classList.toggle('is-active', path.dataset.city === cityName));
    markerLayer.querySelectorAll('.city-marker').forEach((marker) => marker.classList.toggle('is-active', marker.dataset.city === cityName));
    cityStory?.classList.remove('is-changing');
    if (cityStory) {
      void cityStory.offsetWidth;
      cityStory.classList.add('is-changing');
      setTimeout(() => cityStory.classList.remove('is-changing'), 760);
    }
  }

  window.TURKEY_PROVINCES.features.forEach((feature) => {
    const cityName = feature.properties.name;
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', geometryPath(feature.geometry));
    path.setAttribute('class', `province-path${studyCities[cityName] ? ' is-worked' : ''}`);
    path.dataset.city = cityName;
    if (studyCities[cityName]) path.addEventListener('click', () => selectStudyCity(cityName));
    provinceLayer.appendChild(path);
  });

  Object.entries(studyCities).forEach(([cityName, city]) => {
    const [x, y] = projectCoordinate(city.coordinates);
    const marker = document.createElementNS(svgNamespace, 'g');
    marker.setAttribute('class', 'city-marker');
    marker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', `${cityName} çalışmalarını göster`);
    marker.dataset.city = cityName;
    marker.innerHTML = `<circle class="marker-hit" r="34"></circle><circle class="marker-pulse" r="20"></circle><circle r="14"></circle><text y="1">${city.code}</text>`;
    marker.addEventListener('click', () => selectStudyCity(cityName));
    marker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectStudyCity(cityName);
      }
    });
    markerLayer.appendChild(marker);
  });

  document.querySelector('.city-story-actions').addEventListener('click', (event) => {
    const dialogButton = event.target.closest('[data-open-study-dialog]');
    const slideButton = event.target.closest('[data-slide-index]');
    const zoneButton = event.target.closest('[data-open-zone]');
    if (dialogButton) openProjectDialog(dialogButton.dataset.openStudyDialog);
    if (slideButton) {
      setProjectView('projects');
      projectShowcase?.showProject(Number(slideButton.dataset.slideIndex));
    }
    if (zoneButton) {
      closeStage();
      window.setTimeout(() => playSceneTransition(zoneButton.dataset.openZone), 120);
    }
  });

  selectStudyCity('İzmir');
}

const gameZones = ['about', 'university', 'experience', 'projects', 'certificates', 'contact'];
const mapNodes = [...document.querySelectorAll('.map-node')];
const gameSections = [...document.querySelectorAll('.game-section')];
const mapPlayer = document.getElementById('map-player');
const mapScore = document.getElementById('map-score');
const mapBadge = document.getElementById('map-badge');
const mapStatus = document.getElementById('map-status');
const progressFill = document.getElementById('map-progress-fill');
const routeProgress = document.getElementById('route-progress');
const sceneTransition = document.getElementById('scene-transition');
const sceneTransitionTitle = document.getElementById('scene-transition-title');
const mobilePositions = {
  about: [18, 82],
  university: [31, 69],
  experience: [43, 57],
  projects: [66, 46],
  certificates: [34, 31],
  contact: [74, 16]
};
const zoneTitles = {
  about: 'Hakkımda',
  university: 'Üniversite',
  experience: 'Deneyim',
  projects: 'Projeler',
  certificates: 'Başarılar',
  contact: 'İletişim'
};
const mapStopNames = {
  about: "Dila'nın Evi",
  university: 'Dokuz Eylül Üniversitesi',
  experience: 'Deneyim Müzesi',
  projects: 'Projeler Ticaret Merkezi',
  certificates: 'Başarıya Giden Yol',
  contact: 'Bağlantı Direği'
};

let exploredZones = [];
let activeZone = null;
let lastMapNode = null;
let sceneOpenTimer = null;
let sceneCloseTimer = null;
try {
  const savedZones = JSON.parse(localStorage.getItem('career-map-zones') || '[]');
  exploredZones = gameZones.filter((zone, index) => savedZones[index] === zone);
} catch {
  exploredZones = [];
}

gameSections.forEach((section) => {
  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.className = 'zone-return';
  returnButton.textContent = '← Haritaya dön';
  returnButton.addEventListener('click', closeStage);
  section.insertBefore(returnButton, section.firstElementChild.nextSibling);
});

function closeStage() {
  window.clearTimeout(sceneOpenTimer);
  window.clearTimeout(sceneCloseTimer);
  sceneTransition.classList.remove('is-playing');
  activeZone = null;
  document.body.classList.remove('section-open');
  updateGame();
  lastMapNode?.focus({ preventScroll: true });
}

function openStage(zone) {
  activeZone = zone;
  document.body.classList.add('section-open');
  updateGame();
  const section = gameSections.find((item) => item.dataset.zone === zone);
  if (section) {
    section.scrollTop = 0;
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
  }
}

function playSceneTransition(zone) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    openStage(zone);
    return;
  }

  window.clearTimeout(sceneOpenTimer);
  window.clearTimeout(sceneCloseTimer);
  sceneTransition.dataset.zone = zone;
  sceneTransitionTitle.textContent = zoneTitles[zone];
  sceneTransition.classList.remove('is-playing');
  void sceneTransition.offsetWidth;
  sceneTransition.classList.add('is-playing');
  sceneOpenTimer = window.setTimeout(() => openStage(zone), 430);
  sceneCloseTimer = window.setTimeout(() => sceneTransition.classList.remove('is-playing'), 1080);
}

function movePlayer(zone) {
  const node = mapNodes.find((item) => item.dataset.zone === zone) || mapNodes[0];
  mapPlayer.dataset.targetZone = zone;
  window.careerCity3D?.setActiveZone(zone);
  if (window.careerCity3D) return;
  const isMobile = window.matchMedia('(max-width: 800px)').matches;
  const position = isMobile ? mobilePositions[node.dataset.zone] : [node.dataset.x, node.dataset.y];
  mapPlayer.style.left = `${position[0]}%`;
  mapPlayer.style.top = `${position[1]}%`;
}

function updateGame() {
  const exploredCount = exploredZones.length;
  mapNodes.forEach((node, index) => {
    const visited = exploredZones.includes(node.dataset.zone);
    const available = visited || index === exploredCount;
    node.disabled = !available;
    node.classList.toggle('is-visited', visited);
    node.classList.toggle('is-available', available && !visited);
  });

  gameSections.forEach((section) => {
    const unlocked = exploredZones.includes(section.dataset.zone);
    const active = unlocked && section.dataset.zone === activeZone;
    section.hidden = !active;
    section.classList.toggle('is-locked', !unlocked);
    section.classList.toggle('is-unlocked', unlocked);
    section.classList.toggle('is-stage-active', active);
  });

  const percent = Math.round((exploredCount / gameZones.length) * 100);
  mapScore.textContent = `${exploredCount} / ${gameZones.length}`;
  mapBadge.textContent = `Keşif ${percent}%`;
  progressFill.style.width = `${percent}%`;
  routeProgress.style.strokeDashoffset = `${100 - percent}`;
  const routeCompletion = exploredCount > 0 ? (exploredCount - 1) / (gameZones.length - 1) : 0;
  window.careerCity3D?.setProgress(routeCompletion);

  if (exploredCount === gameZones.length) {
    mapStatus.textContent = 'Rota tamamlandı';
  } else {
    const nextNode = mapNodes[exploredCount];
    mapStatus.textContent = `Sıradaki durak: ${mapStopNames[nextNode.dataset.zone]}`;
  }

  movePlayer(exploredZones.at(-1) || gameZones[0]);
  localStorage.setItem('career-map-zones', JSON.stringify(exploredZones));
}

mapNodes.forEach((node) => {
  node.addEventListener('click', () => {
    const zone = node.dataset.zone;
    if (!exploredZones.includes(zone)) exploredZones.push(zone);
    lastMapNode = node;
    updateGame();
    playSceneTransition(zone);
  });
});

document.querySelector('.map-reset')?.addEventListener('click', () => {
  activeZone = null;
  exploredZones = [];
  document.body.classList.remove('section-open');
  localStorage.removeItem('career-map-zones');
  updateGame();
  mapNodes[0]?.focus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeZone && !document.querySelector('dialog[open]')) closeStage();
});

document.querySelectorAll('.brand, a[href="#career-map"]').forEach((link) => {
  link.addEventListener('click', () => {
    if (activeZone) closeStage();
  });
});

window.addEventListener('resize', () => movePlayer(exploredZones.at(-1) || gameZones[0]));

const academicReveals = [...document.querySelectorAll('.academic-reveal')];
const academicObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    entry.target.querySelectorAll('[data-count]').forEach((counter) => {
      if (counter.dataset.counted) return;
      counter.dataset.counted = 'true';
      const target = Number(counter.dataset.count);
      const decimals = String(counter.dataset.count).includes('.') ? 2 : 0;
      const start = performance.now();
      const duration = 1100;
      function count(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = (target * eased).toFixed(decimals).replace('.', ',');
        if (progress < 1) requestAnimationFrame(count);
      }
      requestAnimationFrame(count);
    });
    academicObserver.unobserve(entry.target);
  });
}, { threshold: .18 });
academicReveals.forEach((element) => academicObserver.observe(element));

updateGame();
