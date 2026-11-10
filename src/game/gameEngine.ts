import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sound } from './audio';
import { createPlayerShip, createCockpitInterior, initMaterials } from './models';
import { CaveManager, ObstacleEntity } from './caveGenerator';

export type CameraViewMode = 'isometric' | 'fps';

export interface GameStats {
  score: number;
  multiplier: number;
  shield: number;
  maxShield: number;
  boostEnergy: number;
  maxBoostEnergy: number;
  depthMeters: number;
  speedKmh: number;
  empCooldownPct: number;
  viewMode: CameraViewMode;
  isPaused: boolean;
  isGameOver: boolean;
  gyroEnabled: boolean;
  gyroTiltX: number;
  gyroTiltY: number;
  gyroSensitivity: number;
  gyroInvertY: boolean;
}

export interface InputState {
  moveX: number; // -1 (left) to 1 (right)
  moveY: number; // -1 (down) to 1 (up)
  firing: boolean;
  boosting: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  empTrigger: boolean;
  toggleView: boolean;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  isPlayer: boolean;
  life: number;
  radius: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class CaveFlightEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private caveManager!: CaveManager;

  public isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private hitstopTimer: number = 0;

  // Player state
  private playerShip!: THREE.Group;
  private cockpitInterior!: THREE.Group;
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerVel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerRot: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private baseFlightSpeed: number = 38.0;
  private boostMultiplier: number = 1.7;

  // View state
  public viewMode: CameraViewMode = 'isometric';
  private cameraOffsetIso: THREE.Vector3 = new THREE.Vector3(3.8, 4.6, 7.5);
  private cameraLookAheadIso: THREE.Vector3 = new THREE.Vector3(0, 0.4, -14.0);

  // Stats & Progress
  private score: number = 0;
  private comboCount: number = 0;
  private multiplier: number = 1;
  private comboResetTimer: number = 0;
  private shield: number = 100;
  private readonly maxShield: number = 100;
  private boostEnergy: number = 100;
  private readonly maxBoostEnergy: number = 100;
  private empCharge: number = 100; // 0 - 100%
  private empLastUsed: number = -99999;
  private depthMeters: number = 0;
  private isGameOver: boolean = false;
  private isPaused: boolean = false;

  // Invulnerability & Roll
  private invulnerableTimer: number = 0;
  private barrelRollTimer: number = 0;
  private barrelRollDirection: number = 0; // -1 left, 1 right

  // Firing rate limiter
  private lastPlayerShot: number = 0;
  private playerShotCooldown: number = 150; // ms between dual blaster shots
  private alternateGun: boolean = false;

  // Screen shake
  private cameraTrauma: number = 0;

  // Projectiles & Particles pool
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private speedStreaks: THREE.LineSegments | null = null;

  // Lights
  private keyLight!: THREE.DirectionalLight;
  private shipLight!: THREE.PointLight;

  // Input states
  private input: InputState = {
    moveX: 0,
    moveY: 0,
    firing: false,
    boosting: false,
    rollLeft: false,
    rollRight: false,
    empTrigger: false,
    toggleView: false,
  };

  private keysHeld: Record<string, boolean> = {};
  private onStatsUpdate?: (stats: GameStats) => void;
  private onGameOver?: (finalStats: GameStats) => void;

  // Mobile Gyroscope Flight Controls State
  public gyroEnabled: boolean = false;
  private gyroCalibrated: boolean = false;
  private gyroBaseBeta: number = 35;
  private gyroBaseGamma: number = 0;
  private gyroRawBeta: number | null = null;
  private gyroRawGamma: number | null = null;
  private gyroMoveX: number = 0;
  private gyroMoveY: number = 0;
  private gyroSensitivity: number = 1.0;
  private gyroInvertY: boolean = false;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onStatsUpdate?: (stats: GameStats) => void;
      onGameOver?: (finalStats: GameStats) => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks?.onStatsUpdate;
    this.onGameOver = callbacks?.onGameOver;

