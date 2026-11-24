import * as THREE from 'three';
import { HumanRig } from './types';

export interface RifleRig {
  group: THREE.Group;
  muzzleFlash: THREE.Mesh;
  muzzlePoint: THREE.Object3D;
  coilMesh: THREE.Mesh;
}

export function buildPlasmaRifle(): RifleRig {
  const group = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2532,
    metalness: 0.85,
    roughness: 0.25,
  });
  const matteGripMat = new THREE.MeshStandardMaterial({
    color: 0x0e1118,
    metalness: 0.15,
    roughness: 0.85,
  });
  const cyanEmissive = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.3,
  });
  const amberSightMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  // Main receiver chassis
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.14, 0.54),
    gunmetalMat
  );
  receiver.position.set(0, 0, -0.15);
  group.add(receiver);

  // Shrouded magnetic barrel rails
  const upperRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.42),
    matteGripMat
  );
  upperRail.position.set(0, 0.07, -0.44);
  group.add(upperRail);

  const lowerRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 0.38),
    gunmetalMat
  );
  lowerRail.position.set(0, -0.04, -0.42);
  group.add(lowerRail);

  // Glowing plasma accelerator core
  const coilMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.34, 12),
    cyanEmissive
  );
  coilMesh.rotation.x = Math.PI / 2;
  coilMesh.position.set(0, 0.015, -0.42);
  group.add(coilMesh);

  // Holographic iron sight housing
  const sightFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.045, 0.09),
    matteGripMat
  );
  sightFrame.position.set(0, 0.1, -0.12);
  group.add(sightFrame);

  const sightDot = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.012, 0.012),
    amberSightMat
  );
  sightDot.position.set(0, 0.105, -0.12);
  group.add(sightDot);

  // Side battery magazine cell
  const magCell = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.13, 0.12),
    matteGripMat
  );
  magCell.position.set(0, -0.11, -0.14);
  magCell.rotation.x = 0.2;
  group.add(magCell);

  // Muzzle emitter ring & flash mesh
  const muzzleTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.032, 0.05, 12),
    gunmetalMat
  );
  muzzleTip.rotation.x = Math.PI / 2;
  muzzleTip.position.set(0, 0.015, -0.64);
  group.add(muzzleTip);

  const muzzleFlash = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.09, 0),
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
    })
  );
  muzzleFlash.position.set(0, 0.015, -0.71);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.015, -0.72);
  group.add(muzzlePoint);

  return { group, muzzleFlash, muzzlePoint, coilMesh };
}

export function buildCrashedHoverCruiser(): THREE.Group {
  const root = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x263142,
    metalness: 0.8,
    roughness: 0.35,
  });
  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x11151d,
    metalness: 0.25,
    roughness: 0.85,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.45,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });

  const bodyTilt = new THREE.Group();
  bodyTilt.position.set(0, 1.35, 0);
  bodyTilt.rotation.set(0.08, 0.35, -0.22);

  // Main aerodyne fuselage
  const fuselage = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.15, 7.6),
    hullMat
  );
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  bodyTilt.add(fuselage);

  // Nose wedge
  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 1.55, 2.5, 4),
    hullMat
  );
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI / 4;
  nose.position.set(0, -0.1, 4.9);
  nose.scale.set(1.25, 0.55, 1);
  nose.castShadow = true;
  bodyTilt.add(nose);

  // Canopy glass
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.72, 3.1),
    canopyMat
  );
  canopy.position.set(0, 0.78, 1.1);
  bodyTilt.add(canopy);

  // Twin side vectored thruster nacelles
  [-2.2, 2.2].forEach((xOff, idx) => {
    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.82, 3.8, 10),
      charredMat
    );
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(xOff, -0.1, -1.3);
    if (idx === 0) nacelle.rotation.z = 0.22;
    nacelle.castShadow = true;
    bodyTilt.add(nacelle);

    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 8, 16),
      hazardMat
    );
    glowRing.position.set(xOff, -0.1, -3.2);
    bodyTilt.add(glowRing);
  });

  // Tail fin & emergency beacon
  const tailFin = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.7, 1.8),
    hullMat
  );
  tailFin.position.set(0, 1.1, -2.9);
  tailFin.rotation.x = -0.35;
  bodyTilt.add(tailFin);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    hazardMat
  );
  beacon.position.set(0, 1.95, -3.3);
  bodyTilt.add(beacon);

  root.add(bodyTilt);

  // Ground skid plate
  const crater = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 4.9, 0.08, 16),
    charredMat
  );
  crater.position.y = 0.04;
  crater.receiveShadow = true;
  root.add(crater);

  return root;
}

