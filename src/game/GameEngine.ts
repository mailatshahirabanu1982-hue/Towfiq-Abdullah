import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BuiltCity, buildCyberpunkCity, PickupWorldItem } from './cityBuilder';
import {
  buildBossMech,
  buildCyberEnforcer,
  buildPickupCell,
  buildPlasmaRifle,
  buildSecurityDrone,
  RifleRig,
} from './models';
import { soundEngine } from './soundEngine';
import { CLUE_DEFINITIONS } from './storyData';
import {
  AABB,
  ClueDefinition,
  DamageNumber,
  EnemyEntity,
  GamePhase,
  HUDState,
  RadarPOI,
} from './types';

// Reusable math scratchpads (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _ray = new THREE.Ray();
const _box3 = new THREE.Box3();
const _hitPoint = new THREE.Vector3();
const _splashMatrix = new THREE.Matrix4();
const _splashPos = new THREE.Vector3();
const _splashQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0)
);
const _splashScale = new THREE.Vector3();

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  fromPlayer: boolean;
  damage: number;
  life: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface FloatingDamage {
  id: number;
  amount: number;
  worldPos: THREE.Vector3;
  life: number;
  maxLife: number;
  isKill: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDState) => void;
  onPhaseChange: (phase: GamePhase) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private city: BuiltCity;
  private rifle: RifleRig;
  private envTexture: THREE.Texture;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  private phase: GamePhase = 'TITLE';

  // Player state
  private playerPos = new THREE.Vector3(0, 1.7, 34);
  private playerVelY = 0;
  private onGround = true;
  private isCrouching = false;
  private currentEyeHeight = 1.7;
  private inCover = false;
  private yaw = 0;
  private pitch = 0;
  private health = 100;
  private maxHealth = 100;
  private shield = 100;
  private maxShield = 100;
  private shieldRegenDelay = 0;

  // Weapon state
  private ammo = 24;
  private maxAmmo = 24;
  private isReloading = false;
  private reloadTimer = 0;
  private readonly reloadDuration = 1.15;
  private fireCooldown = 0;
  private rifleRecoil = 0;
  private muzzleFlashTimer = 0;
  private weaponBobTime = 0;
  private crosshairSpread = 0;
  private hitMarkerTimer = 0;
  private damageFlashTimer = 0;

  // Mystery & Progression state
  private collectedClueIds: string[] = [];
  private blastDoorUnlocked = false;
  private doorOpenProgress = 0;
  private recentReveal: ClueDefinition | null = null;
  private recentRevealTimer = 0;
  private elapsedSeconds = 0;
  private level = 1;
  private medkits = 2;
  private readonly maxMedkits = 5;
  private healFlashTimer = 0;
  private enemySpawnTimer = 5.5;
  private nextSpawnId = 1;
  private levelBannerText: string | null = null;
  private levelBannerTimer = 0;
  private enemiesDefeated = 0;
  private totalDamageDealt = 0;
  private recentDamageTaken = 0;
  private nextDamageId = 1;
  private shotsFired = 0;
  private shotsHit = 0;

  // Entities & VFX
  private enemies: EnemyEntity[] = [];
  private projectiles: Projectile[] = [];
  private particles: SparkParticle[] = [];
  private floatingDamages: FloatingDamage[] = [];
  private droppedPickups: PickupWorldItem[] = [];

  // Dynamic Acid-Rain Droplet Particle System
  private rainDropletCount = 0;
  private rainOriginPositions!: Float32Array;
  private rainFallSpeeds!: Float32Array;
  private rainVertexPositions!: Float32Array;
  private rainGeometry!: THREE.BufferGeometry;
  private rainMaterial!: THREE.LineBasicMaterial;
  private rainLines!: THREE.LineSegments;

  // Acid-Rain Asphalt Splash Ring Pool
  private readonly splashPoolSize = 48;
  private splashGeo!: THREE.RingGeometry;
  private splashMat!: THREE.MeshBasicMaterial;
  private splashMesh!: THREE.InstancedMesh;
  private splashPositions!: Float32Array;
  private splashTimers!: Float32Array;
  private splashCursor = 0;

  // Shared projectile & particle geometries/materials
  private playerBoltGeo = new THREE.SphereGeometry(0.11, 8, 8);
  private playerBoltMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  private enemyBoltGeo = new THREE.SphereGeometry(0.13, 8, 8);
  private enemyBoltMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  private bossBoltMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  private sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);

  // Input state
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private virtualMoveForward = 0;
  private virtualMoveRight = 0;
  private virtualSprint = false;
  private virtualFire = false;
  private pointerLocked = false;
  private hudEmitTimer = 0;
  private isDraggingFallback = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 180);
    this.camera.position.copy(this.playerPos);
    this.scene.add(this.camera);

    // Attach plasma rifle viewmodel to camera
    this.rifle = buildPlasmaRifle();
    this.rifle.group.position.set(0.28, -0.25, -0.35);
    this.camera.add(this.rifle.group);

    // Build cyberpunk city & investigation zones
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.city = buildCyberpunkCity(this.scene, maxAniso, this.isSoftwareGl);

    // Initialize dynamic acid-rain droplet & splash particle system
    this.initAcidRainSystem();

    // Spawn enemies
    this.spawnAllEnemies();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.clock.start();
    this.tick();
  }

  private spawnAllEnemies(): void {
    // Clear existing enemies
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.enemies = [];

    const hpScale = 1 + (this.level - 1) * 0.2;
    const speedScale = 1 + Math.min(0.35, (this.level - 1) * 0.06);
    const bossName =
      this.level === 1
        ? 'AEGIS-9 EXO-COMMANDER'
        : `AEGIS-9 EXO-COMMANDER MK-${this.level}`;

    const specs: {
      id: string;
      kind: 'drone' | 'enforcer' | 'boss';
      name: string;
      pos: [number, number, number];
      hp: number;
      speed: number;
      active: boolean;
    }[] = [
      {
        id: 'drone-plaza',
        kind: 'drone',
        name: 'Helios Recon Scout',
        pos: [-6, 0, 8],
        hp: Math.round(75 * hpScale),
        speed: 4.5 * speedScale,
        active: true,
      },
      {
        id: 'enforcer-west',
        kind: 'enforcer',
        name: 'Cyber-Enforcer',
        pos: [-20, 0, 12],
        hp: Math.round(110 * hpScale),
        speed: 3.8 * speedScale,
        active: true,
      },
      {
        id: 'drone-alley',
        kind: 'drone',
        name: 'Alley Recon Scout',
        pos: [-29, 0, -2],
        hp: Math.round(75 * hpScale),
        speed: 4.6 * speedScale,
        active: true,
      },
      {
        id: 'drone-northeast',
        kind: 'drone',
        name: 'Relay Sentry Scout',
        pos: [22, 0, -4],
        hp: Math.round(80 * hpScale),
        speed: 4.5 * speedScale,
        active: true,
      },
      {
        id: 'enforcer-clinic',
        kind: 'enforcer',
        name: 'Clinic Security Unit',
        pos: [20, 0, 20],
        hp: Math.round(115 * hpScale),
        speed: 3.9 * speedScale,
        active: true,
      },
      {
        id: 'enforcer-plaza-north',
        kind: 'enforcer',
        name: 'Vault Gate Enforcer',
        pos: [5, 0, -8],
        hp: Math.round(120 * hpScale),
        speed: 4.0 * speedScale,
        active: true,
      },
      {
        id: 'boss-titan',
        kind: 'boss',
        name: bossName,
        pos: [0, 0, -41],
        hp: Math.round(520 * hpScale),
        speed: 3.2 * speedScale,
        active: false,
      },
    ];

    specs.forEach((s) => {
      const built =
        s.kind === 'drone'
          ? buildSecurityDrone()
          : s.kind === 'enforcer'
            ? buildCyberEnforcer()
            : buildBossMech();
      built.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
      built.rig.lastX = s.pos[0];
      built.rig.lastZ = s.pos[2];
      this.scene.add(built.group);

      this.enemies.push({
        id: s.id,
        kind: s.kind,
        name: s.name,
        mesh: built.group,
        rig: built.rig,
        hp: s.hp,
        maxHp: s.hp,
        speed: s.speed,
        fireCooldown: 0.9 + Math.random() * 1.1,
        strafeDir: Math.random() < 0.5 ? -1 : 1,
        strafeTimer: 1.5 + Math.random() * 1.5,
        patrolOrigin: new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]),
        patrolAngle: Math.random() * Math.PI * 2,
        hitFlashTimer: 0,
        active: s.active,
        alive: true,
        healthBarFill: built.healthBarFill,
        healthBarGroup: built.healthBarGroup,
        hitMeshes: built.hitMeshes,
        radius: s.kind === 'boss' ? 1.05 : 0.55,
        height: s.kind === 'boss' ? 3.6 : s.kind === 'enforcer' ? 2.05 : 1.9,
      });
    });
  }

  private spawnReinforcementEnemy(): void {
    const cap = Math.min(10, 5 + this.level);
    let activeRegular = 0;
    for (const e of this.enemies) {
      if (e.alive && e.kind !== 'boss') activeRegular++;
    }
    if (activeRegular >= cap) return;

    const candidates: [number, number][] = [
      [-32, 26],
      [32, 24],
      [-32, -10],
      [32, -11],
      [0, 12],
    ];
    if (this.blastDoorUnlocked) {
      candidates.push([-14, -36], [14, -36]);
    }

    const farEnough = candidates.filter(([x, z]) => {
      const dx = x - this.playerPos.x;
      const dz = z - this.playerPos.z;
      return dx * dx + dz * dz >= 16 * 16;
    });
    const pool = farEnough.length > 0 ? farEnough : candidates;
    const [sx, sz] = pool[Math.floor(Math.random() * pool.length)];

    const enforcerChance = Math.min(0.65, 0.3 + (this.level - 1) * 0.1);
    const kind: 'drone' | 'enforcer' =
      Math.random() < enforcerChance ? 'enforcer' : 'drone';

    const hpScale = 1 + (this.level - 1) * 0.2;
    const speedScale = 1 + Math.min(0.35, (this.level - 1) * 0.06);
    const built =
      kind === 'drone' ? buildSecurityDrone() : buildCyberEnforcer();
    built.group.position.set(sx, 0, sz);
    built.rig.lastX = sx;
    built.rig.lastZ = sz;
    this.scene.add(built.group);

    _v1.set(sx, 1.1, sz);
    this.spawnSparks(_v1, kind === 'drone' ? 0xd946ef : 0xf59e0b, 10);

    this.enemies.push({
      id: `wave-${this.level}-${this.nextSpawnId++}`,
      kind,
      name: kind === 'drone' ? 'Helios Recon Unit' : 'Sector Enforcer',
      mesh: built.group,
      rig: built.rig,
      hp: Math.round((kind === 'drone' ? 75 : 112) * hpScale),
      maxHp: Math.round((kind === 'drone' ? 75 : 112) * hpScale),
      speed: (kind === 'drone' ? 4.6 : 3.9) * speedScale,
      fireCooldown: 1.0 + Math.random() * 0.9,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      strafeTimer: 1.4 + Math.random() * 1.4,
      patrolOrigin: new THREE.Vector3(sx, 0, sz),
      patrolAngle: Math.random() * Math.PI * 2,
      hitFlashTimer: 0,
      active: true,
      alive: true,
      healthBarFill: built.healthBarFill,
      healthBarGroup: built.healthBarGroup,
      hitMeshes: built.hitMeshes,
      radius: 0.55,
      height: kind === 'enforcer' ? 2.05 : 1.9,
    });
  }

  public setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase;
    if (nextPhase !== 'PLAYING' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.mouseDown = false;
    this.virtualFire = false;
    this.virtualMoveForward = 0;
    this.virtualMoveRight = 0;
    this.virtualSprint = false;
    this.keys = {};
    this.emitHud();
  }

  public setVirtualMove(forward: number, right: number, sprint: boolean): void {
    this.virtualMoveForward = THREE.MathUtils.clamp(forward, -1, 1);
    this.virtualMoveRight = THREE.MathUtils.clamp(right, -1, 1);
    this.virtualSprint = sprint;
  }

  public addLookDelta(dx: number, dy: number): void {
    if (this.phase !== 'PLAYING') return;
    const sensitivity = 0.0042;
    this.yaw -= dx * sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * sensitivity,
      -1.42,
      1.42
    );
  }

  public setVirtualFire(firing: boolean): void {
    soundEngine.unlock();
    this.virtualFire = firing;
  }

  public triggerJump(): void {
    if (this.phase !== 'PLAYING') return;
    soundEngine.unlock();
    if (this.onGround) {
      this.playerVelY = 8.6;
      this.onGround = false;
    }
  }

  public triggerReload(): void {
    if (this.phase !== 'PLAYING') return;
    soundEngine.unlock();
    if (!this.isReloading && this.ammo < this.maxAmmo) {
      this.startReload();
    }
  }

  public triggerScan(): void {
    if (this.phase !== 'PLAYING') return;
    soundEngine.unlock();
    this.tryScanNearbyClue();
  }

  public useMedicine(): void {
    if (this.phase !== 'PLAYING') return;
    soundEngine.unlock();
    if (this.medkits <= 0) return;
    if (this.health >= this.maxHealth && this.shield >= this.maxShield) return;

    this.medkits -= 1;
    this.health = Math.min(this.maxHealth, this.health + 50);
    this.shield = Math.min(this.maxShield, this.shield + 25);
    this.healFlashTimer = 0.45;
    soundEngine.playHeal();
    this.emitHud();
  }

  public toggleCrouch(): void {
    if (this.phase !== 'PLAYING') return;
    soundEngine.unlock();
    this.isCrouching = !this.isCrouching;
    soundEngine.playClick();
    this.emitHud();
  }

  public setCrouch(crouching: boolean): void {
    if (this.phase !== 'PLAYING') return;
    this.isCrouching = crouching;
    this.emitHud();
  }

  public requestPointerLock(): void {
    soundEngine.unlock();
    const canvas = this.renderer.domElement;
    if (canvas.requestPointerLock) {
      try {
        const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Ignore PointerLock refusal in sandboxed frames
      }
    }
  }

  private clearDynamicWorldObjects(): void {
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
    this.droppedPickups.forEach((pk) => {
      this.scene.remove(pk.mesh);
    });
    this.droppedPickups = [];
  }

  private resetStageGeometryAndClues(): void {
    this.collectedClueIds = [];
    this.blastDoorUnlocked = false;
    this.doorOpenProgress = 0;
    this.recentReveal = null;
    this.recentRevealTimer = 0;
    this.floatingDamages = [];

    this.city.blastDoorRig.leftLeaf.position.x = -2.25;
    this.city.blastDoorRig.rightLeaf.position.x = 2.25;
    this.city.blastDoorRig.statusMat.color.setHex(0xef4444);
    this.city.blastDoorRig.statusMat.emissive.setHex(0xef4444);
    this.city.colliders[this.city.blastDoorColliderIndex] = {
      minX: -4.8,
      maxX: 4.8,
      minY: 0,
      maxY: 6.4,
      minZ: -18.8,
      maxZ: -17.2,
    };

    this.city.clues.forEach((c) => {
      c.collected = false;
      c.padMesh.visible = true;
      c.beaconMesh.visible = true;
    });

    this.city.pickups.forEach((p) => {
      p.active = true;
      p.respawnTimer = 0;
      p.mesh.visible = true;
    });
  }

  public advanceToNextLevel(): void {
    this.clearDynamicWorldObjects();
    this.level += 1;
    this.medkits = Math.min(this.maxMedkits, this.medkits + 1);
    this.health = Math.min(this.maxHealth, this.health + 35);
    this.shield = this.maxShield;
    this.shieldRegenDelay = 0;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;

    this.playerPos.set(0, 1.7, 34);
    this.playerVelY = 0;
    this.onGround = true;
    this.isCrouching = false;
    this.currentEyeHeight = 1.7;
    this.inCover = false;
    this.yaw = 0;
    this.pitch = 0;

    this.enemySpawnTimer = Math.max(3.5, 6.0 - this.level * 0.6);
    this.levelBannerText = `LEVEL ${this.level} · HOSTILES REINFORCED`;
    this.levelBannerTimer = 3.8;

    this.resetStageGeometryAndClues();
    this.spawnAllEnemies();
    soundEngine.playBlastDoorUnlock();
    this.emitHud();
  }

  public resetMission(): void {
    this.clearDynamicWorldObjects();

    // Reset player
    this.playerPos.set(0, 1.7, 34);
    this.playerVelY = 0;
    this.onGround = true;
    this.isCrouching = false;
    this.currentEyeHeight = 1.7;
    this.inCover = false;
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;
    this.shield = 100;
    this.shieldRegenDelay = 0;
    this.level = 1;
    this.medkits = 2;
    this.healFlashTimer = 0;
    this.enemySpawnTimer = 5.5;
    this.levelBannerText = null;
    this.levelBannerTimer = 0;

    // Reset weapon
    this.ammo = 24;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.rifleRecoil = 0;
    this.crosshairSpread = 0;
    this.hitMarkerTimer = 0;
    this.damageFlashTimer = 0;

    // Reset progression stats
    this.elapsedSeconds = 0;
    this.enemiesDefeated = 0;
    this.totalDamageDealt = 0;
    this.recentDamageTaken = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;

    this.resetStageGeometryAndClues();
    this.spawnAllEnemies();
    this.emitHud();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'Tab') {
      if (this.phase === 'PLAYING' || this.phase === 'EVIDENCE') {
        e.preventDefault();
        soundEngine.playClick();
        this.callbacks.onPhaseChange(
          this.phase === 'PLAYING' ? 'EVIDENCE' : 'PLAYING'
        );
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.phase === 'PLAYING') {
        e.preventDefault();
        this.callbacks.onPhaseChange('PAUSED');
      } else if (this.phase === 'PAUSED' || this.phase === 'EVIDENCE') {
        e.preventDefault();
        this.callbacks.onPhaseChange('PLAYING');
      }
      return;
    }

    if (this.phase !== 'PLAYING') return;

    if (e.code === 'KeyR' && !this.isReloading && this.ammo < this.maxAmmo) {
      this.startReload();
    }

    if (e.code === 'KeyE') {
      this.tryScanNearbyClue();
    }

    if (e.code === 'KeyQ' || e.code === 'KeyH') {
      this.useMedicine();
    }

    if (e.code === 'KeyC') {
      this.toggleCrouch();
    }

    if (e.code === 'Space' && this.onGround) {
      this.isCrouching = false;
      this.playerVelY = 8.6;
      this.onGround = false;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.phase !== 'PLAYING') return;
    if (this.pointerLocked) {
      const sensitivity = 0.0021;
      this.yaw -= e.movementX * sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * sensitivity,
        -1.42,
        1.42
      );
    } else if (this.isDraggingFallback) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.yaw -= dx * 0.003;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.003, -1.42, 1.42);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.phase !== 'PLAYING') return;
    if (e.button !== 0) return;
    soundEngine.unlock();
    if (!this.pointerLocked) {
      this.requestPointerLock();
      this.isDraggingFallback = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
    this.mouseDown = true;
  };

  private onMouseUp = () => {
    this.mouseDown = false;
    this.isDraggingFallback = false;
  };

  private onPointerLockChange = () => {
    this.pointerLocked =
      document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.onContextLost
    );
  }

  private startReload(): void {
    this.isReloading = true;
    this.reloadTimer = this.reloadDuration;
    soundEngine.playReload();
  }

  private tryScanNearbyClue(): void {
    const nearby = this.getNearbyClue();
    if (!nearby) return;

    nearby.collected = true;
    nearby.padMesh.visible = false;
    nearby.beaconMesh.visible = false;
    this.collectedClueIds = [...this.collectedClueIds, nearby.def.id];
    this.recentReveal = nearby.def;
    this.recentRevealTimer = 4.5;
    soundEngine.playClueScan();

    // Unlock Central Blast Door & awaken Boss when all 4 clues are collected
    if (
      this.collectedClueIds.length >= CLUE_DEFINITIONS.length &&
      !this.blastDoorUnlocked
    ) {
      this.blastDoorUnlocked = true;
      soundEngine.playBlastDoorUnlock();
      this.city.blastDoorRig.statusMat.color.setHex(0x10b981);
      this.city.blastDoorRig.statusMat.emissive.setHex(0x10b981);

      // Clear blast door collider so player can enter the Vault Arena
      this.city.colliders[this.city.blastDoorColliderIndex] = {
        minX: 0,
        maxX: 0,
        minY: -10,
        maxY: -9,
        minZ: 0,
        maxZ: 0,
      };

      const boss = this.enemies.find((e) => e.kind === 'boss');
      if (boss) boss.active = true;
    }

    this.emitHud();
  }

  private getNearbyClue() {
    let closest: (typeof this.city.clues)[number] | null = null;
    let bestDistSq = 4.8 * 4.8;
    for (const c of this.city.clues) {
      if (c.collected) continue;
      const dx = c.group.position.x - this.playerPos.x;
      const dz = c.group.position.z - this.playerPos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        closest = c;
      }
    }
    return closest;
  }

  private firePlayerRifle(): void {
    if (this.isReloading || this.fireCooldown > 0) return;

    if (this.ammo <= 0) {
      this.fireCooldown = 0.25;
      soundEngine.playEmptyClick();
      this.startReload();
      return;
    }

    this.ammo -= 1;
    this.shotsFired += 1;
    this.fireCooldown = 0.14;
    this.rifleRecoil = 1.0;
    this.muzzleFlashTimer = 0.045;
    this.crosshairSpread = Math.min(1.0, this.crosshairSpread + 0.45);
    soundEngine.playPlasmaShot();

    // Compute world ray from center of screen
    this.camera.getWorldDirection(_forward);
    this.rifle.muzzlePoint.getWorldPosition(_v1);

    // Raycast against alive active enemies + colliders for instant crisp plasma targeting
    _ray.set(this.camera.position, _forward);

    let closestStaticDist = 110;
    for (const box of this.city.colliders) {
      _box3.min.set(box.minX, box.minY, box.minZ);
      _box3.max.set(box.maxX, box.maxY, box.maxZ);
      if (_ray.intersectBox(_box3, _hitPoint)) {
        const d = _hitPoint.distanceTo(this.camera.position);
        if (d < closestStaticDist) closestStaticDist = d;
      }
    }

    // Check enemy bounding cylinders/boxes along aim ray
    let hitEnemy: EnemyEntity | null = null;
    let closestEnemyDist = closestStaticDist;

    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.active) continue;
      _box3.min.set(
        enemy.mesh.position.x - enemy.radius,
        enemy.mesh.position.y,
        enemy.mesh.position.z - enemy.radius
      );
      _box3.max.set(
        enemy.mesh.position.x + enemy.radius,
        enemy.mesh.position.y + enemy.height,
        enemy.mesh.position.z + enemy.radius
      );
      if (_ray.intersectBox(_box3, _hitPoint)) {
        const d = _hitPoint.distanceTo(this.camera.position);
        if (d < closestEnemyDist) {
          closestEnemyDist = d;
          hitEnemy = enemy;
        }
      }
    }

    // Target point for visual plasma bolt travel
    _v2.copy(this.camera.position).addScaledVector(_forward, closestEnemyDist);
    _v3.copy(_v2).sub(_v1).normalize();

    const boltMesh = new THREE.Mesh(this.playerBoltGeo, this.playerBoltMat);
    boltMesh.position.copy(_v1);
    this.scene.add(boltMesh);
    this.projectiles.push({
      mesh: boltMesh,
      velocity: _v3.clone().multiplyScalar(82),
      fromPlayer: true,
      damage: 0, // hit resolved cleanly below
      life: Math.min(0.65, closestEnemyDist / 82 + 0.02),
    });

    if (hitEnemy) {
      this.shotsHit += 1;
      this.hitMarkerTimer = 0.14;
      soundEngine.playHitMarker();
      this.spawnSparks(_v2, 0x22d3ee, 6);
      this.damageEnemy(hitEnemy, 26, _v2);
    } else if (closestStaticDist < 105) {
      this.spawnSparks(_v2, 0x67e8f9, 4);
    }

    if (this.ammo === 0) {
      this.startReload();
    }
  }

  private damageEnemy(
    enemy: EnemyEntity,
    amount: number,
    hitPos?: THREE.Vector3
  ): void {
    const applied = Math.min(enemy.hp, amount);
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.totalDamageDealt += applied;
    enemy.hitFlashTimer = 0.09;
    enemy.rig.flinch = 1.0;
    const ratio = enemy.hp / enemy.maxHp;
    enemy.healthBarFill.scale.x = Math.max(0.001, ratio);
    enemy.healthBarFill.position.x =
      (-(1 - ratio) * (enemy.kind === 'boss' ? 2.74 : 1.34)) / 2;

    const isLethal = enemy.hp <= 0 && enemy.alive;

    const popupPos = hitPos
      ? hitPos.clone()
      : enemy.mesh.position.clone().setY(enemy.mesh.position.y + enemy.height * 0.7);
    popupPos.y += 0.25;
    popupPos.x += (Math.random() - 0.5) * 0.25;
    popupPos.z += (Math.random() - 0.5) * 0.25;
    this.floatingDamages.push({
      id: this.nextDamageId++,
      amount,
      worldPos: popupPos,
      life: 0.72,
      maxLife: 0.72,
      isKill: isLethal,
    });
    if (this.floatingDamages.length > 20) {
      this.floatingDamages.shift();
    }

    enemy.hitMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && 'emissive' in mat) {
        if (m.userData.origEmissive === undefined) {
          m.userData.origEmissive = mat.emissive.getHex();
          m.userData.origEmissiveIntensity = mat.emissiveIntensity;
        }
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 1.8;
      }
    });

    if (isLethal) {
      enemy.alive = false;
      this.enemiesDefeated += 1;
      const center = _v1.copy(enemy.mesh.position);
      center.y += enemy.height * 0.5;
      this.spawnSparks(
        center,
        enemy.kind === 'boss' ? 0xf59e0b : 0xd946ef,
        enemy.kind === 'boss' ? 32 : 16
      );
      soundEngine.playExplosion(enemy.kind === 'boss');
      this.scene.remove(enemy.mesh);

      if (enemy.kind === 'boss') {
        if (this.level < 3) {
          this.advanceToNextLevel();
          return;
        } else {
          soundEngine.playVictory();
          this.callbacks.onPhaseChange('VICTORY');
        }
      } else if (
        this.health < 55 ||
        Math.random() < 0.45
      ) {
        this.spawnDroppedMedkit(
          enemy.mesh.position.x,
          enemy.mesh.position.z
        );
      }
    }

    this.emitHud();
  }

  private spawnDroppedMedkit(x: number, z: number): void {
    if (this.droppedPickups.length >= 8) {
      const oldest = this.droppedPickups.shift();
      if (oldest) this.scene.remove(oldest.mesh);
    }
    const mesh = buildPickupCell();
    mesh.position.set(x, 0.75, z);
    this.scene.add(mesh);
    this.droppedPickups.push({
      id: `drop-${this.nextSpawnId++}`,
      mesh,
      position: new THREE.Vector3(x, 0.75, z),
      active: true,
      respawnTimer: 0,
      isDrop: true,
    });
  }

  private spawnSparks(origin: THREE.Vector3, colorHex: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 140) break;
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 11,
        Math.random() * 7 + 1.5,
        (Math.random() - 0.5) * 11
      );
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.55,
      });
    }
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    _v1.copy(to).sub(from);
    const dist = _v1.length();
    if (dist < 0.1) return true;
    _v1.divideScalar(dist);
    _ray.set(from, _v1);

    for (const box of this.city.colliders) {
      // Standing players remain visible over waist-high cover from elevated shooters,
      // while sitting/crouching behind cars or barriers blocks enemy line-of-sight.
      if (!this.isCrouching && box.maxY < 1.5 && from.y > 1.7) continue;
      _box3.min.set(box.minX, box.minY, box.minZ);
      _box3.max.set(box.maxX, box.maxY, box.maxZ);
      if (_ray.intersectBox(_box3, _hitPoint)) {
        if (_hitPoint.distanceTo(from) < dist - 0.4) {
          return false;
        }
      }
    }
    return true;
  }

  private checkNearCover(): boolean {
    if (!this.isCrouching) return false;
    const pad = 1.75;
    for (const box of this.city.coverColliders) {
      if (
        this.playerPos.x >= box.minX - pad &&
        this.playerPos.x <= box.maxX + pad &&
        this.playerPos.z >= box.minZ - pad &&
        this.playerPos.z <= box.maxZ + pad
      ) {
        return true;
      }
    }
    return false;
  }

  private resolveHorizontalCollisions(pos: THREE.Vector3, radius: number): void {
    // World outer bounds
    pos.x = THREE.MathUtils.clamp(pos.x, -38, 38);
    pos.z = THREE.MathUtils.clamp(pos.z, -54, 41);

    for (const box of this.city.colliders) {
      if (pos.y - 1.7 >= box.maxY || pos.y <= box.minY) continue;
      const closestX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          pos.z += radius;
        }
      }
    }
  }

  private updatePlayer(dt: number): void {
    const sprinting =
      !this.isCrouching &&
      (Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) ||
        this.virtualSprint);
    const keyF =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const keyR =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    const moveF = keyF !== 0 ? keyF : this.virtualMoveForward;
    const moveR = keyR !== 0 ? keyR : this.virtualMoveRight;

    const speed = this.isCrouching ? 4.9 : sprinting ? 12.6 : 7.8;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    _v1.set(0, 0, 0);
    _v1.addScaledVector(_forward, moveF);
    _v1.addScaledVector(_right, moveR);
    const isMoving = _v1.lengthSq() > 0.01;
    if (isMoving) {
      if (_v1.lengthSq() > 1) _v1.normalize();
      _v1.multiplyScalar(speed * dt);
      this.playerPos.x += _v1.x;
      this.playerPos.z += _v1.z;
      this.resolveHorizontalCollisions(this.playerPos, 0.55);

      if (this.onGround && !this.isCrouching) {
        soundEngine.playFootstep(sprinting);
        this.weaponBobTime += dt * (sprinting ? 13 : 9);
      } else if (this.onGround) {
        this.weaponBobTime += dt * 5.5;
      }
    }

    // Smooth crouch / sit-down camera eye-height damping
    const targetEyeHeight = this.isCrouching ? 0.9 : 1.7;
    this.currentEyeHeight = THREE.MathUtils.damp(
      this.currentEyeHeight,
      targetEyeHeight,
      12,
      dt
    );

    // Jump & gravity
    this.playerVelY -= 22.0 * dt;
    this.playerPos.y += this.playerVelY * dt;
    if (this.playerPos.y <= this.currentEyeHeight) {
      this.playerPos.y = this.currentEyeHeight;
      this.playerVelY = 0;
      this.onGround = true;
    }

    this.inCover = this.checkNearCover();

    // Smooth camera FOV kick on sprint / subtle zoom focus on crouch
    const targetFov = isMoving && sprinting ? 78 : this.isCrouching ? 68 : 72;
    const nextFov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.02) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    // Apply camera transform
    this.camera.position.copy(this.playerPos);
    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(_euler);

    // Shield regen after 3.5s out of combat
    if (this.shieldRegenDelay > 0) {
      this.shieldRegenDelay -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 12 * dt);
    }

    // Weapon & HUD feedback timers
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer -= dt;
    if (this.healFlashTimer > 0) this.healFlashTimer -= dt;
    if (this.levelBannerTimer > 0) {
      this.levelBannerTimer -= dt;
      if (this.levelBannerTimer <= 0) this.levelBannerText = null;
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= dt;
      if (this.damageFlashTimer <= 0) this.recentDamageTaken = 0;
    }
    if (this.recentRevealTimer > 0) {
      this.recentRevealTimer -= dt;
      if (this.recentRevealTimer <= 0) this.recentReveal = null;
    }

    this.crosshairSpread = THREE.MathUtils.damp(
      this.crosshairSpread,
      isMoving ? (sprinting ? 0.45 : this.isCrouching ? 0.1 : 0.2) : 0,
      10,
      dt
    );

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.ammo = this.maxAmmo;
      }
    }

    if (this.mouseDown || this.virtualFire) {
      this.firePlayerRifle();
    }

    // Muzzle flash & Rifle viewmodel animation
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.rifle.muzzleFlash.visible = true;
      this.rifle.muzzleFlash.rotation.z += dt * 40;
    } else {
      this.rifle.muzzleFlash.visible = false;
    }

    this.rifleRecoil = THREE.MathUtils.damp(this.rifleRecoil, 0, 16, dt);
    const bobX = isMoving ? Math.cos(this.weaponBobTime * 0.5) * 0.012 : 0;
    const bobY = isMoving ? Math.abs(Math.sin(this.weaponBobTime)) * 0.014 : 0;
    const reloadTilt = this.isReloading ? -0.45 : 0;
    const crouchTilt = this.isCrouching ? -0.05 : 0;

    this.rifle.group.position.set(
      0.28 + bobX,
      -0.25 - bobY + (this.isReloading ? -0.09 : 0) + (this.isCrouching ? -0.02 : 0),
      -0.35 + this.rifleRecoil * 0.08
    );
    this.rifle.group.rotation.x = this.rifleRecoil * 0.14 + reloadTilt;
    this.rifle.group.rotation.z = crouchTilt;
  }

  private updateEnemies(dt: number, elapsed: number): void {
    // Continuously produce enemy reinforcements until advancing to the next level
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = Math.max(3.8, 7.2 - (this.level - 1) * 0.75);
      this.spawnReinforcementEnemy();
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Hit-flash restore
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          enemy.hitMeshes.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && m.userData.origEmissive !== undefined) {
              mat.emissive.setHex(m.userData.origEmissive);
              mat.emissiveIntensity = m.userData.origEmissiveIntensity ?? 1;
            }
          });
        }
      }

      // Billboard health bar toward player camera
      enemy.healthBarGroup.lookAt(this.camera.position);

      if (!enemy.active) {
        this.updateHumanAnimation(enemy, dt, elapsed, false);
        continue;
      }

      const dx = this.playerPos.x - enemy.mesh.position.x;
      const dz = this.playerPos.z - enemy.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const eyeFrom = _v2.set(
        enemy.mesh.position.x,
        enemy.kind === 'boss' ? 3.0 : 1.65,
        enemy.mesh.position.z
      );
      const seesPlayer =
        dist < (enemy.kind === 'boss' ? 42 : 30) &&
        this.hasLineOfSight(eyeFrom, this.playerPos);

      if (seesPlayer) {
        // Face player smoothly
        const targetYaw = Math.atan2(dx, dz);
        enemy.mesh.rotation.y = targetYaw;

        // Strafe & engage spacing
        enemy.strafeTimer -= dt;
        if (enemy.strafeTimer <= 0) {
          enemy.strafeDir *= -1;
          enemy.strafeTimer = 1.4 + Math.random() * 1.4;
        }

        const dirX = dx / Math.max(0.01, dist);
        const dirZ = dz / Math.max(0.01, dist);
        const perpX = -dirZ * enemy.strafeDir;
        const perpZ = dirX * enemy.strafeDir;

        const preferredMin = enemy.kind === 'boss' ? 11 : 8;
        const moveScale = dist > preferredMin ? 0.65 : dist < 5.5 ? -0.45 : 0;

        enemy.mesh.position.x +=
          (dirX * moveScale + perpX * 0.75) * enemy.speed * dt;
        enemy.mesh.position.z +=
          (dirZ * moveScale + perpZ * 0.75) * enemy.speed * dt;
        this.resolveHorizontalCollisions(enemy.mesh.position, enemy.radius);

        // Fire plasma bolt
        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0) {
          if (enemy.kind === 'boss') {
            enemy.fireCooldown = 0.78;
            this.fireEnemyBolt(enemy, 16, 0.04);
            this.fireEnemyBolt(enemy, 16, -0.08);
          } else {
            enemy.fireCooldown = enemy.kind === 'drone' ? 1.45 : 1.25;
            this.fireEnemyBolt(enemy, enemy.kind === 'drone' ? 11 : 14, 0.03);
          }
        }
      } else {
        // Patrol loop around origin
        enemy.patrolAngle += dt * 0.75;
        const targetX =
          enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * 3.4;
        const targetZ =
          enemy.patrolOrigin.z + Math.sin(enemy.patrolAngle) * 3.4;
        const px = targetX - enemy.mesh.position.x;
        const pz = targetZ - enemy.mesh.position.z;
        const pd = Math.sqrt(px * px + pz * pz);
        if (pd > 0.1) {
          enemy.mesh.position.x += (px / pd) * enemy.speed * 0.55 * dt;
          enemy.mesh.position.z += (pz / pd) * enemy.speed * 0.55 * dt;
          enemy.mesh.rotation.y = Math.atan2(px, pz);
          this.resolveHorizontalCollisions(enemy.mesh.position, enemy.radius);
        }
      }

      this.updateHumanAnimation(enemy, dt, elapsed, seesPlayer);
    }
  }

  private updateHumanAnimation(
    enemy: EnemyEntity,
    dt: number,
    elapsed: number,
    seesPlayer: boolean
  ): void {
    const rig = enemy.rig;
    const invDt = 1 / Math.max(0.001, dt);
    const vx = (enemy.mesh.position.x - rig.lastX) * invDt;
    const vz = (enemy.mesh.position.z - rig.lastZ) * invDt;
    rig.lastX = enemy.mesh.position.x;
    rig.lastZ = enemy.mesh.position.z;

    const moveSpeed = Math.hypot(vx, vz);
    const strideAmp = THREE.MathUtils.clamp(moveSpeed / enemy.speed, 0, 1);

    if (moveSpeed > 0.2) {
      rig.walkPhase += Math.min(moveSpeed, 7.5) * dt * 2.55;
    }

    rig.aimBlend = THREE.MathUtils.damp(
      rig.aimBlend,
      seesPlayer && enemy.active ? 1 : 0,
      10,
      dt
    );
    rig.recoil = THREE.MathUtils.damp(rig.recoil, 0, 14, dt);
    rig.flinch = THREE.MathUtils.damp(rig.flinch, 0, 12, dt);

    // Bipedal leg swing & natural backward knee bend
    const swing = Math.sin(rig.walkPhase) * 0.62 * strideAmp;
    const leftKneeBend =
      Math.max(0, -Math.sin(rig.walkPhase - 0.55)) * 0.85 * strideAmp;
    const rightKneeBend =
      Math.max(0, Math.sin(rig.walkPhase - 0.55)) * 0.85 * strideAmp;

    rig.leftHip.rotation.x = -swing - 0.08 * rig.aimBlend;
    rig.rightHip.rotation.x = swing - 0.08 * rig.aimBlend;
    rig.leftKnee.rotation.x = leftKneeBend + 0.16 * rig.aimBlend;
    rig.rightKnee.rotation.x = rightKneeBend + 0.16 * rig.aimBlend;

    // Hip vertical stride bounce & pelvic twist
    rig.hips.position.y =
      rig.baseHipY +
      Math.abs(Math.cos(rig.walkPhase)) * 0.045 * strideAmp -
      0.03 * rig.aimBlend;
    rig.hips.rotation.y = Math.cos(rig.walkPhase) * 0.08 * strideAmp;

    // Torso breathing, combat lean, recoil & hit stagger
    const breath = Math.sin(elapsed * 2.6 + enemy.patrolAngle) * 0.025;
    rig.torso.rotation.x =
      breath +
      0.09 * strideAmp +
      0.08 * rig.aimBlend -
      rig.recoil * 0.14 -
      rig.flinch * 0.24;
    rig.torso.rotation.y =
      -Math.cos(rig.walkPhase) * 0.12 * strideAmp * (1 - rig.aimBlend * 0.7);

    // Head look scan during patrol, target lock + flinch in combat
    rig.head.rotation.y =
      Math.sin(elapsed * 1.4 + enemy.patrolAngle) * 0.28 * (1 - rig.aimBlend) +
      rig.flinch * 0.22;
    rig.head.rotation.x = -0.06 * rig.aimBlend - rig.flinch * 0.28;

    // Arms: blend between natural walking swing and tactical weapon aim
    const walkLeftShoulderX = swing * 0.58;
    const walkRightShoulderX = -swing * 0.58;
    const walkElbowX = -0.32 - Math.abs(swing) * 0.25;

    const aimRightShoulderX = -1.32 - rig.recoil * 0.28;
    const aimRightElbowX = -0.25 + rig.recoil * 0.15;

    const aimLeftShoulderX =
      enemy.kind === 'boss'
        ? -1.3 - rig.recoil * 0.25
        : -1.05 - rig.recoil * 0.18;
    const aimLeftShoulderY = enemy.kind === 'boss' ? 0 : -0.42;
    const aimLeftElbowX =
      enemy.kind === 'boss' ? -0.27 + rig.recoil * 0.15 : -0.65;

    rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(
      walkRightShoulderX,
      aimRightShoulderX,
      rig.aimBlend
    );
    rig.rightShoulder.rotation.y = THREE.MathUtils.lerp(0, 0.08, rig.aimBlend);
    rig.rightElbow.rotation.x = THREE.MathUtils.lerp(
      walkElbowX,
      aimRightElbowX,
      rig.aimBlend
    );

    rig.leftShoulder.rotation.x = THREE.MathUtils.lerp(
      walkLeftShoulderX,
      aimLeftShoulderX,
      rig.aimBlend
    );
    rig.leftShoulder.rotation.y = THREE.MathUtils.lerp(
      0,
      aimLeftShoulderY,
      rig.aimBlend
    );
    rig.leftElbow.rotation.x = THREE.MathUtils.lerp(
      walkElbowX,
      aimLeftElbowX,
      rig.aimBlend
    );
  }

  private fireEnemyBolt(
    enemy: EnemyEntity,
    damage: number,
    spreadRad: number
  ): void {
    enemy.rig.recoil = 1.0;
    enemy.mesh.updateMatrixWorld(true);
    enemy.rig.muzzlePoint.getWorldPosition(_v3);

    const aimDir = _v1.copy(this.playerPos).sub(_v3);
    aimDir.y -= 0.12;
    aimDir.normalize();

    aimDir.x += (Math.random() - 0.5) * spreadRad;
    aimDir.z += (Math.random() - 0.5) * spreadRad;
    aimDir.normalize();

    const mat =
      enemy.kind === 'boss' ? this.bossBoltMat : this.enemyBoltMat;
    const mesh = new THREE.Mesh(this.enemyBoltGeo, mat);
    mesh.position.copy(_v3);
    this.scene.add(mesh);

    soundEngine.playEnemyBolt();

    this.projectiles.push({
      mesh,
      velocity: aimDir.clone().multiplyScalar(enemy.kind === 'boss' ? 32 : 26),
      fromPlayer: false,
      damage,
      life: 2.2,
    });
  }

  private updateProjectilesAndParticles(dt: number): void {
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      let remove = p.life <= 0;

      if (!remove && !p.fromPlayer) {
        // Check hit on player (smaller/lower hitbox when crouched behind cover)
        const dx = p.mesh.position.x - this.playerPos.x;
        const dy =
          p.mesh.position.y -
          (this.playerPos.y - (this.isCrouching ? 0.18 : 0.3));
        const dz = p.mesh.position.z - this.playerPos.z;
        const hitRadiusSq = this.isCrouching ? 0.46 : 0.72;
        if (dx * dx + dy * dy + dz * dz < hitRadiusSq) {
          this.damagePlayer(p.damage);
          this.spawnSparks(p.mesh.position, 0xf43f5e, 5);
          remove = true;
        } else {
          // Check wall collision
          for (const box of this.city.colliders) {
            if (
              p.mesh.position.x >= box.minX &&
              p.mesh.position.x <= box.maxX &&
              p.mesh.position.y >= box.minY &&
              p.mesh.position.y <= box.maxY &&
              p.mesh.position.z >= box.minZ &&
              p.mesh.position.z <= box.maxZ
            ) {
              this.spawnSparks(p.mesh.position, 0xf59e0b, 3);
              remove = true;
              break;
            }
          }
        }
      }

      if (remove) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Update spark particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const sp = this.particles[i];
      sp.life -= dt;
      sp.velocity.y -= 16 * dt;
      sp.mesh.position.addScaledVector(sp.velocity, dt);
      const mat = sp.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, sp.life / sp.maxLife);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        mat.dispose();
        this.particles.splice(i, 1);
      }
    }

    // Update floating damage popups
    for (let i = this.floatingDamages.length - 1; i >= 0; i--) {
      const fd = this.floatingDamages[i];
      fd.life -= dt;
      fd.worldPos.y += dt * 1.45;
      if (fd.life <= 0) {
        this.floatingDamages.splice(i, 1);
      }
    }
  }

  private damagePlayer(amount: number): void {
    soundEngine.playPlayerHit();
    this.damageFlashTimer = 0.45;
    this.recentDamageTaken = amount;
    this.shieldRegenDelay = 3.5;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      const overflow = amount - absorbed;
      if (overflow > 0) {
        this.health = Math.max(0, this.health - overflow);
      }
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    this.emitHud();

    if (this.health <= 0) {
      this.callbacks.onPhaseChange('GAME_OVER');
    }
  }

  private initAcidRainSystem(): void {
    this.rainDropletCount = this.isSoftwareGl ? 420 : 950;
    this.rainOriginPositions = new Float32Array(this.rainDropletCount * 3);
    this.rainFallSpeeds = new Float32Array(this.rainDropletCount);
    this.rainVertexPositions = new Float32Array(this.rainDropletCount * 6);
    const rainColors = new Float32Array(this.rainDropletCount * 6);

    const spread = 68;
    const heightMax = 26;

    for (let i = 0; i < this.rainDropletCount; i++) {
      const x = this.playerPos.x + (Math.random() - 0.5) * spread;
      const y = Math.random() * heightMax;
      const z = this.playerPos.z + (Math.random() - 0.5) * spread;

      this.rainOriginPositions[i * 3] = x;
      this.rainOriginPositions[i * 3 + 1] = y;
      this.rainOriginPositions[i * 3 + 2] = z;
      this.rainFallSpeeds[i] = 17.5 + Math.random() * 9.5;

      // Tail vertex (subtle twilight silver-lavender) -> Tip vertex (warm amber-lit raindrop)
      const ci = i * 6;
      rainColors[ci] = 0.65;
      rainColors[ci + 1] = 0.7;
      rainColors[ci + 2] = 0.85;

      rainColors[ci + 3] = 0.98;
      rainColors[ci + 4] = 0.84;
      rainColors[ci + 5] = 0.62;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainVertexPositions, 3)
    );
    this.rainGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(rainColors, 3)
    );

    this.rainMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.rainLines = new THREE.LineSegments(
      this.rainGeometry,
      this.rainMaterial
    );
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);

    // Street rain puddle ripple splash ring pool
    this.splashGeo = new THREE.RingGeometry(0.06, 0.12, 12);
    this.splashMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.splashMesh = new THREE.InstancedMesh(
      this.splashGeo,
      this.splashMat,
      this.splashPoolSize
    );
    this.splashMesh.frustumCulled = false;
    this.splashPositions = new Float32Array(this.splashPoolSize * 2);
    this.splashTimers = new Float32Array(this.splashPoolSize);

    _splashScale.set(0, 0, 0);
    _splashMatrix.compose(_splashPos, _splashQuat, _splashScale);
    for (let i = 0; i < this.splashPoolSize; i++) {
      this.splashTimers[i] = 0;
      this.splashMesh.setMatrixAt(i, _splashMatrix);
    }
    this.splashMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.splashMesh);
  }

  private updateAcidRain(dt: number, elapsed: number): void {
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;
    const halfSpread = 34;
    const spread = 68;
    const heightMax = 26;

    const windX = 1.35 + Math.sin(elapsed * 0.45) * 0.85;
    const windZ = 0.55 + Math.cos(elapsed * 0.32) * 0.4;

    for (let i = 0; i < this.rainDropletCount; i++) {
      const oi = i * 3;
      const speed = this.rainFallSpeeds[i];

      let x = this.rainOriginPositions[oi] + windX * dt;
      let y = this.rainOriginPositions[oi + 1] - speed * dt;
      let z = this.rainOriginPositions[oi + 2] + windZ * dt;

      // Keep rain volume centered seamlessly around the active camera
      if (x < camX - halfSpread) x += spread;
      else if (x > camX + halfSpread) x -= spread;
      if (z < camZ - halfSpread) z += spread;
      else if (z > camZ + halfSpread) z -= spread;

      if (y <= 0.03) {
        // Trigger subtle acid splash ripple on wet asphalt near player
        const dx = x - camX;
        const dz = z - camZ;
        if (dx * dx + dz * dz < 480 && Math.random() < 0.25) {
          const sIdx = this.splashCursor;
          this.splashCursor = (this.splashCursor + 1) % this.splashPoolSize;
          this.splashPositions[sIdx * 2] = x;
          this.splashPositions[sIdx * 2 + 1] = z;
          this.splashTimers[sIdx] = 0.24;
        }
        y = heightMax - Math.random() * 2.5;
        x = camX + (Math.random() - 0.5) * spread;
        z = camZ + (Math.random() - 0.5) * spread;
      }

      this.rainOriginPositions[oi] = x;
      this.rainOriginPositions[oi + 1] = y;
      this.rainOriginPositions[oi + 2] = z;

      // Elongated light droplet streak aligned with fall + wind vector
      const vi = i * 6;
      const streakScale = 0.022;
      this.rainVertexPositions[vi] = x - windX * streakScale;
      this.rainVertexPositions[vi + 1] = y + speed * streakScale;
      this.rainVertexPositions[vi + 2] = z - windZ * streakScale;

      this.rainVertexPositions[vi + 3] = x;
      this.rainVertexPositions[vi + 4] = y;
      this.rainVertexPositions[vi + 5] = z;
    }

    this.rainGeometry.attributes.position.needsUpdate = true;

    // Update splash rings
    for (let i = 0; i < this.splashPoolSize; i++) {
      const t = this.splashTimers[i];
      if (t > 0) {
        const nextT = Math.max(0, t - dt);
        this.splashTimers[i] = nextT;
        const progress = 1 - nextT / 0.24;
        const scale = 0.5 + progress * 2.1;
        _splashPos.set(
          this.splashPositions[i * 2],
          0.04,
          this.splashPositions[i * 2 + 1]
        );
        _splashScale.set(scale, scale, 1);
      } else {
        _splashPos.set(0, -5, 0);
        _splashScale.set(0, 0, 0);
      }
      _splashMatrix.compose(_splashPos, _splashQuat, _splashScale);
      this.splashMesh.setMatrixAt(i, _splashMatrix);
    }
    this.splashMesh.instanceMatrix.needsUpdate = true;
  }

  private updateEnvironment(dt: number, elapsed: number): void {
    // Animate dynamic acid-rain droplets and wet-asphalt splashes
    this.updateAcidRain(dt, elapsed);

    // Subtle neon sign flicker
    for (const fl of this.city.flickerLights) {
      fl.light.intensity =
        fl.baseIntensity *
        (0.88 + Math.sin(elapsed * 7.5 + fl.phase) * 0.12);
    }

    // Animate uncollected data pads
    for (const c of this.city.clues) {
      if (!c.collected) {
        c.padMesh.rotation.y = elapsed * 1.4;
        c.padMesh.position.y = 0.72 + Math.sin(elapsed * 2.5) * 0.08;
      }
    }

    // Animate & check Medicine Kits (map spawns + enemy drops)
    const processMedkit = (pk: PickupWorldItem): boolean => {
      if (pk.active) {
        pk.mesh.rotation.y = elapsed * 1.8;
        pk.mesh.position.y = 0.75 + Math.sin(elapsed * 3.0) * 0.1;
        const dx = pk.position.x - this.playerPos.x;
        const dz = pk.position.z - this.playerPos.z;
        if (dx * dx + dz * dz < 2.3) {
          if (this.medkits < this.maxMedkits) {
            this.medkits += 1;
            soundEngine.playMedkitPickup();
            pk.active = false;
            pk.respawnTimer = 20;
            pk.mesh.visible = false;
            this.emitHud();
            return pk.isDrop ? true : false;
          } else if (
            this.health < this.maxHealth ||
            this.shield < this.maxShield
          ) {
            this.health = Math.min(this.maxHealth, this.health + 40);
            this.shield = Math.min(this.maxShield, this.shield + 30);
            this.healFlashTimer = 0.4;
            soundEngine.playHeal();
            pk.active = false;
            pk.respawnTimer = 20;
            pk.mesh.visible = false;
            this.emitHud();
            return pk.isDrop ? true : false;
          }
        }
      } else if (!pk.isDrop) {
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0) {
          pk.active = true;
          pk.mesh.visible = true;
        }
      }
      return false;
    };

    for (const pk of this.city.pickups) {
      processMedkit(pk);
    }
    for (let i = this.droppedPickups.length - 1; i >= 0; i--) {
      const pk = this.droppedPickups[i];
      if (processMedkit(pk)) {
        this.scene.remove(pk.mesh);
        this.droppedPickups.splice(i, 1);
      }
    }

    // Blast door slide-open animation
    if (this.blastDoorUnlocked && this.doorOpenProgress < 1) {
      this.doorOpenProgress = Math.min(1, this.doorOpenProgress + dt * 0.75);
      const offset = this.doorOpenProgress * 4.4;
      this.city.blastDoorRig.leftLeaf.position.x = -2.25 - offset;
      this.city.blastDoorRig.rightLeaf.position.x = 2.25 + offset;
    }
  }

  private getObjectiveText(): string {
    if (!this.blastDoorUnlocked) {
      return `Scan data pads (${this.collectedClueIds.length}/${CLUE_DEFINITIONS.length})`;
    }
    const boss = this.enemies.find((e) => e.kind === 'boss');
    if (boss && boss.alive) {
      return 'Defeat AEGIS-9 in North Vault';
    }
    return 'Sector 09 secured';
  }

  private emitHud(): void {
    const boss = this.enemies.find((e) => e.kind === 'boss');
    const nearby = this.getNearbyClue();
    const nearBlastDoor =
      !this.blastDoorUnlocked &&
      Math.abs(this.playerPos.x) < 6 &&
      Math.abs(this.playerPos.z - -18) < 5.5;

    const pois: RadarPOI[] = [
      {
        id: 'blast-door',
        kind: 'door',
        x: 0,
        z: -18,
        color: this.blastDoorUnlocked ? '#10B981' : '#EF4444',
      },
    ];

    for (const c of this.city.clues) {
      if (!c.collected) {
        pois.push({
          id: c.def.id,
          kind: 'clue',
          x: c.group.position.x,
          z: c.group.position.z,
          color: `#${c.def.accentColor.toString(16).padStart(6, '0')}`,
        });
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.active) continue;
      pois.push({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.mesh.position.x,
        z: enemy.mesh.position.z,
        color:
          enemy.kind === 'boss'
            ? '#EF4444'
            : enemy.kind === 'drone'
              ? '#F43F5E'
              : '#FB923C',
      });
    }

    for (const pk of this.city.pickups) {
      if (!pk.active) continue;
      pois.push({
        id: pk.id,
        kind: 'medkit',
        x: pk.position.x,
        z: pk.position.z,
        color: '#10B981',
      });
    }
    for (const pk of this.droppedPickups) {
      if (!pk.active) continue;
      pois.push({
        id: pk.id,
        kind: 'medkit',
        x: pk.position.x,
        z: pk.position.z,
        color: '#10B981',
      });
    }

    const damageNumbers: DamageNumber[] = [];
    this.camera.updateMatrixWorld();
    for (const fd of this.floatingDamages) {
      _v3.copy(fd.worldPos).project(this.camera);
      if (_v3.z >= -1 && _v3.z <= 1) {
        const screenX = _v3.x * 0.5 + 0.5;
        const screenY = -_v3.y * 0.5 + 0.5;
        if (
          screenX >= 0.04 &&
          screenX <= 0.96 &&
          screenY >= 0.04 &&
          screenY <= 0.96
        ) {
          damageNumbers.push({
            id: fd.id,
            amount: fd.amount,
            screenX,
            screenY,
            opacity: Math.min(1, (fd.life / fd.maxLife) * 1.4),
            isKill: fd.isKill,
          });
        }
      }
    }

    this.callbacks.onHudUpdate({
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      shield: Math.ceil(this.shield),
      maxShield: this.maxShield,
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading
        ? 1 - this.reloadTimer / this.reloadDuration
        : 0,
      collectedClueIds: this.collectedClueIds,
      nearbyClue: nearby ? nearby.def : null,
      nearbyBlastDoorLocked: nearBlastDoor,
      blastDoorUnlocked: this.blastDoorUnlocked,
      bossActive: Boolean(boss && boss.active && boss.alive),
      bossHealth: boss ? Math.ceil(boss.hp) : 0,
      bossMaxHealth: boss ? boss.maxHp : 520,
      bossName: boss ? boss.name : 'AEGIS-9 EXO-COMMANDER',
      objectiveText: this.getObjectiveText(),
      level: this.level,
      medkits: this.medkits,
      maxMedkits: this.maxMedkits,
      healFlashTimer: this.healFlashTimer,
      levelBannerText: this.levelBannerText,
      isCrouching: this.isCrouching,
      inCover: this.inCover,
      enemiesDefeated: this.enemiesDefeated,
      totalDamageDealt: this.totalDamageDealt,
      recentDamageTaken: this.recentDamageTaken,
      damageNumbers,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      crosshairSpread: this.crosshairSpread,
      hitMarkerTimer: this.hitMarkerTimer,
      damageFlashTimer: this.damageFlashTimer,
      pointerLocked: this.pointerLocked,
      recentReveal: this.recentReveal,
      elapsedSeconds: this.elapsedSeconds,
      radar: {
        playerX: this.playerPos.x,
        playerZ: this.playerPos.z,
        playerYaw: this.yaw,
        pois,
      },
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.phase === 'TITLE') {
      // Slow cinematic sweep over the rain-slicked plaza on title screen
      this.camera.position.set(
        Math.sin(elapsed * 0.16) * 14,
        7.5,
        24 + Math.cos(elapsed * 0.16) * 8
      );
      this.camera.lookAt(0, 2.5, -10);
      this.rifle.group.visible = false;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        enemy.healthBarGroup.lookAt(this.camera.position);
        if (enemy.active) {
          enemy.patrolAngle += dt * 0.75;
          const targetX =
            enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * 3.4;
          const targetZ =
            enemy.patrolOrigin.z + Math.sin(enemy.patrolAngle) * 3.4;
          const px = targetX - enemy.mesh.position.x;
          const pz = targetZ - enemy.mesh.position.z;
          const pd = Math.sqrt(px * px + pz * pz);
          if (pd > 0.1) {
            enemy.mesh.position.x += (px / pd) * enemy.speed * 0.55 * dt;
            enemy.mesh.position.z += (pz / pd) * enemy.speed * 0.55 * dt;
            enemy.mesh.rotation.y = Math.atan2(px, pz);
            this.resolveHorizontalCollisions(enemy.mesh.position, enemy.radius);
          }
        }
        this.updateHumanAnimation(enemy, dt, elapsed, false);
      }
      this.updateEnvironment(dt, elapsed);
    } else if (this.phase === 'PLAYING') {
      this.rifle.group.visible = true;
      this.elapsedSeconds += dt;
      this.updatePlayer(dt);
      this.updateEnemies(dt, elapsed);
      this.updateProjectilesAndParticles(dt);
      this.updateEnvironment(dt, elapsed);

      this.hudEmitTimer += dt;
      if (this.hudEmitTimer >= 0.05) {
        this.hudEmitTimer = 0;
        this.emitHud();
      }
    } else {
      this.rifle.group.visible = true;
      this.updateEnvironment(dt * 0.25, elapsed);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.onContextLost
    );

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }

    this.city.disposables.geometries.forEach((g) => g.dispose());
    this.city.disposables.materials.forEach((m) => m.dispose());
    this.city.disposables.textures.forEach((t) => t.dispose());
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.splashGeo.dispose();
    this.splashMat.dispose();
    this.playerBoltGeo.dispose();
    this.playerBoltMat.dispose();
    this.enemyBoltGeo.dispose();
    this.enemyBoltMat.dispose();
    this.bossBoltMat.dispose();
    this.sparkGeo.dispose();
    this.envTexture.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