    this.checkSoftwareGl();
    this.initThree();
    this.setupListeners();
  }

  private checkSoftwareGl() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
        this.isSoftwareGl = true;
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = true;
    }
  }

  private initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.024);

    // Environment reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {}

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 350);
    this.scene.add(this.camera);

    // Lighting Rig
    this.keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    this.keyLight.position.set(15, 25, 20);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    this.scene.add(hemiLight);

    // Materials & Models
    initMaterials(this.isSoftwareGl);
    this.playerShip = createPlayerShip(this.isSoftwareGl);
    this.scene.add(this.playerShip);

    this.cockpitInterior = createCockpitInterior();
    this.camera.add(this.cockpitInterior);
    this.cockpitInterior.visible = this.viewMode === 'fps';

    // Ship Headlight / Point light
    this.shipLight = new THREE.PointLight(0x38bdf8, 2.5, 30);
    this.shipLight.position.set(0, 0, -2);
    this.playerShip.add(this.shipLight);

    // Speed streaks particle effect for FPS immersion
    this.initSpeedStreaks();

    // Cave Manager
    this.caveManager = new CaveManager(this.scene, this.isSoftwareGl);
    this.caveManager.initCave();

    // Pre-warm renderer
    if (!this.isSoftwareGl) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch {}
    }

    this.resetGame();
  }

  private initSpeedStreaks() {
    const streakCount = 60;
    const streakGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(streakCount * 2 * 3);

    for (let i = 0; i < streakCount; i++) {
      const idx = i * 6;
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 12;
      const z = -Math.random() * 50;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      positions[idx + 3] = x;
      positions[idx + 4] = y;
      positions[idx + 5] = z - 2.5;
    }

    streakGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const streakMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });

    this.speedStreaks = new THREE.LineSegments(streakGeo, streakMat);
    this.camera.add(this.speedStreaks);
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);

    // Mouse fire support
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    this.gyroRawBeta = e.beta;
    this.gyroRawGamma = e.gamma;

    if (!this.gyroEnabled) return;

    // Auto-calibrate zero-point on first reading after enabling or resetting
    if (!this.gyroCalibrated) {
      this.gyroBaseBeta = e.beta;
      this.gyroBaseGamma = e.gamma;
      this.gyroCalibrated = true;
    }

    // Account for portrait vs landscape screen orientation
    const screenAngle =
      window.screen?.orientation?.angle ??
      (window as unknown as { orientation?: number }).orientation ??
      0;

    const dBeta = e.beta - this.gyroBaseBeta;
    const dGamma = e.gamma - this.gyroBaseGamma;

    let rawX = 0;
    let rawY = 0;

    if (screenAngle === 90) {
      // Landscape Left (top of phone to the left)
      rawX = -dBeta;
      rawY = -dGamma;
    } else if (screenAngle === -90 || screenAngle === 270) {
      // Landscape Right (top of phone to the right)
      rawX = dBeta;
      rawY = dGamma;
    } else if (screenAngle === 180) {
      // Upside-down Portrait
      rawX = -dGamma;
      rawY = dBeta;
    } else {
      // Standard Portrait (0 deg)
      rawX = dGamma;
      rawY = -dBeta;
    }

    if (this.gyroInvertY) {
      rawY = -rawY;
    }

    // Apply 1.8 deg deadzone to filter hand micro-tremors, normalize over 20 deg full deflection
    const applyCurve = (deg: number, deadzone = 1.8, maxDeg = 20) => {
      if (Math.abs(deg) < deadzone) return 0;
      const sign = Math.sign(deg);
      const effective = Math.abs(deg) - deadzone;
      return THREE.MathUtils.clamp((sign * effective * this.gyroSensitivity) / maxDeg, -1, 1);
    };

    this.gyroMoveX = applyCurve(rawX);
    this.gyroMoveY = applyCurve(rawY);
  };

  public async toggleGyro(): Promise<boolean> {
    sound.resume();
    if (!this.gyroEnabled) {
      // Handle iOS 13+ DeviceOrientationEvent permission requirement
      const DevOrient = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (DevOrient && typeof DevOrient.requestPermission === 'function') {
        try {
          const perm = await DevOrient.requestPermission();
          if (perm !== 'granted') {
            return false;
          }
        } catch {
          return false;
        }
      }
      this.gyroEnabled = true;
      this.gyroCalibrated = false;
      if (this.gyroRawBeta !== null && this.gyroRawGamma !== null) {
        this.gyroBaseBeta = this.gyroRawBeta;
        this.gyroBaseGamma = this.gyroRawGamma;
        this.gyroCalibrated = true;
      }
      sound.playPickup('powerup');
    } else {
      this.gyroEnabled = false;
      this.gyroMoveX = 0;
      this.gyroMoveY = 0;
    }
    this.pushStats();
    return this.gyroEnabled;
  }

  public calibrateGyro() {
    sound.resume();
    if (this.gyroRawBeta !== null && this.gyroRawGamma !== null) {
      this.gyroBaseBeta = this.gyroRawBeta;
      this.gyroBaseGamma = this.gyroRawGamma;
      this.gyroCalibrated = true;
    } else {
      this.gyroCalibrated = false;
    }
    this.gyroMoveX = 0;
    this.gyroMoveY = 0;
    sound.playPickup('crystal');
    this.pushStats();
  }

  public cycleGyroSensitivity(): number {
    if (this.gyroSensitivity === 1.0) {
      this.gyroSensitivity = 1.4; // High
    } else if (this.gyroSensitivity === 1.4) {
      this.gyroSensitivity = 0.7; // Low
    } else {
      this.gyroSensitivity = 1.0; // Normal
    }
    this.pushStats();
    return this.gyroSensitivity;
  }

  public toggleGyroInvertY(): boolean {
    this.gyroInvertY = !this.gyroInvertY;
    this.pushStats();
    return this.gyroInvertY;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;

    if (e.code === 'KeyV' || e.code === 'KeyC') {
      this.togglePerspective();
    }
    if (e.code === 'KeyF' || e.code === 'KeyR') {
      this.triggerEmpPulse();
    }
    if (e.code === 'KeyQ') {
      this.triggerBarrelRoll(-1);
    }
    if (e.code === 'KeyE') {
      this.triggerBarrelRoll(1);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.input.firing = true;
      sound.resume();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.input.firing = false;
    }
  };

  private handleWindowBlur = () => {
    this.keysHeld = {};
    this.input.firing = false;
    this.input.boosting = false;
  };

  private handleResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Virtual touch input controls for Android and mobile devices
  public setVirtualStick(x: number, y: number) {
    this.input.moveX = THREE.MathUtils.clamp(x, -1, 1);
    this.input.moveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualButton(action: 'fire' | 'boost' | 'rollLeft' | 'rollRight' | 'emp' | 'view', isPressed: boolean) {
    sound.resume();
    if (action === 'fire') {
      this.input.firing = isPressed;
    } else if (action === 'boost') {
      this.input.boosting = isPressed;
    } else if (action === 'rollLeft' && isPressed) {
      this.triggerBarrelRoll(-1);
    } else if (action === 'rollRight' && isPressed) {
      this.triggerBarrelRoll(1);
    } else if (action === 'emp' && isPressed) {
      this.triggerEmpPulse();
    } else if (action === 'view' && isPressed) {
      this.togglePerspective();
    }
  }

  public togglePerspective() {
    this.viewMode = this.viewMode === 'isometric' ? 'fps' : 'isometric';
    this.cockpitInterior.visible = this.viewMode === 'fps';
    this.playerShip.visible = this.viewMode === 'isometric';
  }

  public togglePause(): boolean {
    if (this.isGameOver) return false;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      sound.stopEngineHum();
    } else {
      sound.startEngineHum();
      sound.startAmbientDrone();
    }
    this.pushStats();
    return this.isPaused;
  }

  public triggerBarrelRoll(direction: number) {
    if (this.barrelRollTimer > 0) return;
    this.barrelRollTimer = 0.45;
    this.barrelRollDirection = direction;
    this.invulnerableTimer = 0.55;
    sound.playPickup('powerup');
  }

  public triggerEmpPulse() {
    const now = performance.now();
    if (now - this.empLastUsed < 12000) return; // 12s recharge

    this.empLastUsed = now;
    sound.playEmpShockwave();
    this.cameraTrauma = Math.min(this.cameraTrauma + 0.6, 1.0);

    // Destroy all nearby enemy drones and laser barriers
    const nearby = this.caveManager.getNearbyObstacles(this.playerPos.z, 36);
    let destroyed = 0;

    for (const obs of nearby) {
      if (obs.type === 'drone' || obs.type === 'barrier') {
        obs.active = false;
        obs.mesh.visible = false;
        this.createExplosion(obs.position, 'large', 0xf43f5e);
        destroyed++;
      }
    }

    if (destroyed > 0) {
      this.score += destroyed * 350 * this.multiplier;
      this.incrementCombo(destroyed);
    }
  }

  public resetGame() {
    this.score = 0;
    this.comboCount = 0;
    this.multiplier = 1;
    this.comboResetTimer = 0;
    this.shield = this.maxShield;
    this.boostEnergy = this.maxBoostEnergy;
    this.empLastUsed = -99999;
    this.depthMeters = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.cameraTrauma = 0;
    this.invulnerableTimer = 0;
    this.barrelRollTimer = 0;

    this.playerPos.set(0, 0, 0);
    this.playerVel.set(0, 0, 0);
    this.playerRot.set(0, 0, 0);
    this.playerShip.position.copy(this.playerPos);
    this.playerShip.rotation.copy(this.playerRot);

    // Clear projectiles & particles
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.projectiles = [];

    for (const pt of this.particles) {
      this.scene.remove(pt.mesh);
      pt.mesh.geometry.dispose();
    }
    this.particles = [];

    this.caveManager.initCave();
    this.pushStats();
  }

  public start() {
    sound.resume();
    sound.startEngineHum();
    sound.startAmbientDrone();
    this.lastTime = performance.now();
    this.tick();
  }

  public stop() {
    sound.stopAll();
    cancelAnimationFrame(this.animFrameId);
  }

  private tick = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    // Hitstop freeze effect on heavy impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.render();
      this.scheduleNextTick();
      return;
    }

    if (!this.isPaused && !this.isGameOver) {
      this.updatePhysics(dt, now);
      this.updateWeapons(dt, now);
      this.updateObstacles(dt, now);
      this.updateParticles(dt);
      this.updateCamera(dt);
      this.pushStats();
    }

    this.render();
    this.scheduleNextTick();
  };

  private scheduleNextTick() {
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 60);
      }
    };
    window.setTimeout(poll, 5);
  }

  private updatePhysics(dt: number, now: number) {
    // Process input (Virtual Stick + Mobile Gyro + Keyboard)
    let inputX = this.input.moveX + (this.gyroEnabled ? this.gyroMoveX : 0);
    let inputY = this.input.moveY + (this.gyroEnabled ? this.gyroMoveY : 0);

    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) inputX -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) inputX += 1;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) inputY += 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) inputY -= 1;

    inputX = THREE.MathUtils.clamp(inputX, -1, 1);
    inputY = THREE.MathUtils.clamp(inputY, -1, 1);

    const isBoosting = (this.input.boosting || this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight']) && this.boostEnergy > 0;

    if (isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 35 * dt);
    } else {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + 18 * dt);
    }

    // Forward speed
    const currentSpeed = (this.baseFlightSpeed + (this.depthMeters * 0.005)) * (isBoosting ? this.boostMultiplier : 1.0);
    const speedRatio = (currentSpeed - this.baseFlightSpeed) / (this.baseFlightSpeed * 0.8);
    sound.updateEngineHum(speedRatio, isBoosting);

    // Lateral and vertical flight maneuvering
    const steerSpeedX = 22.0;
    const steerSpeedY = 18.0;

    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, inputX * steerSpeedX, 8.0, dt);
    this.playerVel.y = THREE.MathUtils.damp(this.playerVel.y, inputY * steerSpeedY, 8.0, dt);
    this.playerVel.z = -currentSpeed;

    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.y += this.playerVel.y * dt;
    this.playerPos.z += this.playerVel.z * dt;

    this.depthMeters = Math.floor(Math.abs(this.playerPos.z));

    // Ship Banking & Rotation Kinematics
    const targetRoll = -inputX * 0.55 + (this.barrelRollTimer > 0 ? this.barrelRollDirection * Math.PI * 2 * (1 - this.barrelRollTimer / 0.45) : 0);
    const targetPitch = inputY * 0.28;
    const targetYaw = -inputX * 0.22;

    this.playerRot.z = THREE.MathUtils.damp(this.playerRot.z, targetRoll, 10.0, dt);
    this.playerRot.x = THREE.MathUtils.damp(this.playerRot.x, targetPitch, 8.0, dt);
    this.playerRot.y = THREE.MathUtils.damp(this.playerRot.y, targetYaw, 8.0, dt);

    if (this.barrelRollTimer > 0) {
      this.barrelRollTimer -= dt;
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    this.playerShip.position.copy(this.playerPos);
    this.playerShip.rotation.copy(this.playerRot);

    // Update thruster flame scale
    const flameR = this.playerShip.getObjectByName('flameR');
    const flameL = this.playerShip.getObjectByName('flameL');
    const flameScaleZ = isBoosting ? 2.2 : 0.9 + Math.random() * 0.25;
    if (flameR) flameR.scale.set(1, 1, flameScaleZ);
    if (flameL) flameL.scale.set(1, 1, flameScaleZ);

    // Move key light and headlight with player
    this.keyLight.position.set(this.playerPos.x + 10, this.playerPos.y + 20, this.playerPos.z + 15);
    this.keyLight.target = this.playerShip;

    // Cave boundary collision check
    const wallCheck = this.caveManager.checkWallCollision(this.playerPos);
    if (wallCheck.collided) {
      this.handleDamage(28 * dt, 'wall');
      this.playerPos.addScaledVector(wallCheck.normal, 8.0 * dt);
      this.playerVel.multiplyScalar(0.7);
      this.createSparks(this.playerPos, 4);
    }

    // Update cave segments ahead
    const difficulty = 1.0 + this.depthMeters / 600;
    this.caveManager.update(this.playerPos.z, difficulty);

    // Combo multiplier decay
    if (this.comboCount > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.comboCount = 0;
        this.multiplier = 1;
      }
    }
  }

  private updateWeapons(dt: number, now: number) {
    const isFiring = this.input.firing || this.keysHeld['Space'];

    if (isFiring && now - this.lastPlayerShot >= this.playerShotCooldown) {
      this.lastPlayerShot = now;
      sound.playLaser('primary');

      // Fire twin plasma bolts from left and right cannons
      const gunOffset = this.alternateGun ? 1.2 : -1.2;
      this.alternateGun = !this.alternateGun;

      const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6);
      boltGeo.rotateX(Math.PI / 2);
      const boltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const boltMesh = new THREE.Mesh(boltGeo, boltMat);

      const spawnPos = this.playerPos.clone().add(
        new THREE.Vector3(gunOffset, -0.05, -1.8).applyEuler(this.playerRot)
      );
      boltMesh.position.copy(spawnPos);
      boltMesh.rotation.copy(this.playerRot);

      this.scene.add(boltMesh);

      const boltVel = new THREE.Vector3(0, 0, -110).applyEuler(this.playerRot);

      this.projectiles.push({
        mesh: boltMesh,
        velocity: boltVel,
        isPlayer: true,
        life: 1.2,
        radius: 0.3,
      });

      // Recoil animation on visible FPS cannons
      if (this.viewMode === 'fps') {
        const gunName = this.alternateGun ? 'fpsGunRight' : 'fpsGunLeft';
        const gun = this.cockpitInterior.getObjectByName(gunName);
        if (gun) {
          gun.position.z = -1.6;
        }
      }
    }

    // Damp FPS gun recoil back into resting position
    if (this.viewMode === 'fps') {
      const gL = this.cockpitInterior.getObjectByName('fpsGunLeft');
      const gR = this.cockpitInterior.getObjectByName('fpsGunRight');
      if (gL) gL.position.z = THREE.MathUtils.damp(gL.position.z, -1.8, 12.0, dt);
      if (gR) gR.position.z = THREE.MathUtils.damp(gR.position.z, -1.8, 12.0, dt);
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision
      if (p.isPlayer) {
        const nearby = this.caveManager.getNearbyObstacles(p.mesh.position.z, 8);
        for (const obs of nearby) {
          if (!obs.active) continue;
          const dist = p.mesh.position.distanceTo(obs.position);
          if (dist < obs.radius + p.radius) {
            // Hit obstacle!
            p.life = 0;
            this.createSparks(p.mesh.position, 6);

            if (obs.health !== undefined) {
              obs.health -= 1;
              if (obs.health <= 0) {
                obs.active = false;
                obs.mesh.visible = false;
                this.createExplosion(obs.position, 'medium', 0x38bdf8);
                this.score += (obs.scoreValue || 200) * this.multiplier;
                this.incrementCombo(1);
              } else {
                sound.playShieldHit();
              }
            }
            break;
          }
        }
      } else {
        // Enemy bolt hitting player
        const distToPlayer = p.mesh.position.distanceTo(this.playerPos);
        if (distToPlayer < 1.8) {
          p.life = 0;
          this.handleDamage(18, 'enemyLaser');
        }
      }
    }
  }

  private updateObstacles(dt: number, now: number) {
    const nearby = this.caveManager.getNearbyObstacles(this.playerPos.z, 50);

    for (const obs of nearby) {
      if (!obs.active) continue;

      // Animate Sentinel Drones
      if (obs.type === 'drone') {
        const ring1 = obs.mesh.getObjectByName('ring1');
        const ring2 = obs.mesh.getObjectByName('ring2');
        if (ring1) ring1.rotation.z += dt * 3.5;
        if (ring2) ring2.rotation.z -= dt * 3.5;

        // Hover bobbing
        if (obs.droneState) {
          obs.mesh.position.y = obs.droneState.baseY + Math.sin(now * 0.003 + obs.droneState.patrolOffset) * 0.8;
          obs.position.copy(obs.mesh.position);

          // Aim and fire at player if ahead
          if (obs.position.z < this.playerPos.z && obs.position.z > this.playerPos.z - 35) {
            obs.mesh.lookAt(this.playerPos);

            if (now - obs.droneState.lastShotTime >= obs.droneState.shootCooldown) {
              obs.droneState.lastShotTime = now;
              this.spawnEnemyLaser(obs.position);
            }
          }
        }
      }

      // Animate Crystals & Power-ups
      if (obs.type === 'crystal' || obs.type === 'powerup') {
        obs.mesh.rotation.y += dt * 1.8;
        const ring = obs.mesh.getObjectByName('powerupRing');
        if (ring) ring.rotation.x += dt * 2.5;
      }

      // Check collision with Player
      const dist = this.playerPos.distanceTo(obs.position);
      if (dist < obs.radius + 1.2) {
        if (obs.type === 'crystal') {
          obs.active = false;
          obs.mesh.visible = false;
          sound.playPickup('crystal');
          this.score += 150 * this.multiplier;
          this.incrementCombo(1);
          this.createCrystalDust(obs.position);
        } else if (obs.type === 'powerup') {
          obs.active = false;
          obs.mesh.visible = false;
          sound.playPickup(obs.powerupType === 'shield' ? 'shield' : 'powerup');

          if (obs.powerupType === 'shield') {
            this.shield = Math.min(this.maxShield, this.shield + 40);
          } else {
            this.boostEnergy = this.maxBoostEnergy;
          }
          this.createCrystalDust(obs.position);
        } else {
          // Rock spires, drone crash, barrier
          this.handleDamage(35, 'impact');
          this.createExplosion(obs.position, 'medium', 0xf43f5e);
          obs.active = false;
          obs.mesh.visible = false;
        }
      }
    }
  }

  private spawnEnemyLaser(origin: THREE.Vector3) {
    sound.playEnemyLaser();

    const boltGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const boltMesh = new THREE.Mesh(boltGeo, boltMat);
    boltMesh.position.copy(origin);
    this.scene.add(boltMesh);

    const dir = new THREE.Vector3().subVectors(this.playerPos, origin).normalize();
    const velocity = dir.multiplyScalar(45.0);

    this.projectiles.push({
      mesh: boltMesh,
      velocity,
      isPlayer: false,
      life: 2.0,
      radius: 0.35,
    });
  }

  private handleDamage(amount: number, reason: string) {
    if (this.invulnerableTimer > 0 || this.isGameOver) return;

    sound.playShieldHit();
    this.shield -= amount;
    this.cameraTrauma = Math.min(this.cameraTrauma + 0.45, 1.0);
    this.comboCount = 0;
    this.multiplier = 1;

    // Simulation hitstop
    this.hitstopTimer = 0.04;

    if (this.shield <= 0) {
      this.shield = 0;
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    sound.playExplosion('large');
    this.createExplosion(this.playerPos, 'large', 0xf97316);
    this.playerShip.visible = false;
    this.cockpitInterior.visible = false;

    if (this.onGameOver) {
      this.onGameOver(this.getStats());
    }
  }

  private incrementCombo(amount: number) {
    this.comboCount += amount;
    this.comboResetTimer = 3.5;
    this.multiplier = Math.min(8, 1 + Math.floor(this.comboCount / 4));
  }

  private updateCamera(dt: number) {
    if (this.viewMode === 'isometric') {
      // Smooth Isometric follow cam positioned behind and above, slightly angled
      const targetCamPos = this.playerPos.clone().add(this.cameraOffsetIso);
      this.camera.position.lerp(targetCamPos, 8.0 * dt);

      const lookTarget = this.playerPos.clone().add(this.cameraLookAheadIso);
      this.camera.lookAt(lookTarget);
    } else {
      // First-person cockpit camera
      this.camera.position.copy(this.playerPos).add(new THREE.Vector3(0, 0.35, 0.1));
      this.camera.rotation.copy(this.playerRot);
    }

    // Apply decaying camera shake
    if (this.cameraTrauma > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraTrauma * 0.4;
      const shakeY = (Math.random() - 0.5) * this.cameraTrauma * 0.4;
      const shakeZ = (Math.random() - 0.5) * this.cameraTrauma * 0.4;

      this.camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
      this.cameraTrauma = Math.max(0, this.cameraTrauma - 1.8 * dt);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt;

      const scale = THREE.MathUtils.clamp(p.life / p.maxLife, 0.05, 1.0);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private createExplosion(pos: THREE.Vector3, intensity: 'small' | 'medium' | 'large', colorHex: number) {
    sound.playExplosion(intensity);
    this.cameraTrauma = Math.min(this.cameraTrauma + (intensity === 'large' ? 0.5 : 0.25), 1.0);

    const count = intensity === 'large' ? 24 : intensity === 'medium' ? 14 : 8;
    const geo = new THREE.DodecahedronGeometry(0.25, 0);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const speed = 8 + Math.random() * 16;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.8,
        color: new THREE.Color(colorHex),
      });
    }
  }

  private createSparks(pos: THREE.Vector3, count: number) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.4,
        color: new THREE.Color(0x38bdf8),
      });
    }
  }

  private createCrystalDust(pos: THREE.Vector3) {
    const geo = new THREE.TetrahedronGeometry(0.18, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.6,
        maxLife: 0.6,
        color: new THREE.Color(0x06b6d4),
      });
    }
  }

  private pushStats() {
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  public getStats(): GameStats {
    const now = performance.now();
    const empElapsed = now - this.empLastUsed;
    const empCooldownPct = Math.min(100, Math.floor((empElapsed / 12000) * 100));
    const speedKmh = Math.floor(Math.abs(this.playerVel.z) * 9.5);

    return {
      score: this.score,
      multiplier: this.multiplier,
      shield: Math.round(this.shield),
      maxShield: this.maxShield,
      boostEnergy: Math.round(this.boostEnergy),
      maxBoostEnergy: this.maxBoostEnergy,
      depthMeters: this.depthMeters,
      speedKmh,
      empCooldownPct,
      viewMode: this.viewMode,
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
      gyroEnabled: this.gyroEnabled,
      gyroTiltX: this.gyroMoveX,
      gyroTiltY: this.gyroMoveY,
      gyroSensitivity: this.gyroSensitivity,
      gyroInvertY: this.gyroInvertY,
    };
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);

    this.caveManager.clearAll();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