export function buildCorporateTerminal(): THREE.Group {
  const root = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x161d29,
    metalness: 0.85,
    roughness: 0.25,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    metalness: 0.4,
    roughness: 0.15,
  });
  const magentaStrip = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xd946ef,
    emissiveIntensity: 2.0,
    roughness: 0.25,
  });
  const cyanStrip = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });

  // Base platform
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.25, 4.4),
    frameMat
  );
  plinth.position.y = 0.125;
  plinth.receiveShadow = true;
  root.add(plinth);

  // Main server monolith
  const monolith = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 4.8, 1.4),
    frameMat
  );
  monolith.position.set(0, 2.65, -0.6);
  monolith.castShadow = true;
  monolith.receiveShadow = true;
  root.add(monolith);

  // Glowing data columns
  [-1.0, 0, 1.0].forEach((x) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 3.8, 0.08),
      magentaStrip
    );
    strip.position.set(x, 2.7, 0.14);
    root.add(strip);
  });

  // Angled console desk
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.05, 0.9),
    frameMat
  );
  desk.position.set(0, 0.77, 0.95);
  desk.castShadow = true;
  root.add(desk);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 0.06),
    glassMat
  );
  screen.position.set(0, 1.48, 0.9);
  screen.rotation.x = -0.35;
  root.add(screen);

  const screenBorder = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.08, 0.08),
    cyanStrip
  );
  screenBorder.position.set(0, 1.78, 0.79);
  root.add(screenBorder);

  // Security bollards
  [-2.1, 2.1].forEach((x) => {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 1.1, 10),
      frameMat
    );
    bollard.position.set(x, 0.8, 1.65);
    bollard.castShadow = true;
    root.add(bollard);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10),
      cyanStrip
    );
    cap.position.set(x, 1.38, 1.65);
    root.add(cap);
  });

  return root;
}

export function buildBlackMarketClinic(): THREE.Group {
  const root = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x221b2b,
    metalness: 0.45,
    roughness: 0.75,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    metalness: 0.85,
    roughness: 0.25,
  });
  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const magentaGlow = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xd946ef,
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });

  // Clinic open-front bay floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.2, 5.4),
    steelMat
  );
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  root.add(floor);

  // Rear & side shipping pod walls
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 3.8, 0.35),
    shellMat
  );
  backWall.position.set(0, 2.0, -2.5);
  backWall.castShadow = true;
  root.add(backWall);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 0.3, 5.6),
    shellMat
  );
  roof.position.set(0, 3.95, 0);
  roof.castShadow = true;
  root.add(roof);

  // Support pillars
  [-3.2, 3.2].forEach((x) => {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 3.7, 0.35),
      steelMat
    );
    pillar.position.set(x, 2.0, 2.4);
    pillar.castShadow = true;
    root.add(pillar);
  });

  // Cyber-surgery operating bed
  const bedBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.7, 2.4),
    steelMat
  );
  bedBase.position.set(-0.9, 0.55, 0);
  bedBase.castShadow = true;
  root.add(bedBase);

  const bedPad = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.18, 2.2),
    shellMat
  );
  bedPad.position.set(-0.9, 0.99, 0);
  root.add(bedPad);

  // Diagnostic monitor arch
  const monitorStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 1.8, 0.25),
    steelMat
  );
  monitorStand.position.set(1.4, 1.1, -0.5);
  root.add(monitorStand);

  const monitorScreen = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.75, 0.08),
    cyanGlow
  );
  monitorScreen.position.set(1.4, 1.9, -0.35);
  root.add(monitorScreen);

  // Neon medical cross sign mounted on roof fascia
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.32, 0.14),
    magentaGlow
  );
  crossH.position.set(0, 3.95, 2.86);
  root.add(crossH);

  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 1.3, 0.14),
    magentaGlow
  );
  crossV.position.set(0, 3.95, 2.86);
  root.add(crossV);

  return root;
}

