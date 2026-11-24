import * as THREE from 'three';

export interface WetAsphaltMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createWetAsphaltTextures(maxAnisotropy: number): WetAsphaltMaps {
  const size = 512;

  // Color / Albedo Canvas — GTA rain-slicked city street asphalt with double-yellow center & lane stripes
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  cCtx.fillStyle = '#18181d';
  cCtx.fillRect(0, 0, size, size);

  // Asphalt aggregate grain
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 20 + Math.floor(Math.random() * 24);
    cCtx.fillStyle = `rgb(${v + 2}, ${v + 1}, ${v})`;
    cCtx.fillRect(x, y, 2, 2);
  }

  // Subtle street seam & curb lines
  cCtx.strokeStyle = 'rgba(63, 63, 70, 0.5)';
  cCtx.lineWidth = 3;
  cCtx.strokeRect(1.5, 1.5, size - 3, size - 3);

  // Classic GTA double-yellow street centerline
  cCtx.fillStyle = 'rgba(234, 179, 8, 0.52)';
  cCtx.fillRect(size * 0.484, 0, 5, size);
  cCtx.fillRect(size * 0.506, 0, 5, size);

  // Worn white lane dashes
  cCtx.fillStyle = 'rgba(228, 228, 231, 0.25)';
  [28, 200, 372].forEach((y) => {
    cCtx.fillRect(size * 0.22, y, 5, 86);
    cCtx.fillRect(size * 0.77, y, 5, 86);
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16);
  map.anisotropy = maxAnisotropy;

  // Roughness Map (dark = glossy rain puddles, light = damp rough asphalt)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  rCtx.fillStyle = '#929292';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 38; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rx = 28 + Math.random() * 78;
    const ry = 20 + Math.random() * 64;
    const grad = rCtx.createRadialGradient(px, py, 4, px, py, Math.max(rx, ry));
    grad.addColorStop(0, '#121212');
    grad.addColorStop(0.65, '#303030');
    grad.addColorStop(1, 'rgba(146,146,146,0)');
    rCtx.fillStyle = grad;
    rCtx.beginPath();
    rCtx.ellipse(px, py, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    rCtx.fill();
  }

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(16, 16);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, roughnessMap };
}

export function createBuildingFacadeTexture(
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Warm concrete / urban stucco base
  ctx.fillStyle = '#1b1722';
  ctx.fillRect(0, 0, w, h);

  // Architectural floor slabs & vertical columns
  ctx.fillStyle = '#272230';
  for (let x = 0; x < w; x += 32) {
    ctx.fillRect(x, 0, 5, h);
  }
  for (let y = 0; y < h; y += 24) {
    ctx.fillRect(0, y, w, 4);
  }

  // Warm apartment / office windows mixed with accent signs
  const warmTones = ['#fbbf24', '#fde68a', '#fb923c', accentHex];
  for (let y = 8; y < h - 12; y += 24) {
    for (let x = 8; x < w - 12; x += 32) {
      const roll = Math.random();
      if (roll < 0.34) {
        ctx.fillStyle = warmTones[Math.floor(Math.random() * warmTones.length)];
        ctx.fillRect(x, y, 18, 12);
      } else if (roll < 0.55) {
        ctx.fillStyle = '#332c3f';
        ctx.fillRect(x, y, 18, 12);
      } else {
        ctx.fillStyle = '#110e17';
        ctx.fillRect(x, y, 18, 12);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createNeonSignTexture(
  label: string,
  sublabel: string,
  primaryColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#120d18';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 54px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h * 0.42);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(sublabel, w / 2, h * 0.76);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSunsetSkyTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Vice/Los Santos dusk-to-night gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#09091a');
  grad.addColorStop(0.32, '#1c1233');
  grad.addColorStop(0.5, '#4b1d47');
  grad.addColorStop(0.62, '#9a344c');
  grad.addColorStop(0.74, '#d97706');
  grad.addColorStop(0.84, '#24162d');
  grad.addColorStop(1.0, '#120d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft warm sunset glow orb on the western horizon
  const sunGlow = ctx.createRadialGradient(
    w * 0.34,
    h * 0.66,
    6,
    w * 0.34,
    h * 0.66,
    130
  );
  sunGlow.addColorStop(0, 'rgba(253, 224, 71, 0.72)');
  sunGlow.addColorStop(0.35, 'rgba(249, 115, 22, 0.42)');
  sunGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h);

  // Faint evening stars in the upper twilight sky
  ctx.fillStyle = 'rgba(254, 243, 199, 0.55)';
  for (let i = 0; i < 85; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * (h * 0.36);
    const sr = Math.random() < 0.2 ? 1.6 : 0.9;
    ctx.fillRect(sx, sy, sr, sr);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
