import * as THREE from 'three';

export type GamePhase =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'EVIDENCE'
  | 'GAME_OVER'
  | 'VICTORY';

export type EnemyKind = 'drone' | 'enforcer' | 'boss';

export interface ClueDefinition {
  id: string;
  title: string;
  zoneName: string;
  codeFragment: string;
  summary: string;
  storyReveal: string;
  position: [number, number, number];
  accentColor: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface HumanRig {
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  muzzlePoint: THREE.Object3D;
  walkPhase: number;
  aimBlend: number;
  recoil: number;
  flinch: number;
  baseHipY: number;
  lastX: number;
  lastZ: number;
}

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  mesh: THREE.Group;
  rig: HumanRig;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  patrolOrigin: THREE.Vector3;
  patrolAngle: number;
  hitFlashTimer: number;
  active: boolean;
  alive: boolean;
  healthBarFill: THREE.Mesh;
  healthBarGroup: THREE.Group;
  hitMeshes: THREE.Mesh[];
  radius: number;
  height: number;
}

export type RadarPOIKind = 'clue' | 'drone' | 'enforcer' | 'boss' | 'door' | 'medkit';

export interface RadarPOI {
  id: string;
  kind: RadarPOIKind;
  x: number;
  z: number;
  color: string;
}

export interface RadarSnapshot {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  pois: RadarPOI[];
}

export interface DamageNumber {
  id: number;
  amount: number;
  screenX: number;
  screenY: number;
  opacity: number;
  isKill: boolean;
}

export interface HUDState {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  collectedClueIds: string[];
  nearbyClue: ClueDefinition | null;
  nearbyBlastDoorLocked: boolean;
  blastDoorUnlocked: boolean;
  bossActive: boolean;
  bossHealth: number;
  bossMaxHealth: number;
  bossName: string;
  objectiveText: string;
  level: number;
  medkits: number;
  maxMedkits: number;
  healFlashTimer: number;
  levelBannerText: string | null;
  isCrouching: boolean;
  inCover: boolean;
  enemiesDefeated: number;
  totalDamageDealt: number;
  recentDamageTaken: number;
  damageNumbers: DamageNumber[];
  shotsFired: number;
  shotsHit: number;
  crosshairSpread: number;
  hitMarkerTimer: number;
  damageFlashTimer: number;
  pointerLocked: boolean;
  recentReveal: ClueDefinition | null;
  elapsedSeconds: number;
  radar: RadarSnapshot;
}