export interface BlastDoorRig {
  group: THREE.Group;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  statusLightLeft: THREE.Mesh;
  statusLightRight: THREE.Mesh;
  statusMat: THREE.MeshStandardMaterial;
}

export function buildBlastDoor(): BlastDoorRig {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x181f2b,
    metalness: 0.88,
    roughness: 0.3,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x263143,
    metalness: 0.85,
    roughness: 0.4,
  });
  const statusMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Heavy outer frame pillars & lintel
  const leftPillar = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 7.2, 2.2),
    frameMat
  );
  leftPillar.position.set(-5.2, 3.6, 0);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 7.2, 2.2),
    frameMat
  );
  rightPillar.position.set(5.2, 3.6, 0);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;
  group.add(rightPillar);

  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 1.5, 2.4),
    frameMat
  );
  lintel.position.set(0, 6.75, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // Twin sliding armored blast leaves
  const leftLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 6.0, 0.9),
    doorMat
  );
  leftLeaf.position.set(-2.25, 3.0, 0);
  leftLeaf.castShadow = true;
  leftLeaf.receiveShadow = true;
  group.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 6.0, 0.9),
    doorMat
  );
  rightLeaf.position.set(2.25, 3.0, 0);
  rightLeaf.castShadow = true;
  rightLeaf.receiveShadow = true;
  group.add(rightLeaf);

  // Status indicators on pillars
  const statusLightLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 2.2, 0.2),
    statusMat
  );
  statusLightLeft.position.set(-5.2, 3.2, 1.15);
  group.add(statusLightLeft);

  const statusLightRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 2.2, 0.2),
    statusMat
  );
  statusLightRight.position.set(5.2, 3.2, 1.15);
  group.add(statusLightRight);

  return {
    group,
    leftLeaf,
    rightLeaf,
    statusLightLeft,
    statusLightRight,
    statusMat,
  };
}

export function buildStreetLamp(colorHex: number): THREE.Group {
  const root = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x26262c,
    metalness: 0.78,
    roughness: 0.42,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 2.4,
    roughness: 0.15,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.55, 10),
    poleMat
  );
  base.position.y = 0.275;
  root.add(base);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.13, 6.2, 10),
    poleMat
  );
  mast.position.y = 3.35;
  mast.castShadow = true;
  root.add(mast);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.11, 0.13),
    poleMat
  );
  arm.position.set(0.7, 6.32, 0);
  arm.rotation.z = 0.12;
  root.add(arm);

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.1, 0.36),
    poleMat
  );
  hood.position.set(1.25, 6.42, 0);
  root.add(hood);

  const lampHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.08, 0.28),
    bulbMat
  );
  lampHead.position.set(1.25, 6.34, 0);
  root.add(lampHead);

  return root;
}

