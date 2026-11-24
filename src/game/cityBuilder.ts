import * as THREE from 'three';
import {
  BlastDoorRig,
  buildBlackMarketClinic,
  buildBlastDoor,
  buildCorporateTerminal,
  buildCrashedHoverCruiser,
  buildDataPadClue,
  buildPalmTree,
  buildPickupCell,
  buildStreetCar,
  buildStreetLamp,
} from './models';
import { CLUE_DEFINITIONS } from './storyData';
import {
  createBuildingFacadeTexture,
  createNeonSignTexture,
  createSunsetSkyTexture,
  createWetAsphaltTextures,
} from './textures';
import { AABB, ClueDefinition } from './types';

export interface ClueWorldItem {
  def: ClueDefinition;
  group: THREE.Group;
  padMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
  collected: boolean;
}

export interface PickupWorldItem {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  active: boolean;
  respawnTimer: number;
  isDrop?: boolean;
}

export interface BuiltCity {
  colliders: AABB[];
  coverColliders: AABB[];
  blastDoorColliderIndex: number;
  blastDoorRig: BlastDoorRig;
  clues: ClueWorldItem[];
  pickups: PickupWorldItem[];
  flickerLights: { light: THREE.PointLight; baseIntensity: number; phase: number }[];
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
}

export function buildCyberpunkCity(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuiltCity {
  const colliders: AABB[] = [];
  const coverColliders: AABB[] = [];
  const disposables = {
    geometries: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };
  const flickerLights: {
    light: THREE.PointLight;
    baseIntensity: number;
    phase: number;
  }[] = [];

  const trackMeshResources = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) disposables.geometries.push(mesh.geometry);
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => disposables.materials.push(m));
        } else if (mesh.material) {
          disposables.materials.push(mesh.material);
        }
      }
    });
  };

  const addStaticCollider = (
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    isCover = false
  ): number => {
    const box: AABB = {
      minX: cx - sx / 2,
      maxX: cx + sx / 2,
      minY: cy - sy / 2,
      maxY: cy + sy / 2,
      minZ: cz - sz / 2,
      maxZ: cz + sz / 2,
    };
    const idx = colliders.push(box) - 1;
    if (isCover) coverColliders.push(box);
    return idx;
  };

  // GTA Vice / Los Santos dusk-to-night sky dome & warm twilight fog
  scene.background = new THREE.Color(0x1f1429);
  scene.fog = new THREE.FogExp2(0x1f1429, 0.0112);

  const skyTex = createSunsetSkyTexture();
  disposables.textures.push(skyTex);
  const skyGeo = new THREE.SphereGeometry(145, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);
  disposables.geometries.push(skyGeo);
  disposables.materials.push(skyMat);

  // Warm sunset / sodium-vapor city lighting rig
  const hemi = new THREE.HemisphereLight(0xfb923c, 0x261830, 0.78);
  scene.add(hemi);

  const sunsetKey = new THREE.DirectionalLight(0xffb870, 1.35);
  sunsetKey.position.set(-36, 29, 32);
  if (!isSoftwareGl) {
    sunsetKey.castShadow = true;
    sunsetKey.shadow.mapSize.width = 2048;
    sunsetKey.shadow.mapSize.height = 2048;
    sunsetKey.shadow.camera.near = 5;
    sunsetKey.shadow.camera.far = 135;
    const d = 58;
    sunsetKey.shadow.camera.left = -d;
    sunsetKey.shadow.camera.right = d;
    sunsetKey.shadow.camera.top = d;
    sunsetKey.shadow.camera.bottom = -d;
    sunsetKey.shadow.bias = -0.0005;
    sunsetKey.shadow.normalBias = 0.02;
  }
  scene.add(sunsetKey);

  // Wet Reflective GTA Asphalt Street
  const asphaltMaps = createWetAsphaltTextures(maxAnisotropy);
  disposables.textures.push(asphaltMaps.map, asphaltMaps.roughnessMap);

  const groundGeo = new THREE.PlaneGeometry(220, 220);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltMaps.map,
    roughnessMap: asphaltMaps.roughnessMap,
    roughness: 0.4,
    metalness: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.geometries.push(groundGeo);
  disposables.materials.push(groundMat);

  // Central Plaza Concrete Sidewalk Pad (offset +0.03 to avoid Z-fighting)
  const plazaPadGeo = new THREE.BoxGeometry(24, 0.06, 26);
  const plazaPadMat = new THREE.MeshStandardMaterial({
    color: 0x2e2a33,
    metalness: 0.18,
    roughness: 0.72,
  });
  const plazaPad = new THREE.Mesh(plazaPadGeo, plazaPadMat);
  plazaPad.position.set(0, 0.03, 5);
  plazaPad.receiveShadow = true;
  scene.add(plazaPad);
  disposables.geometries.push(plazaPadGeo);
  disposables.materials.push(plazaPadMat);

  // Building facades (warm gold, sunset coral, Vice teal)
  const goldFacade = createBuildingFacadeTexture('#f59e0b', maxAnisotropy);
  const coralFacade = createBuildingFacadeTexture('#fb7185', maxAnisotropy);
  const tealFacade = createBuildingFacadeTexture('#2dd4bf', maxAnisotropy);
  disposables.textures.push(goldFacade, coralFacade, tealFacade);

  const makeBuildingMat = (tex: THREE.CanvasTexture, repeatX: number, repeatY: number) => {
    const cloned = tex.clone();
    cloned.needsUpdate = true;
    cloned.colorSpace = THREE.SRGBColorSpace;
    cloned.repeat.set(repeatX, repeatY);
    disposables.textures.push(cloned);
    const mat = new THREE.MeshStandardMaterial({
      map: cloned,
      emissiveMap: cloned,
      emissive: new THREE.Color(0xfff1d6),
      emissiveIntensity: 0.34,
      roughness: 0.68,
      metalness: 0.22,
    });
    disposables.materials.push(mat);
    return mat;
  };

  const addBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    facade: THREE.CanvasTexture,
    hasCollider = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = makeBuildingMat(
      facade,
      Math.max(1, Math.round(w / 10)),
      Math.max(1, Math.round(h / 14))
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = hasCollider;
    mesh.receiveShadow = true;
    scene.add(mesh);
    disposables.geometries.push(geo);
    if (hasCollider) {
      addStaticCollider(x, h / 2, z, w, h, d, false);
    }
  };

  // Perimeter Downtown District Buildings
  addBuilding(0, 48, 92, 26, 10, goldFacade);
  // West block & alley walls
  addBuilding(-45, 16, 12, 32, 62, coralFacade);
  addBuilding(-22, 30, 12, 22, 16, goldFacade);
  addBuilding(-20, -4, 10, 20, 14, tealFacade);
  // East block & alley walls
  addBuilding(45, 16, 12, 34, 62, goldFacade);
  addBuilding(18, 10, 9, 18, 12, coralFacade);
  addBuilding(20, 34, 12, 20, 10, goldFacade);

  // Vault Arena Perimeter Walls & Security Divider at z = -18
  addBuilding(-16, -18, 21, 9, 2.4, goldFacade);
  addBuilding(16, -18, 21, 9, 2.4, goldFacade);
  addBuilding(-24, -38, 6, 16, 40, coralFacade);
  addBuilding(24, -38, 6, 16, 40, tealFacade);
  addBuilding(0, -58, 54, 24, 6, coralFacade);

  // Outer Skyline Towers fading into sunset haze
  const skylineCoords: [number, number, number, number, number, THREE.CanvasTexture][] = [
    [-70, -25, 22, 58, 22, goldFacade],
    [-68, 25, 24, 48, 20, coralFacade],
    [70, -20, 22, 64, 24, coralFacade],
    [72, 28, 24, 52, 22, tealFacade],
    [-35, -75, 28, 72, 22, goldFacade],
    [35, -78, 28, 66, 22, coralFacade],
    [0, -86, 34, 82, 20, tealFacade],
    [-38, 72, 24, 46, 20, coralFacade],
    [38, 72, 24, 50, 20, goldFacade],
  ];
  skylineCoords.forEach(([x, z, w, h, d, tex]) =>
    addBuilding(x, z, w, h, d, tex, false)
  );

  // GTA Boulevard Marquee & Neon Storefront Signs
  const addNeonSign = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    label: string,
    sublabel: string,
    colorHex: string,
    lightColor: number
  ) => {
    const tex = createNeonSignTexture(label, sublabel, colorHex, maxAnisotropy);
    disposables.textures.push(tex);
    const signGeo = new THREE.PlaneGeometry(7.2, 2.25);
    const signMat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    scene.add(sign);
    disposables.geometries.push(signGeo);
    disposables.materials.push(signMat);

    const pLight = new THREE.PointLight(lightColor, 17, 22, 1.5);
    pLight.position.set(
      x + Math.sin(rotY) * 1.8,
      y,
      z + Math.cos(rotY) * 1.8
    );
    scene.add(pLight);
    flickerLights.push({
      light: pLight,
      baseIntensity: 17,
      phase: Math.random() * Math.PI * 2,
    });
  };

  addNeonSign(-14.8, 7.5, -4, -Math.PI / 2, 'OCEAN BLVD', 'WEST WRECKAGE', '#f59e0b', 0xf59e0b);
  addNeonSign(13.3, 6.8, 10, -Math.PI / 2, 'VICE MOTORS', 'RELAY // NORTH', '#fb7185', 0xfb7185);
  addNeonSign(20, 6.2, 28.8, Math.PI, '24/7 CLINIC', 'MED & SUPPLIES', '#2dd4bf', 0x2dd4bf);
  addNeonSign(0, 9.2, -16.6, 0, 'FEDERAL VAULT', 'RESTRICTED ZONE', '#ef4444', 0xef4444);

  // Concrete Jersey Roadblocks & Cover Barriers (1.35m height — hide behind when crouched!)
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    metalness: 0.14,
    roughness: 0.85,
  });
  const barrierTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });
  disposables.materials.push(barrierMat, barrierTrimMat);

  const addCoverBarrier = (x: number, z: number, lenX: number, lenZ: number) => {
    const h = 1.35;
    const baseGeo = new THREE.BoxGeometry(lenX, h, lenZ);
    const mesh = new THREE.Mesh(baseGeo, barrierMat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const trimGeo = new THREE.BoxGeometry(lenX * 0.94, 0.1, lenZ * 0.94);
    const trim = new THREE.Mesh(trimGeo, barrierTrimMat);
    trim.position.set(x, h + 0.05, z);
    scene.add(trim);

    disposables.geometries.push(baseGeo, trimGeo);
    addStaticCollider(x, h / 2, z, lenX, h + 0.12, lenZ, true);
  };

  // Plaza cover barriers
  addCoverBarrier(-6.5, 16, 4.2, 1.0);
  addCoverBarrier(6.5, 16, 4.2, 1.0);
  addCoverBarrier(0, 4, 5.2, 1.1);
  addCoverBarrier(-8.5, -6, 1.1, 4.2);
  addCoverBarrier(8.5, -6, 1.1, 4.2);
  // Boss arena concrete cover
  addCoverBarrier(-9.5, -30, 3.2, 1.4);
  addCoverBarrier(9.5, -30, 3.2, 1.4);
  addCoverBarrier(-9.5, -44, 3.2, 1.4);
  addCoverBarrier(9.5, -44, 3.2, 1.4);
  addCoverBarrier(0, -34, 4.0, 1.2);

  // Parked GTA Street Cars (functional cover + atmospheric headlights/taillights)
  const parkedCars: { x: number; z: number; rotY: number; color: number }[] = [
    { x: -8.2, z: 26.5, rotY: 0.12, color: 0xdc2626 },
    { x: 8.2, z: 26.5, rotY: -0.15, color: 0x0ea5e9 },
    { x: -13.5, z: 1.5, rotY: Math.PI / 2, color: 0xf59e0b },
    { x: 11.5, z: 28.5, rotY: Math.PI * 0.88, color: 0x3f3f46 },
    { x: -29.0, z: 2.0, rotY: 0.25, color: 0xe7e5e4 },
  ];

  parkedCars.forEach(({ x, z, rotY, color }) => {
    const car = buildStreetCar(color);
    car.position.set(x, 0, z);
    car.rotation.y = rotY;
    scene.add(car);
    trackMeshResources(car);

    const alongZ = Math.abs(Math.cos(rotY)) >= Math.abs(Math.sin(rotY));
    const sx = alongZ ? 2.05 : 4.4;
    const sz = alongZ ? 4.4 : 2.05;
    addStaticCollider(x, 0.72, z, sx, 1.45, sz, true);
  });

  // Palm Trees lining the Plaza & Boulevard
  const palmSpots: [number, number][] = [
    [-13.5, 25],
    [13.5, 25],
    [-13.5, 14],
    [13.5, 2],
    [-13.5, -2],
    [13.5, -13],
    [-26, 36],
    [27, 36],
  ];
  palmSpots.forEach(([x, z], idx) => {
    const palm = buildPalmTree(idx);
    palm.position.set(x, 0, z);
    scene.add(palm);
    trackMeshResources(palm);
    addStaticCollider(x, 1.5, z, 1.1, 3.0, 1.1, false);
  });

  // Warm Sodium-Vapor & Vice Streetlamps
  const lampConfigs: [number, number, number, number][] = [
    [-11, 22, 0, 0xfbbf24],
    [11, 22, Math.PI, 0xfbbf24],
    [-11, -10, 0, 0xfb923c],
    [11, -10, Math.PI, 0xfbbf24],
    [-25, 22, 0, 0xfb923c],
    [22, 14, Math.PI, 0xf43f5e],
    [-14, -26, 0, 0xef4444],
    [14, -26, Math.PI, 0xef4444],
  ];

  lampConfigs.forEach(([x, z, rotY, colorHex]) => {
    const lamp = buildStreetLamp(colorHex);
    lamp.position.set(x, 0, z);
    lamp.rotation.y = rotY;
    scene.add(lamp);
    trackMeshResources(lamp);

    const pLight = new THREE.PointLight(colorHex, 24, 26, 1.45);
    pLight.position.set(x + Math.cos(rotY) * 1.1, 6.0, z - Math.sin(rotY) * 1.1);
    scene.add(pLight);
  });

  // Investigation Zone 1: Crashed Cruiser (West Sector)
  const cruiser = buildCrashedHoverCruiser();
  cruiser.position.set(-28, 0, 12);
  scene.add(cruiser);
  trackMeshResources(cruiser);
  addStaticCollider(-28, 1.6, 12, 5.5, 3.2, 8.0, true);

  const cruiserLight = new THREE.PointLight(0xf59e0b, 18, 18, 1.5);
  cruiserLight.position.set(-25, 3.0, 14);
  scene.add(cruiserLight);

  // Investigation Zone 2: Corporate Server Terminal (Northeast)
  const terminal = buildCorporateTerminal();
  terminal.position.set(30, 0, -4.5);
  terminal.rotation.y = -Math.PI / 2;
  scene.add(terminal);
  trackMeshResources(terminal);
  addStaticCollider(30.8, 2.5, -4.5, 2.4, 5.0, 4.2, false);

  const termLight = new THREE.PointLight(0xfb7185, 18, 16, 1.6);
  termLight.position.set(27, 3.2, -4.5);
  scene.add(termLight);

  // Investigation Zone 3: 24/7 Back-Alley Clinic (Southeast)
  const clinic = buildBlackMarketClinic();
  clinic.position.set(28.5, 0, 22);
  clinic.rotation.y = -Math.PI / 2;
  scene.add(clinic);
  trackMeshResources(clinic);
  addStaticCollider(31, 2.0, 22, 1.2, 4.0, 6.8, false);

  const clinicLight = new THREE.PointLight(0x2dd4bf, 18, 16, 1.6);
  clinicLight.position.set(25, 3.2, 22);
  scene.add(clinicLight);

  // Central Blast Door at z = -18
  const blastDoorRig = buildBlastDoor();
  blastDoorRig.group.position.set(0, 0, -18);
  scene.add(blastDoorRig.group);
  trackMeshResources(blastDoorRig.group);
  const blastDoorColliderIndex = addStaticCollider(0, 3.2, -18, 9.6, 6.4, 1.6, false);

  const doorSpot = new THREE.SpotLight(0xef4444, 38, 26, Math.PI / 4, 0.5, 1.5);
  doorSpot.position.set(0, 8.5, -11);
  doorSpot.target.position.set(0, 2.5, -18);
  scene.add(doorSpot);
  scene.add(doorSpot.target);

  // 4 Encrypted Data Pad Clues
  const clues: ClueWorldItem[] = CLUE_DEFINITIONS.map((def) => {
    const built = buildDataPadClue(def.accentColor);
    built.group.position.set(def.position[0], 0, def.position[2]);
    scene.add(built.group);
    trackMeshResources(built.group);

    const clueLight = new THREE.PointLight(def.accentColor, 8, 9, 1.7);
    clueLight.position.set(def.position[0], 1.5, def.position[2]);
    scene.add(clueLight);

    return {
      def,
      group: built.group,
      padMesh: built.padMesh,
      beaconMesh: built.beaconMesh,
      collected: false,
    };
  });

  // Medicine Kits across Plaza, Clinic, and Vault Arena
  const pickupCoords: [number, number][] = [
    [-12, 8],
    [12, 16],
    [25.5, 22],
    [0, -24],
  ];
  const pickups: PickupWorldItem[] = pickupCoords.map(([x, z], idx) => {
    const mesh = buildPickupCell();
    mesh.position.set(x, 0.75, z);
    scene.add(mesh);
    trackMeshResources(mesh);
    return {
      id: `pickup-${idx}`,
      mesh,
      position: new THREE.Vector3(x, 0.75, z),
      active: true,
      respawnTimer: 0,
    };
  });

  return {
    colliders,
    coverColliders,
    blastDoorColliderIndex,
    blastDoorRig,
    clues,
    pickups,
    flickerLights,
    disposables,
  };
}
