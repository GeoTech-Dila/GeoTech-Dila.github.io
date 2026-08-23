(() => {
  const canvas = document.getElementById('hero-smart-city-canvas');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;

  const context = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coral = [255, 112, 86];
  const white = [255, 245, 241];
  const walkerImage = null;
  const walkerNotes = [
    'Akıllı kentler doğru veriyle başlar.',
    'QGIS ile kenti katman katman okuyorum.',
    'CBS, kent kararlarını görünür kılar.',
    'Planlama; insanı, mekânı ve veriyi buluşturur.',
    'CityEngine ile kentin üçüncü boyutundayım.',
    'Her veri, kente dair yeni bir hikâye anlatır.'
  ];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let visible = true;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function random(seed) {
    const value = Math.sin(seed * 91.733) * 43758.5453;
    return value - Math.floor(value);
  }

  const buildings = [];
  for (let z = -4; z <= 4; z += 1) {
    for (let x = -4; x <= 4; x += 1) {
      if (x === 0 || z === 0 || (x + z) % 7 === 0) continue;
      const seed = (x + 7) * 17 + (z + 9) * 31;
      buildings.push({
        x, z,
        size: .5 + random(seed + 2) * .22,
        height: 28 + random(seed + 4) * 112,
        glow: random(seed + 8),
        antenna: random(seed + 11) > .82
      });
    }
  }
  buildings.sort((a, b) => (a.x + a.z) - (b.x + b.z));

  const networkNodes = buildings
    .filter((building) => building.glow > .76)
    .slice(0, 8);

  const walkerRoute = [
    [-4.8, 0], [-2.2, 0], [0, 0], [0, 3.8],
    [0, 0], [3.8, 0], [0, 0], [0, -3.8], [0, 0], [-4.8, 0]
  ];
  const walkerSegments = walkerRoute.slice(0, -1).map((point, index) => {
    const next = walkerRoute[index + 1];
    return { from: point, to: next, length: Math.hypot(next[0] - point[0], next[1] - point[1]) };
  });
  const walkerRouteLength = walkerSegments.reduce((sum, segment) => sum + segment.length, 0);

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function geometry() {
    const tile = Math.min(width / 10.2, height / 7.8, 82);
    return {
      tileX: tile,
      tileY: tile * .46,
      centerX: width * .56 + pointer.x * 24,
      centerY: height * .62 + pointer.y * 14
    };
  }

  function project(x, z, elevation = 0, city = geometry()) {
    return {
      x: city.centerX + (x - z) * city.tileX * .72,
      y: city.centerY + (x + z) * city.tileY * .72 - elevation
    };
  }

  function line(points, color, lineWidth = 1) {
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  function polygon(points, fill, stroke) {
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.closePath();
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function drawGround(city) {
    context.fillStyle = '#080a09';
    context.fillRect(0, 0, width, height);
    for (let value = -7; value <= 7; value += 1) {
      line([project(value, -7, 0, city), project(value, 7, 0, city)], 'rgba(255,128,102,.105)');
      line([project(-7, value, 0, city), project(7, value, 0, city)], 'rgba(255,255,255,.055)');
    }

    context.save();
    context.setLineDash([9, 13]);
    context.lineDashOffset = -(frame * .75);
    line([project(-6, 0, 1, city), project(6, 0, 1, city)], 'rgba(255,128,102,.72)', 2);
    line([project(0, -6, 1, city), project(0, 6, 1, city)], 'rgba(255,245,241,.5)', 1.4);
    context.restore();
  }

  function drawBuilding(building, city) {
    const half = building.size;
    const base = [
      project(building.x - half, building.z - half, 0, city),
      project(building.x + half, building.z - half, 0, city),
      project(building.x + half, building.z + half, 0, city),
      project(building.x - half, building.z + half, 0, city)
    ];
    const top = base.map((point) => ({ x: point.x, y: point.y - building.height }));
    const pulse = .48 + Math.sin(frame * .026 + building.glow * 8) * .17;
    polygon([base[1], base[2], top[2], top[1]], 'rgba(24,17,16,.94)', `rgba(${coral.join(',')},${.28 + building.glow * .3})`);
    polygon([base[2], base[3], top[3], top[2]], 'rgba(13,17,15,.98)', 'rgba(255,245,241,.18)');
    polygon(top, `rgba(${coral.join(',')},${.07 + building.glow * .1})`, `rgba(${coral.join(',')},${.45 + pulse * .35})`);

    if (building.height > 62) {
      const floors = Math.min(7, Math.floor(building.height / 18));
      for (let floor = 1; floor < floors; floor += 1) {
        const elevation = building.height * (floor / floors);
        const a = project(building.x + half, building.z - half, elevation, city);
        const b = project(building.x + half, building.z + half, elevation, city);
        line([a, b], `rgba(${coral.join(',')},.14)`);
      }
    }

    const roof = project(building.x, building.z, building.height, city);
    if (building.antenna) {
      const beamHeight = 34 + Math.sin(frame * .02 + building.x) * 8;
      const gradient = context.createLinearGradient(roof.x, roof.y, roof.x, roof.y - beamHeight);
      gradient.addColorStop(0, 'rgba(255,245,241,.86)');
      gradient.addColorStop(.28, 'rgba(255,112,86,.48)');
      gradient.addColorStop(1, 'rgba(255,112,86,0)');
      line([roof, { x: roof.x, y: roof.y - beamHeight }], gradient, 1.5);
      context.beginPath();
      context.arc(roof.x, roof.y - beamHeight, 2.2 + pulse * 2, 0, Math.PI * 2);
      context.fillStyle = `rgba(${white.join(',')},${pulse})`;
      context.shadowColor = '#ff7056';
      context.shadowBlur = 12;
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function drawNetwork(city) {
    context.save();
    context.globalCompositeOperation = 'screen';
    networkNodes.forEach((node, index) => {
      const next = networkNodes[(index + 2) % networkNodes.length];
      const from = project(node.x, node.z, node.height + 5, city);
      const to = project(next.x, next.z, next.height + 5, city);
      const lift = 34 + Math.abs(to.x - from.x) * .08;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.bezierCurveTo(from.x, from.y - lift, to.x, to.y - lift, to.x, to.y);
      context.strokeStyle = 'rgba(255,112,86,.18)';
      context.lineWidth = 1;
      context.stroke();

      const progress = (frame * .006 + index * .17) % 1;
      const inverse = 1 - progress;
      const px = inverse ** 3 * from.x + 3 * inverse ** 2 * progress * from.x + 3 * inverse * progress ** 2 * to.x + progress ** 3 * to.x;
      const py = inverse ** 3 * from.y + 3 * inverse ** 2 * progress * (from.y - lift) + 3 * inverse * progress ** 2 * (to.y - lift) + progress ** 3 * to.y;
      context.beginPath();
      context.arc(px, py, 2.4, 0, Math.PI * 2);
      context.fillStyle = '#fff7f4';
      context.shadowColor = '#ff7056';
      context.shadowBlur = 16;
      context.fill();
      context.shadowBlur = 0;
    });
    context.restore();
  }

  function getWalkerState(city) {
    let distance = (frame * .0115) % walkerRouteLength;
    let active = walkerSegments[0];
    for (const segment of walkerSegments) {
      if (distance <= segment.length) {
        active = segment;
        break;
      }
      distance -= segment.length;
    }
    const progress = active.length ? distance / active.length : 0;
    const x = active.from[0] + (active.to[0] - active.from[0]) * progress;
    const z = active.from[1] + (active.to[1] - active.from[1]) * progress;
    const dx = active.to[0] - active.from[0];
    const dz = active.to[1] - active.from[1];
    const foot = project(x, z, 3, city);
    const ahead = project(x + dx * .02, z + dz * .02, 3, city);
    return { x, z, dx, dz, foot, direction: ahead.x >= foot.x ? 1 : -1, depth: x + z + .08 };
  }

  function drawWalkerVector(walker, city) {
    const depthScale = .76 + Math.max(0, Math.min(1, (walker.depth + 7) / 14)) * .42;
    const step = Math.sin(frame * .16);
    const bob = Math.abs(step) * 1.8;
    const characterScale = Math.min(1.28, Math.max(.78, city.tileX / 66)) * depthScale;

    context.save();
    context.translate(walker.foot.x, walker.foot.y);
    context.scale(1, .42);
    context.beginPath();
    context.ellipse(0, 0, 18 * characterScale, 7 * characterScale, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,112,86,.2)';
    context.shadowColor = '#ff7056';
    context.shadowBlur = 16;
    context.fill();
    context.restore();

    context.save();
    context.globalCompositeOperation = 'screen';
    for (let index = 1; index <= 4; index += 1) {
      const tail = project(walker.x - walker.dx * index * .025, walker.z - walker.dz * index * .025, 4, city);
      context.beginPath();
      context.arc(tail.x, tail.y, Math.max(.7, 2.5 - index * .42), 0, Math.PI * 2);
      context.fillStyle = `rgba(255,112,86,${.34 - index * .06})`;
      context.shadowColor = '#ff7056';
      context.shadowBlur = 10;
      context.fill();
    }
    context.restore();

    context.save();
    context.translate(walker.foot.x, walker.foot.y - bob);
    context.scale(walker.direction * characterScale, characterScale);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(255,112,86,.82)';
    context.shadowBlur = 9;

    const coralLine = '#ff8066';
    const whiteLine = '#fff7f4';
    const darkFill = 'rgba(8,10,9,.92)';
    const backLeg = step > 0 ? -1 : 1;

    // Compact animated legs.
    context.lineWidth = 4.2;
    context.strokeStyle = 'rgba(255,128,102,.62)';
    context.beginPath();
    context.moveTo(-4, -17);
    context.lineTo(-6 + step * 5, -7);
    context.lineTo(-8 + step * 8, 0);
    context.stroke();
    context.strokeStyle = coralLine;
    context.beginPath();
    context.moveTo(4, -17);
    context.lineTo(6 - step * 5, -7);
    context.lineTo(8 - step * 8, 0);
    context.stroke();
    context.lineWidth = 2.2;
    line([{ x: -11 + step * 8, y: 0 }, { x: -5 + step * 8, y: 0 }], whiteLine, 2.2);
    line([{ x: 5 - step * 8, y: 0 }, { x: 11 - step * 8, y: 0 }], whiteLine, 2.2);

    // Short blazer body.
    polygon([
      { x: -11, y: -38 }, { x: 11, y: -38 }, { x: 13, y: -18 },
      { x: 4, y: -14 }, { x: 0, y: -20 }, { x: -4, y: -14 }, { x: -13, y: -18 }
    ], darkFill, coralLine);
    context.lineWidth = 1.2;
    line([{ x: -8, y: -35 }, { x: 0, y: -22 }, { x: 8, y: -35 }], 'rgba(255,247,244,.72)', 1.1);
    line([{ x: 0, y: -22 }, { x: 0, y: -15 }], coralLine, 1.1);

    // Arms swing opposite the legs; the forward hand carries a tiny plan roll.
    context.lineWidth = 3.6;
    context.strokeStyle = coralLine;
    context.beginPath();
    context.moveTo(-10, -34);
    context.lineTo(-15 - step * 3.2, -25);
    context.lineTo(-13 - step * 5, -18);
    context.stroke();
    context.beginPath();
    context.moveTo(10, -34);
    context.lineTo(14 + step * 3.2, -25);
    context.lineTo(12 + step * 5, -18);
    context.stroke();
    context.save();
    context.translate(14 + step * 5, -20);
    context.rotate(-.2);
    context.strokeStyle = whiteLine;
    context.lineWidth = 1.4;
    context.strokeRect(-2.5, -8, 5, 13);
    context.beginPath();
    context.ellipse(0, -8, 2.5, 1.4, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // Oversized head and flowing blonde-hair linework.
    context.beginPath();
    context.ellipse(0, -53, 14.5, 16, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,128,102,.11)';
    context.fill();
    context.strokeStyle = whiteLine;
    context.lineWidth = 1.6;
    context.stroke();
    context.strokeStyle = coralLine;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(-1, -54, 16.5, Math.PI * .84, Math.PI * 2.06);
    context.stroke();
    context.beginPath();
    context.moveTo(-13, -58);
    context.bezierCurveTo(-18, -48, -15, -39, -10, -35);
    context.moveTo(12, -60);
    context.bezierCurveTo(18, -49, 15, -40, 10, -35);
    context.stroke();

    // Minimal friendly face.
    context.shadowBlur = 5;
    context.fillStyle = whiteLine;
    context.beginPath();
    context.arc(-5, -54, 1.25, 0, Math.PI * 2);
    context.arc(5, -54, 1.25, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = 1.3;
    context.beginPath();
    context.arc(0, -49, 4.2, .18, Math.PI - .18);
    context.stroke();

    // A tiny data beacon keeps the avatar tied to the city system.
    context.beginPath();
    context.arc(0, -70, 2.2 + Math.sin(frame * .12) * .7, 0, Math.PI * 2);
    context.fillStyle = whiteLine;
    context.shadowBlur = 14;
    context.fill();
    context.restore();
  }

  function drawWalker(walker, city) {
    if (!walkerImage || !walkerImage.complete || !walkerImage.naturalWidth) {
      drawWalkerVector(walker, city);
      return;
    }

    const depthScale = .76 + Math.max(0, Math.min(1, (walker.depth + 7) / 14)) * .42;
    const step = Math.sin(frame * .16);
    const bob = Math.abs(step) * 1.6;
    const imageHeight = Math.min(156, Math.max(96, city.tileX * 2.1)) * depthScale;
    const imageWidth = imageHeight * (walkerImage.naturalWidth / walkerImage.naturalHeight);

    context.save();
    context.translate(walker.foot.x, walker.foot.y);
    context.scale(1, .42);
    context.beginPath();
    context.ellipse(0, 0, imageWidth * .25, imageHeight * .045, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,112,86,.22)';
    context.shadowColor = '#ff7056';
    context.shadowBlur = 16;
    context.fill();
    context.restore();

    context.save();
    context.globalCompositeOperation = 'screen';
    for (let index = 1; index <= 4; index += 1) {
      const tail = project(walker.x - walker.dx * index * .025, walker.z - walker.dz * index * .025, 4, city);
      context.beginPath();
      context.arc(tail.x, tail.y, Math.max(.7, 2.5 - index * .42), 0, Math.PI * 2);
      context.fillStyle = `rgba(255,112,86,${.34 - index * .06})`;
      context.shadowColor = '#ff7056';
      context.shadowBlur = 10;
      context.fill();
    }
    context.restore();

    context.save();
    context.translate(walker.foot.x, walker.foot.y - bob);
    context.rotate(step * .018);
    context.scale(walker.direction, 1);
    context.shadowColor = 'rgba(255,112,86,.52)';
    context.shadowBlur = 13;
    context.drawImage(walkerImage, -imageWidth / 2, -imageHeight, imageWidth, imageHeight);
    context.restore();
  }

  function drawCodeWalker(walker, city) {
    const depthScale = .76 + Math.max(0, Math.min(1, (walker.depth + 7) / 14)) * .42;
    const characterScale = Math.min(1.3, Math.max(.82, city.tileX / 58)) * depthScale;
    const phase = frame * .105;
    const stride = Math.sin(phase);
    const bob = Math.abs(Math.sin(phase * 2)) * 1.25;

    context.save();
    context.translate(walker.foot.x, walker.foot.y);
    context.scale(1, .42);
    context.beginPath();
    context.ellipse(0, 0, 17 * characterScale, 6.5 * characterScale, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,112,86,.2)';
    context.shadowColor = '#ff7056';
    context.shadowBlur = 14;
    context.fill();
    context.restore();

    context.save();
    context.globalCompositeOperation = 'screen';
    for (let index = 1; index <= 4; index += 1) {
      const tail = project(walker.x - walker.dx * index * .025, walker.z - walker.dz * index * .025, 4, city);
      context.beginPath();
      context.arc(tail.x, tail.y, Math.max(.7, 2.5 - index * .42), 0, Math.PI * 2);
      context.fillStyle = `rgba(255,112,86,${.34 - index * .06})`;
      context.shadowColor = '#ff7056';
      context.shadowBlur = 10;
      context.fill();
    }
    context.restore();

    context.save();
    context.translate(walker.foot.x, walker.foot.y - bob * characterScale);
    context.rotate(stride * .018);
    context.scale(walker.direction * characterScale, characterScale);
    const bodyScale = .82;
    context.scale(bodyScale, bodyScale);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(255,112,86,.58)';
    context.shadowBlur = 5;

    const coralLine = '#ff7359';
    const warmWhite = '#fff5f1';
    const darkSuit = '#0b0d0c';
    const suitLight = '#24201f';
    const skin = '#e9a07f';
    const hairDark = '#9f573a';
    const hairLight = '#f4bd7e';

    const drawSegment = (from, to, fromWidth, toWidth, fill, stroke) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.max(.001, Math.hypot(dx, dy));
      const normalX = -dy / length;
      const normalY = dx / length;
      context.beginPath();
      context.moveTo(from.x + normalX * fromWidth / 2, from.y + normalY * fromWidth / 2);
      context.quadraticCurveTo(
        (from.x + to.x) / 2 + normalX * (fromWidth + toWidth) / 5,
        (from.y + to.y) / 2 + normalY * (fromWidth + toWidth) / 5,
        to.x + normalX * toWidth / 2,
        to.y + normalY * toWidth / 2
      );
      context.arc(to.x, to.y, toWidth / 2, Math.atan2(normalY, normalX), Math.atan2(-normalY, -normalX));
      context.quadraticCurveTo(
        (from.x + to.x) / 2 - normalX * (fromWidth + toWidth) / 5,
        (from.y + to.y) / 2 - normalY * (fromWidth + toWidth) / 5,
        from.x - normalX * fromWidth / 2,
        from.y - normalY * fromWidth / 2
      );
      context.arc(from.x, from.y, fromWidth / 2, Math.atan2(-normalY, -normalX), Math.atan2(normalY, normalX));
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      if (stroke) {
        context.strokeStyle = stroke;
        context.lineWidth = .8;
        context.stroke();
      }
    };

    const drawLimb = (points, outerColor, innerColor, outerWidth, innerWidth, highlight) => {
      points.slice(0, -1).forEach((point, index) => {
        const taper = 1 - index * .14;
        drawSegment(point, points[index + 1], outerWidth * taper, outerWidth * (taper - .1), outerColor, null);
      });
      points.slice(0, -1).forEach((point, index) => {
        const taper = 1 - index * .14;
        drawSegment(point, points[index + 1], innerWidth * taper, innerWidth * (taper - .1), innerColor, null);
      });
      if (highlight) line(points, highlight, Math.max(.8, innerWidth * .16));
    };

    const drawLeg = (side, motion, far) => {
      const lift = Math.max(0, motion) * 4.2;
      const hip = { x: side * 3.1, y: -35 };
      const knee = { x: side * 2.2 + motion * 5.4, y: -18 - lift * .35 };
      const foot = { x: side * 1.6 + motion * 10.2, y: -lift };
      const outer = far ? 'rgba(255,115,89,.55)' : coralLine;
      const inner = far ? '#a96652' : skin;
      drawLimb([hip, knee, foot], outer, inner, far ? 8.2 : 8.8, far ? 6 : 6.5, far ? null : 'rgba(255,245,241,.24)');
      const shoeLength = far ? 5.4 : 6.2;
      context.beginPath();
      context.moveTo(foot.x - 2, foot.y - 2.2);
      context.quadraticCurveTo(foot.x + shoeLength * .55, foot.y - 2.6, foot.x + shoeLength, foot.y - .7);
      context.quadraticCurveTo(foot.x + shoeLength + .8, foot.y + 1.7, foot.x + shoeLength - 1, foot.y + 2.2);
      context.lineTo(foot.x - 2.2, foot.y + 1.9);
      context.closePath();
      context.fillStyle = '#090b0a';
      context.fill();
      context.strokeStyle = outer;
      context.lineWidth = .9;
      context.stroke();
    };

    drawLeg(-1, -stride, true);
    drawLeg(1, stride, false);

    const hairGradient = context.createLinearGradient(-16, -97, 15, -49);
    hairGradient.addColorStop(0, '#fff0bd');
    hairGradient.addColorStop(.42, hairLight);
    hairGradient.addColorStop(1, hairDark);
    context.beginPath();
    context.moveTo(-7, -94);
    context.bezierCurveTo(-18, -91, -19, -73, -15, -55);
    context.bezierCurveTo(-13, -47, -10, -43, -7, -40);
    context.bezierCurveTo(-8, -53, -5, -59, -2, -65);
    context.lineTo(7, -65);
    context.bezierCurveTo(12, -57, 13, -48, 10, -41);
    context.bezierCurveTo(18, -48, 20, -61, 17, -75);
    context.bezierCurveTo(15, -90, 7, -98, -7, -94);
    context.closePath();
    context.fillStyle = hairGradient;
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = 1.5;
    context.stroke();

    const armSwing = -stride;
    const backShoulder = { x: -8.2, y: -63 };
    const backElbow = { x: -13 + armSwing * 3.5, y: -49 };
    const backHand = { x: -11 + armSwing * 7, y: -35 };
    drawLimb([backShoulder, backElbow, backHand], 'rgba(255,115,89,.62)', '#171817', 7.2, 5.1, null);
    context.beginPath();
    context.arc(backHand.x, backHand.y, 2.2, 0, Math.PI * 2);
    context.fillStyle = skin;
    context.fill();

    context.beginPath();
    context.moveTo(-9.3, -66);
    context.bezierCurveTo(-11.2, -62, -10.3, -54, -8.3, -48);
    context.quadraticCurveTo(-6.8, -44, -5.1, -42);
    context.lineTo(-11.2, -27.5);
    context.quadraticCurveTo(0, -24.2, 11.2, -27.5);
    context.lineTo(5.1, -42);
    context.quadraticCurveTo(6.8, -44, 8.3, -48);
    context.bezierCurveTo(10.3, -54, 11.2, -62, 9.3, -66);
    context.quadraticCurveTo(0, -69, -9.3, -66);
    context.closePath();
    context.fillStyle = darkSuit;
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = 1.15;
    context.stroke();
    polygon([
      { x: -7.4, y: -63 }, { x: -1.2, y: -57 }, { x: -2.2, y: -42 },
      { x: -8.7, y: -29 }, { x: -10.1, y: -29.2 }, { x: -5.4, y: -43 }
    ], suitLight, 'rgba(255,245,241,.22)');
    polygon([
      { x: -5.3, y: -64 }, { x: 0, y: -53 }, { x: 5.3, y: -64 }, { x: 2, y: -66 }, { x: -2, y: -66 }
    ], '#f0d8cf', coralLine);
    line([{ x: -5.2, y: -42 }, { x: 5.2, y: -42 }], coralLine, 1.4);
    context.fillStyle = warmWhite;
    context.fillRect(-.7, -47, 1.4, 1.4);

    context.beginPath();
    context.roundRect(-2.7, -72, 5.4, 8, 2);
    context.fillStyle = skin;
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = 1;
    context.stroke();

    context.save();
    context.translate(0, -82.5);
    context.scale(1 / bodyScale, 1 / bodyScale);
    context.translate(0, 82.5);
    context.beginPath();
    context.ellipse(0, -82.5, 8.4, 10.6, 0, 0, Math.PI * 2);
    context.fillStyle = skin;
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = 1.25;
    context.stroke();

    context.beginPath();
    context.moveTo(-8.5, -84);
    context.bezierCurveTo(-8, -95, 3, -98, 8.5, -89.5);
    context.bezierCurveTo(5, -93, 1, -90, -1, -87);
    context.bezierCurveTo(-3, -91, -7, -89, -9.2, -84);
    context.closePath();
    context.fillStyle = hairGradient;
    context.fill();
    context.strokeStyle = coralLine;
    context.stroke();

    context.shadowBlur = 3;
    context.fillStyle = '#21130f';
    context.beginPath();
    context.arc(-2.9, -82.4, .52, 0, Math.PI * 2);
    context.arc(2.9, -82.4, .52, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#b83f35';
    context.lineWidth = .8;
    context.beginPath();
    context.arc(0, -78.4, 1.7, .22, Math.PI - .22);
    context.stroke();
    context.restore();
    context.shadowBlur = 7;

    context.strokeStyle = 'rgba(255,245,241,.64)';
    context.lineWidth = .8;
    context.beginPath();
    context.moveTo(-7.5, -91);
    context.bezierCurveTo(-13, -76, -12, -58, -9, -48);
    context.moveTo(-3.5, -94);
    context.bezierCurveTo(-7, -77, -5, -63, -6, -52);
    context.moveTo(4.5, -93);
    context.bezierCurveTo(12, -78, 12, -60, 8.5, -49);
    context.stroke();

    context.save();
    context.translate(10.5, -47);
    context.rotate(-.28);
    context.fillStyle = '#0b0d0c';
    context.strokeStyle = coralLine;
    context.lineWidth = 1.2;
    context.fillRect(-5.5, -8, 11, 20);
    context.strokeRect(-5.5, -8, 11, 20);
    line([{ x: -3.3, y: -3 }, { x: 3.2, y: -3 }], 'rgba(255,245,241,.4)', .7);
    line([{ x: -3.3, y: 1 }, { x: 2.2, y: 1 }], 'rgba(255,115,89,.72)', .7);
    context.beginPath();
    context.ellipse(3.9, -10, 3.1, 1.8, 0, 0, Math.PI * 2);
    context.fillStyle = warmWhite;
    context.fill();
    context.strokeStyle = coralLine;
    context.stroke();
    context.fillStyle = '#111312';
    context.fillRect(.8, -10, 6.2, 8.5);
    context.strokeRect(.8, -10, 6.2, 8.5);
    context.restore();

    const frontShoulder = { x: 8, y: -62 };
    const frontElbow = { x: 14, y: -52 };
    const frontHand = { x: 8.8, y: -43.5 };
    drawLimb([frontShoulder, frontElbow, frontHand], coralLine, darkSuit, 7.4, 5.3, 'rgba(255,245,241,.22)');
    context.beginPath();
    context.arc(frontHand.x, frontHand.y, 2.35, 0, Math.PI * 2);
    context.fillStyle = skin;
    context.fill();
    context.strokeStyle = coralLine;
    context.lineWidth = .8;
    context.stroke();

    context.beginPath();
    context.arc(0, -99, 1.7 + Math.sin(frame * .09) * .45, 0, Math.PI * 2);
    context.fillStyle = warmWhite;
    context.shadowColor = '#ff7359';
    context.shadowBlur = 13;
    context.fill();
    context.restore();
  }

  function drawWalkerNote(walker, city) {
    if (width < 520) return;
    const cycleDuration = 10.5;
    const visibleDuration = 7.8;
    const elapsed = performance.now() / 1000;
    const cycleTime = elapsed % cycleDuration;
    if (cycleTime >= visibleDuration) return;

    const fadeIn = Math.min(1, cycleTime / .55);
    const fadeOut = Math.min(1, (visibleDuration - cycleTime) / .7);
    const alpha = Math.min(fadeIn, fadeOut);
    const messageIndex = Math.floor(elapsed / cycleDuration) % walkerNotes.length;
    const message = walkerNotes[messageIndex];
    const depthScale = .76 + Math.max(0, Math.min(1, (walker.depth + 7) / 14)) * .42;
    const imageHeight = Math.min(156, Math.max(96, city.tileX * 2.1)) * depthScale;
    const compact = width < 520;
    const fontSize = compact ? 10 : 12;
    const lineHeight = compact ? 14 : 17;
    const bubbleWidth = compact ? 148 : 198;
    const padding = compact ? 10 : 13;
    const textWidth = bubbleWidth - padding * 2;

    context.save();
    context.font = `600 ${fontSize}px Arial, sans-serif`;
    const words = message.split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(testLine).width > textWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    const labelHeight = compact ? 17 : 20;
    const bubbleHeight = padding * 2 + labelHeight + lines.length * lineHeight;
    const characterCenterX = walker.foot.x;
    const preferLeft = characterCenterX > width * .67;
    const desiredX = preferLeft
      ? characterCenterX - bubbleWidth - 24
      : characterCenterX + 24;
    const bubbleX = Math.max(10, Math.min(width - bubbleWidth - 10, desiredX));
    const bubbleY = Math.max(54, Math.min(height - bubbleHeight - 18, walker.foot.y - imageHeight - bubbleHeight * .46));
    const radius = compact ? 5 : 7;
    const tailX = Math.max(bubbleX + 24, Math.min(bubbleX + bubbleWidth - 24, characterCenterX));
    const tailTargetX = characterCenterX;
    const tailTargetY = walker.foot.y - imageHeight * .72;

    context.globalAlpha = alpha;
    context.beginPath();
    context.moveTo(bubbleX + radius, bubbleY);
    context.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    context.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    context.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    context.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    context.lineTo(tailX + 8, bubbleY + bubbleHeight);
    context.lineTo(tailTargetX, tailTargetY);
    context.lineTo(tailX - 8, bubbleY + bubbleHeight);
    context.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    context.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    context.lineTo(bubbleX, bubbleY + radius);
    context.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    context.closePath();
    context.fillStyle = 'rgba(8,10,9,.94)';
    context.strokeStyle = 'rgba(255,128,102,.92)';
    context.lineWidth = 1;
    context.shadowColor = 'rgba(255,112,86,.42)';
    context.shadowBlur = 14;
    context.fill();
    context.stroke();

    context.shadowBlur = 0;
    context.fillStyle = '#ff8066';
    context.font = `700 ${compact ? 8 : 9}px Consolas, "Courier New", monospace`;
    context.fillText('DILA / KENT NOTU', bubbleX + padding, bubbleY + padding + (compact ? 7 : 8));
    context.fillStyle = '#fff7f4';
    context.font = `600 ${fontSize}px Arial, sans-serif`;
    lines.forEach((lineText, index) => {
      context.fillText(lineText, bubbleX + padding, bubbleY + padding + labelHeight + (index + 1) * lineHeight - 3);
    });
    context.restore();
  }

  function draw() {
    if (!visible) return;
    pointer.x += (pointer.targetX - pointer.x) * .045;
    pointer.y += (pointer.targetY - pointer.y) * .045;
    const city = geometry();
    drawGround(city);
    const walker = getWalkerState(city);
    const cityLayers = buildings.map((building) => ({ type: 'building', depth: building.x + building.z, building }));
    cityLayers.push({ type: 'walker', depth: walker.depth, walker });
    cityLayers.sort((a, b) => a.depth - b.depth).forEach((layer) => {
      if (layer.type === 'walker') drawCodeWalker(layer.walker, city);
      else drawBuilding(layer.building, city);
    });
    drawNetwork(city);
    drawWalkerNote(walker, city);
    frame += reduceMotion ? 0 : 1;
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    pointer.targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    pointer.targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });

  new ResizeObserver(() => {
    resize();
    if (reduceMotion) draw();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (visible && !wasVisible && !reduceMotion) requestAnimationFrame(draw);
  }, { threshold: .01 }).observe(hero);

  resize();
  draw();
})();