export function buildPalmTree(seed = 0): THREE.Group {
  const root = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5b4332,
    roughness: 0.9,
    metalness: 0.05,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const innerFrondMat = new THREE.MeshStandardMaterial({
    color: 0x228b3b,
    roughness: 0.68,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const planterMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Grounded concrete sidewalk planter curb
  const planter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.24, 10),
    planterMat
  );
  planter.position.y = 0.12;
  planter.receiveShadow = true;
  root.add(planter);

  // Curved segmented palm trunk
  const bendDir = (seed % 4) * (Math.PI / 2) + 0.4;
  let curX = 0;
  let curZ = 0;
  let curY = 0.24;
  const segCount = 7;
  const segH = 1.05;

  for (let i = 0; i < segCount; i++) {
    const t = i / segCount;
    const rBottom = 0.26 - t * 0.11;
    const rTop = 0.24 - t * 0.11;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBottom, segH + 0.08, 8),
      trunkMat
    );
    const lean = 0.06 + t * 0.14;
    curX += Math.cos(bendDir) * lean * 0.55;
    curZ += Math.sin(bendDir) * lean * 0.55;
    seg.position.set(curX, curY + segH * 0.5, curZ);
    seg.rotation.z = -Math.cos(bendDir) * lean * 0.75;
    seg.rotation.x = Math.sin(bendDir) * lean * 0.75;
    seg.castShadow = true;
    root.add(seg);
    curY += segH;
  }

  // Radiating drooping palm fronds
  const crown = new THREE.Group();
  crown.position.set(curX, curY, curZ);
  root.add(crown);

  const frondCount = 9;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + (seed % 3) * 0.25;
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = angle;
    crown.add(frondPivot);

    const isUpper = i % 2 === 0;
    const mat = isUpper ? innerFrondMat : frondMat;

    const baseLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.04, 1.75),
      mat
    );
    baseLeaf.position.set(0, isUpper ? 0.28 : 0.1, 0.82);
    baseLeaf.rotation.x = isUpper ? -0.18 : 0.08;
    baseLeaf.castShadow = true;
    frondPivot.add(baseLeaf);

    const tipLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.035, 1.45),
      mat
    );
    tipLeaf.position.set(0, isUpper ? 0.12 : -0.32, 2.15);
    tipLeaf.rotation.x = isUpper ? 0.35 : 0.58;
    tipLeaf.castShadow = true;
    frondPivot.add(tipLeaf);
  }

  return root;
}

export function buildStreetCar(paintHex: number): THREE.Group {
  const root = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: paintHex,
    metalness: 0.72,
    roughness: 0.24,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.35,
    roughness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.9,
    roughness: 0.18,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.12,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.9,
    roughness: 0.15,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xef4444,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  // Lower chassis body
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 0.62, 4.35),
    paintMat
  );
  chassis.position.set(0, 0.62, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Cabin roof & angled greenhouse
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.52, 2.05),
    paintMat
  );
  cabin.position.set(0, 1.15, -0.18);
  cabin.castShadow = true;
  root.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.44, 2.12),
    glassMat
  );
  windshield.position.set(0, 1.13, -0.18);
  root.add(windshield);

  // Chrome bumpers
  [-2.2, 2.2].forEach((zOff) => {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.16, 0.14),
      chromeMat
    );
    bumper.position.set(0, 0.38, zOff);
    root.add(bumper);
  });

  // Rear spoiler
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.08, 0.28),
    trimMat
  );
  spoiler.position.set(0, 1.02, -1.96);
  root.add(spoiler);

  // Headlights (+Z front) & Taillights (-Z rear)
  [-0.64, 0.64].forEach((xOff) => {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.14, 0.06),
      headlightMat
    );
    hl.position.set(xOff, 0.68, 2.18);
    root.add(hl);

    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.06),
      taillightMat
    );
    tl.position.set(xOff, 0.72, -2.18);
    root.add(tl);
  });

  // 4 Grounded Wheels + Alloy Rims (sole touches y = 0)
  const wheelCoords: [number, number][] = [
    [-0.92, 1.32],
    [0.92, 1.32],
    [-0.92, -1.32],
    [0.92, -1.32],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.24, 14),
      trimMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.35, wz);
    tire.castShadow = true;
    root.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10),
      chromeMat
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.35, wz);
    root.add(rim);
  });

  return root;
}

export function buildDataPadClue(accentColor: number): {
  group: THREE.Group;
  padMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    metalness: 0.8,
    roughness: 0.35,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.9,
    roughness: 0.2,
    metalness: 0.3,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.14, 12),
    pedestalMat
  );
  base.position.y = 0.07;
  group.add(base);

  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 0.4),
    padMat
  );
  padMesh.position.y = 0.68;
  padMesh.rotation.x = -0.35;
  group.add(padMesh);

  const beaconMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.25, 2.4, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beaconMesh.position.y = 1.25;
  group.add(beaconMesh);

  return { group, padMesh, beaconMesh };
}

export function buildPickupCell(): THREE.Group {
  const group = new THREE.Group();
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.25,
    roughness: 0.45,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.3,
  });
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Main medical kit case
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.36, 0.42),
    caseMat
  );
  body.castShadow = true;
  group.add(body);

  // Protective corner bumper band
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.08, 0.44),
    trimMat
  );
  group.add(band);

  // Top carry handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.07, 0.07),
    trimMat
  );
  handle.position.y = 0.21;
  group.add(handle);

  // Glowing emerald medical cross on front & back
  [-0.215, 0.215].forEach((zOff) => {
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.07, 0.025),
      crossMat
    );
    crossH.position.z = zOff;
    group.add(crossH);

    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.24, 0.025),
      crossMat
    );
    crossV.position.z = zOff;
    group.add(crossV);
  });

  // Glowing medical cross on top lid
  const topCrossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.065),
    crossMat
  );
  topCrossH.position.y = 0.185;
  group.add(topCrossH);

  const topCrossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.02, 0.22),
    crossMat
  );
  topCrossV.position.y = 0.185;
  group.add(topCrossV);

  return group;
}

function createHealthBarRig(width: number): {
  healthBarGroup: THREE.Group;
  healthBarFill: THREE.Mesh;
} {
  const healthBarGroup = new THREE.Group();

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.14),
    new THREE.MeshBasicMaterial({
      color: 0x090d16,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  healthBarGroup.add(bg);

  const fillGeo = new THREE.PlaneGeometry(width - 0.06, 0.09);
  const fill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff3366,
      side: THREE.DoubleSide,
    })
  );
  fill.position.z = 0.01;
  healthBarGroup.add(fill);

  return { healthBarGroup, healthBarFill: fill };
}

export interface BuiltEnemyCharacter {
  group: THREE.Group;
  healthBarGroup: THREE.Group;
  healthBarFill: THREE.Mesh;
  hitMeshes: THREE.Mesh[];
  rig: HumanRig;
}

type HumanArchetype = 'scout' | 'enforcer' | 'boss';

function buildHumanCharacter(archetype: HumanArchetype): BuiltEnemyCharacter {
  const root = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];

  const scale =
    archetype === 'boss' ? 1.85 : archetype === 'enforcer' ? 1.08 : 1.0;

  const palette =
    archetype === 'scout'
      ? {
          armor: 0x881337, // GTA Vice-style crimson/burgundy bomber jacket
          suit: 0x18181b, // dark denim / street trousers
          accent: 0xf43f5e, // coral-pink shades & trim
          skin: 0xd6a587,
          hair: 0x18181b,
          weapon: 0x181f2c,
          pauldronScale: 0.85,
          chestWidth: 1.02,
          hasHelmet: false,
        }
      : archetype === 'enforcer'
        ? {
            armor: 0x27272a, // SWAT / mercenary tactical vest
            suit: 0x18181b,
            accent: 0xf59e0b, // gold/amber tactical visor
            skin: 0xc89578,
            hair: 0x1e2532,
            weapon: 0x151a24,
            pauldronScale: 1.15,
            chestWidth: 1.18,
            hasHelmet: true,
          }
        : {
            armor: 0x3b1d2a, // Heavy armored cartel/NOOSE juggernaut
            suit: 0x141418,
            accent: 0xf97316, // fiery orange-red visor & core
            skin: 0xb98a74,
            hair: 0x1d1626,
            weapon: 0x181d28,
            pauldronScale: 1.4,
            chestWidth: 1.32,
            hasHelmet: true,
          };

  const armorMat = new THREE.MeshStandardMaterial({
    color: palette.armor,
    metalness: 0.82,
    roughness: 0.28,
  });
  const suitMat = new THREE.MeshStandardMaterial({
    color: palette.suit,
    metalness: 0.14,
    roughness: 0.84,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: palette.skin,
    metalness: 0.04,
    roughness: 0.62,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: palette.hair,
    metalness: 0.12,
    roughness: 0.72,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    emissive: palette.accent,
    emissiveIntensity: archetype === 'boss' ? 2.6 : 2.2,
    metalness: 0.2,
    roughness: 0.18,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e16,
    metalness: 0.35,
    roughness: 0.68,
  });

  const addHitMesh = (mesh: THREE.Mesh, parent: THREE.Object3D) => {
    mesh.castShadow = true;
    parent.add(mesh);
    hitMeshes.push(mesh);
    return mesh;
  };

  // Master scaled skeleton wrapper so feet remain at y = 0
  const skeleton = new THREE.Group();
  skeleton.scale.setScalar(scale);
  root.add(skeleton);

  const baseHipY = 0.94;
  const hips = new THREE.Group();
  hips.position.set(0, baseHipY, 0);
  skeleton.add(hips);

  // Pelvis & tactical utility belt
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.13, 0.14, 12),
    suitMat
  );
  pelvis.scale.set(palette.chestWidth, 1, 0.82);
  addHitMesh(pelvis, hips);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.32 * palette.chestWidth, 0.06, 0.24),
    armorMat
  );
  belt.position.y = 0.03;
  addHitMesh(belt, hips);

  const beltBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.04),
    accentMat
  );
  beltBuckle.position.set(0, 0.03, 0.12);
  addHitMesh(beltBuckle, hips);

  // Articulated Torso & Spine
  const torso = new THREE.Group();
  torso.position.set(0, 0.07, 0);
  hips.add(torso);

  const abdomen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.135, 0.22, 12),
    suitMat
  );
  abdomen.position.y = 0.11;
  abdomen.scale.set(palette.chestWidth, 1, 0.78);
  addHitMesh(abdomen, torso);

  const ribcage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.195, 0.155, 0.28, 12),
    armorMat
  );
  ribcage.position.y = 0.34;
  ribcage.scale.set(palette.chestWidth, 1, 0.82);
  addHitMesh(ribcage, torso);

  // Chest armor plate + glowing cyber-core / tactical badge
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.3 * palette.chestWidth, 0.24, 0.28),
    armorMat
  );
  chestPlate.position.set(0, 0.35, 0.03);
  addHitMesh(chestPlate, torso);

  const chestCore = new THREE.Mesh(
    archetype === 'boss'
      ? new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16)
      : new THREE.BoxGeometry(0.14, 0.045, 0.04),
    accentMat
  );
  if (archetype === 'boss') {
    chestCore.rotation.x = Math.PI / 2;
    chestCore.position.set(0, 0.36, 0.17);
  } else {
    chestCore.position.set(0, 0.37, 0.165);
  }
  addHitMesh(chestCore, torso);

  // Spine power pack / cyber-jacket collar on back
  const spinePack = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.28, 0.12),
    suitMat
  );
  spinePack.position.set(0, 0.34, -0.15);
  addHitMesh(spinePack, torso);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.028, 8, 16, Math.PI * 1.3),
    armorMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI * 0.85;
  collar.position.set(0, 0.48, -0.02);
  addHitMesh(collar, torso);

  // Neck & Articulated Head
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.064, 0.12, 10),
    skinMat
  );
  neck.position.set(0, 0.52, 0.01);
  addHitMesh(neck, torso);

  const head = new THREE.Group();
  head.position.set(0, 0.57, 0.01);
  torso.add(head);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 12),
    palette.hasHelmet ? armorMat : skinMat
  );
  cranium.scale.set(0.92, 1.08, 1.02);
  cranium.position.set(0, 0.12, 0);
  addHitMesh(cranium, head);

  // Sculpted human jaw & chin
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.135, 0.1, 0.135),
    archetype === 'enforcer' ? suitMat : skinMat
  );
  jaw.position.set(0, 0.05, 0.032);
  addHitMesh(jaw, head);

  // Nose bridge for authentic human profile
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.055, 0.04),
    archetype === 'enforcer' ? armorMat : skinMat
  );
  nose.position.set(0, 0.105, 0.115);
  addHitMesh(nose, head);

  // Cyber-visor / glowing eyes
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.185, 0.046, 0.07),
    accentMat
  );
  visor.position.set(0, 0.135, 0.095);
  addHitMesh(visor, head);

  // Hair / helmet crest / ear comms
  if (archetype === 'scout') {
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    hairCrown.scale.set(0.95, 1.05, 1.06);
    hairCrown.position.set(0, 0.135, -0.01);
    addHitMesh(hairCrown, head);

    const hairCrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.08, 0.19),
      hairMat
    );
    hairCrest.position.set(0, 0.22, -0.01);
    hairCrest.rotation.x = -0.18;
    addHitMesh(hairCrest, head);
  } else {
    const helmetShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.132, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      armorMat
    );
    helmetShell.position.set(0, 0.13, -0.008);
    addHitMesh(helmetShell, head);

    const helmetFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.06, 0.2),
      accentMat
    );
    helmetFin.position.set(0, 0.25, -0.02);
    addHitMesh(helmetFin, head);
  }

  [-0.115, 0.115].forEach((ex) => {
    const earPod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.035, 8),
      armorMat
    );
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(ex, 0.12, 0);
    addHitMesh(earPod, head);
  });

  // Helper to build articulated left/right human arms
  const buildArm = (side: 'left' | 'right') => {
    const sign = side === 'left' ? 1 : -1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.235 * palette.chestWidth, 0.43, 0);
    torso.add(shoulder);

    const deltoid = new THREE.Mesh(
      new THREE.SphereGeometry(0.072 * palette.pauldronScale, 10, 10),
      armorMat
    );
    addHitMesh(deltoid, shoulder);

    if (archetype !== 'scout') {
      const pauldron = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.14 * palette.pauldronScale,
          0.11 * palette.pauldronScale,
          0.17 * palette.pauldronScale
        ),
        armorMat
      );
      pauldron.position.set(sign * 0.03, 0.03, 0);
      pauldron.rotation.z = -sign * 0.25;
      addHitMesh(pauldron, shoulder);
    }

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, 0.19, 5, 10),
      suitMat
    );
    upperArm.position.y = -0.135;
    addHitMesh(upperArm, shoulder);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.27, 0);
    shoulder.add(elbow);

    const elbowPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      armorMat
    );
    addHitMesh(elbowPad, elbow);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.044, 0.18, 5, 10),
      armorMat
    );
    forearm.position.y = -0.125;
    addHitMesh(forearm, elbow);

    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.085, 0.085),
      bootMat
    );
    hand.position.y = -0.255;
    addHitMesh(hand, elbow);

    return { shoulder, elbow };
  };

  const leftArm = buildArm('left');
  const rightArm = buildArm('right');

  // Attach firearm to right hand (plus secondary forearm cannon for Boss)
  const muzzlePoint = new THREE.Object3D();
  if (archetype === 'boss') {
    const buildArmCannon = (elbowParent: THREE.Group, xOff: number) => {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.56, 10),
        armorMat
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(xOff, -0.23, 0.22);
      addHitMesh(barrel, elbowParent);

      const coil = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.32),
        accentMat
      );
      coil.position.set(xOff, -0.19, 0.26);
      addHitMesh(coil, elbowParent);
    };
    buildArmCannon(rightArm.elbow, -0.03);
    buildArmCannon(leftArm.elbow, 0.03);
    muzzlePoint.position.set(-0.03, -0.23, 0.52);
    rightArm.elbow.add(muzzlePoint);
  } else {
    const gunLength = archetype === 'enforcer' ? 0.62 : 0.44;
    const gunReceiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.11, gunLength),
      bootMat
    );
    // Weapon points forward (+Z) when forearm aims horizontally forward
    gunReceiver.position.set(0, -0.25, 0.18);
    addHitMesh(gunReceiver, rightArm.elbow);

    const gunStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.03, gunLength * 0.65),
      accentMat
    );
    gunStrip.position.set(0, -0.21, 0.22);
    addHitMesh(gunStrip, rightArm.elbow);

    muzzlePoint.position.set(0, -0.24, 0.18 + gunLength * 0.52);
    rightArm.elbow.add(muzzlePoint);
  }

  // Helper to build articulated left/right human legs
  const buildLeg = (side: 'left' | 'right') => {
    const sign = side === 'left' ? 1 : -1;
    const hip = new THREE.Group();
    hip.position.set(sign * 0.115 * palette.chestWidth, 0, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.27, 5, 10),
      suitMat
    );
    thigh.position.y = -0.215;
    addHitMesh(thigh, hip);

    const thighHolster = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.14, 0.1),
      armorMat
    );
    thighHolster.position.set(sign * 0.068, -0.2, 0);
    addHitMesh(thighHolster, hip);

    const knee = new THREE.Group();
    knee.position.set(0, -0.45, 0);
    hip.add(knee);

    const kneePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.1, 0.08),
      armorMat
    );
    kneePad.position.set(0, 0, 0.045);
    addHitMesh(kneePad, knee);

    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.27, 5, 10),
      suitMat
    );
    shin.position.y = -0.205;
    addHitMesh(shin, knee);

    const shinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.22, 0.07),
      armorMat
    );
    shinGuard.position.set(0, -0.21, 0.04);
    addHitMesh(shinGuard, knee);

    // Tactical Boot (sole sits exactly at y = -0.49 below knee => world y = 0.94 - 0.45 - 0.49 = 0)
    const bootUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.125, 0.09, 0.21),
      bootMat
    );
    bootUpper.position.set(0, -0.425, 0.035);
    addHitMesh(bootUpper, knee);

    const bootSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.135, 0.04, 0.23),
      armorMat
    );
    bootSole.position.set(0, -0.47, 0.04);
    addHitMesh(bootSole, knee);

    return { hip, knee };
  };

  const leftLeg = buildLeg('left');
  const rightLeg = buildLeg('right');

  const healthBarWidth = archetype === 'boss' ? 2.8 : 1.4;
  const { healthBarGroup, healthBarFill } = createHealthBarRig(healthBarWidth);
  healthBarGroup.position.set(
    0,
    archetype === 'boss' ? 4.05 : archetype === 'enforcer' ? 2.42 : 2.25,
    0
  );
  root.add(healthBarGroup);

  const rig: HumanRig = {
    hips,
    torso,
    head,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    muzzlePoint,
    walkPhase: Math.random() * Math.PI * 2,
    aimBlend: 0,
    recoil: 0,
    flinch: 0,
    baseHipY,
    lastX: 0,
    lastZ: 0,
  };

  return { group: root, healthBarGroup, healthBarFill, hitMeshes, rig };
}

export function buildSecurityDrone(): BuiltEnemyCharacter {
  return buildHumanCharacter('scout');
}

export function buildCyberEnforcer(): BuiltEnemyCharacter {
  return buildHumanCharacter('enforcer');
}

export function buildBossMech(): BuiltEnemyCharacter {
  return buildHumanCharacter('boss');
}
