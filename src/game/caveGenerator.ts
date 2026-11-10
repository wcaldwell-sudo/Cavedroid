import * as THREE from 'three';
import {
  createRockSpire,
  createSentinelDrone,
  createCrystalCluster,
  createEnergyBarrier,
  createPowerupCore,
} from './models';

export interface CaveSegment {
  id: number;
  zStart: number;
  zEnd: number;
  mesh: THREE.Mesh;
  centerPoints: THREE.Vector3[];
  obstacles: ObstacleEntity[];
}

export type ObstacleType = 'stalactite' | 'stalagmite' | 'drone' | 'crystal' | 'barrier' | 'powerup';

export interface ObstacleEntity {
  id: number;
  type: ObstacleType;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  radius: number;
  health?: number;
  active: boolean;
  scoreValue?: number;
  powerupType?: 'shield' | 'boost' | 'weapon';
  droneState?: {
    lastShotTime: number;
    shootCooldown: number;
    patrolOffset: number;
    baseY: number;
  };
}

export class CaveManager {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  private activeSegments: CaveSegment[] = [];
  private nextSegmentId: number = 0;
  private currentZ: number = 0;

  // Cave tunnel geometry parameters
  private readonly segmentLength: number = 60;
  private readonly numSegmentsAhead: number = 5;
  private readonly radialSegments: number = 20;
  private readonly lengthSegments: number = 15;
  private readonly tunnelRadiusX: number = 10.5;
  private readonly tunnelRadiusY: number = 8.5;

  private caveMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;

    // Procedural rock texture for the cave interior
    this.caveMaterial = new THREE.MeshStandardMaterial({
      color: 0x161d2f,
      roughness: 0.88,
      metalness: 0.15,
      flatShading: true,
      side: THREE.BackSide, // Visible from inside the tunnel
    });
  }

  // Path generator for cave center spline
  public getCaveCenter(z: number): THREE.Vector3 {
    // Smooth undulating frequency
    const x = Math.sin(z * 0.018) * 8.0 + Math.sin(z * 0.042) * 3.5;
    const y = Math.cos(z * 0.015) * 4.5 + Math.sin(z * 0.035) * 2.0;
    return new THREE.Vector3(x, y, z);
  }

  // Initialize starting segments
  public initCave() {
    this.clearAll();
    this.currentZ = 20; // Start slightly behind player

    for (let i = 0; i < this.numSegmentsAhead; i++) {
      this.generateSegment();
    }
  }

  // Update cave as player moves forward (in negative Z direction)
  public update(playerZ: number, difficultyMultiplier: number = 1.0) {
    // Generate new segments ahead
    while (this.currentZ > playerZ - this.numSegmentsAhead * this.segmentLength) {
      this.generateSegment(difficultyMultiplier);
    }

    // Remove segments far behind player (more than 1 segment behind)
    while (this.activeSegments.length > 0 && this.activeSegments[0].zEnd > playerZ + this.segmentLength * 1.2) {
      const oldSeg = this.activeSegments.shift();
      if (oldSeg) {
        this.disposeSegment(oldSeg);
      }
    }
  }

  private generateSegment(difficulty: number = 1.0): CaveSegment {
    const zStart = this.currentZ;
    const zEnd = zStart - this.segmentLength;
    this.currentZ = zEnd;

    const segmentId = this.nextSegmentId++;
    const centerPoints: THREE.Vector3[] = [];

    // Create tube geometry along the cave spline
    const zStep = this.segmentLength / this.lengthSegments;
    for (let i = 0; i <= this.lengthSegments; i++) {
      const z = zStart - i * zStep;
      centerPoints.push(this.getCaveCenter(z));
    }

    // Build custom BufferGeometry for the cave tunnel
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const color1 = new THREE.Color(0x131927); // Dark basalt
    const color2 = new THREE.Color(0x1e293b); // Slate rock
    const veinColor = new THREE.Color(0x0284c7); // Bioluminescent mineral vein

    for (let i = 0; i <= this.lengthSegments; i++) {
      const center = centerPoints[i];
      const z = center.z;

      for (let j = 0; j <= this.radialSegments; j++) {
        const theta = (j / this.radialSegments) * Math.PI * 2;
        // Rocky noise deformation
        const noise = Math.sin(theta * 5 + z * 0.1) * 0.8 + Math.cos(theta * 3 + z * 0.2) * 0.5;
        const rx = this.tunnelRadiusX + noise;
        const ry = this.tunnelRadiusY + noise * 0.8;

        const vx = center.x + Math.cos(theta) * rx;
        const vy = center.y + Math.sin(theta) * ry;
        const vz = z;

        vertices.push(vx, vy, vz);

        // Add subtle mineral vein coloring along tunnel ceiling / floor
        const isVein = Math.sin(z * 0.08 + theta * 2) > 0.85;
        const vertexColor = isVein ? veinColor : (j % 2 === 0 ? color1 : color2);
        colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
      }
    }

    // Build indices for triangles
    const stride = this.radialSegments + 1;
    for (let i = 0; i < this.lengthSegments; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + (j + 1);
        const d = i * stride + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = this.caveMaterial.clone();
    mat.vertexColors = true;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(mesh);

    const obstacles: ObstacleEntity[] = [];

    // Don't spawn dangerous obstacles in the very first start segment (safe launch zone)
    if (segmentId > 0) {
      this.populateSegmentObstacles(zStart, zEnd, obstacles, difficulty);
    }

    const segment: CaveSegment = {
      id: segmentId,
      zStart,
      zEnd,
      mesh,
      centerPoints,
      obstacles,
    };

    this.activeSegments.push(segment);
    return segment;
  }

  // Populate stalactites, sentinels, crystals, barriers in segment
  private populateSegmentObstacles(
    zStart: number,
    zEnd: number,
    obstacles: ObstacleEntity[],
    difficulty: number
  ) {
    const numObstaclePacks = 3 + Math.floor(Math.min(difficulty, 3.0));
    const zStep = (zStart - zEnd) / (numObstaclePacks + 1);

    for (let i = 1; i <= numObstaclePacks; i++) {
      const z = zStart - i * zStep;
      const center = this.getCaveCenter(z);
      const rand = Math.random();

      // 1. Hanging Stalactite (ceiling hazard)
      if (rand < 0.38) {
        const height = 4.0 + Math.random() * 2.5;
        const spire = createRockSpire(true, height, 1.4);
        const xOffset = (Math.random() - 0.5) * 5.0;
        const pos = new THREE.Vector3(center.x + xOffset, center.y + this.tunnelRadiusY - 0.5, z);
        spire.position.copy(pos);
        this.scene.add(spire);

        obstacles.push({
          id: Math.random(),
          type: 'stalactite',
          mesh: spire,
          position: pos,
          radius: 1.5,
          active: true,
          health: 1,
        });
      }
      // 2. Rising Stalagmite (floor hazard)
      else if (rand < 0.65) {
        const height = 3.8 + Math.random() * 2.5;
        const spire = createRockSpire(false, height, 1.4);
        const xOffset = (Math.random() - 0.5) * 5.0;
        const pos = new THREE.Vector3(center.x + xOffset, center.y - this.tunnelRadiusY + 0.5, z);
        spire.position.copy(pos);
        this.scene.add(spire);

        obstacles.push({
          id: Math.random(),
          type: 'stalagmite',
          mesh: spire,
          position: pos,
          radius: 1.5,
          active: true,
          health: 1,
        });
      }
      // 3. Enemy Sentinel Drone (fires laser pulses)
      else if (rand < 0.82) {
        const drone = createSentinelDrone(this.isSoftwareGl);
        const xOffset = (Math.random() - 0.5) * 6.0;
        const yOffset = (Math.random() - 0.5) * 3.0;
        const pos = new THREE.Vector3(center.x + xOffset, center.y + yOffset, z);
        drone.position.copy(pos);
        this.scene.add(drone);

        obstacles.push({
          id: Math.random(),
          type: 'drone',
          mesh: drone,
          position: pos,
          radius: 1.2,
          health: 2,
          scoreValue: 250,
          active: true,
          droneState: {
            lastShotTime: performance.now(),
            shootCooldown: 2200 - Math.min(difficulty * 200, 1000),
            patrolOffset: Math.random() * Math.PI * 2,
            baseY: pos.y,
          },
        });
      }
      // 4. Energy Barrier Gate
      else {
        const barrier = createEnergyBarrier(12, 8);
        const pos = new THREE.Vector3(center.x, center.y, z);
        barrier.position.copy(pos);
        this.scene.add(barrier);

        obstacles.push({
          id: Math.random(),
          type: 'barrier',
          mesh: barrier,
          position: pos,
          radius: 2.2,
          health: 4,
          scoreValue: 400,
          active: true,
        });
      }

      // Collectibles: Glowing Crystals or Powerup Cores along the route
      if (Math.random() < 0.45) {
        const crystal = createCrystalCluster(this.isSoftwareGl);
        const crystalZ = z + 4;
        const crystalCenter = this.getCaveCenter(crystalZ);
        const cX = crystalCenter.x + (Math.random() - 0.5) * 6;
        const cY = crystalCenter.y + (Math.random() - 0.5) * 4;
        const crystalPos = new THREE.Vector3(cX, cY, crystalZ);
        crystal.position.copy(crystalPos);
        this.scene.add(crystal);

        obstacles.push({
          id: Math.random(),
          type: 'crystal',
          mesh: crystal,
          position: crystalPos,
          radius: 1.1,
          scoreValue: 100,
          active: true,
        });
      }

      // Rare Power-up Core (Shield or Boost)
      if (Math.random() < 0.18) {
        const powerupType = Math.random() > 0.5 ? 'shield' : 'boost';
        const powerup = createPowerupCore(powerupType);
        const pZ = z - 4;
        const pCenter = this.getCaveCenter(pZ);
        const pPos = new THREE.Vector3(pCenter.x + (Math.random() - 0.5) * 4, pCenter.y, pZ);
        powerup.position.copy(pPos);
        this.scene.add(powerup);

        obstacles.push({
          id: Math.random(),
          type: 'powerup',
          mesh: powerup,
          position: pPos,
          radius: 1.2,
          scoreValue: 150,
          powerupType,
          active: true,
        });
      }
    }
  }

  // Check if player position hits the cave walls
  public checkWallCollision(playerPos: THREE.Vector3): { collided: boolean; normal: THREE.Vector3 } {
    const center = this.getCaveCenter(playerPos.z);
    const dx = playerPos.x - center.x;
    const dy = playerPos.y - center.y;

    // Elliptical boundary check
    const normalizedDist = (dx * dx) / (this.tunnelRadiusX * this.tunnelRadiusX) +
                           (dy * dy) / (this.tunnelRadiusY * this.tunnelRadiusY);

    if (normalizedDist >= 0.82) { // Hit wall threshold
      const normal = new THREE.Vector3(-dx, -dy, 0).normalize();
      return { collided: true, normal };
    }

    return { collided: false, normal: new THREE.Vector3() };
  }

  // Get all active obstacles within player proximity
  public getNearbyObstacles(playerZ: number, radius: number = 40): ObstacleEntity[] {
    const nearby: ObstacleEntity[] = [];
    for (const seg of this.activeSegments) {
      if (seg.zStart >= playerZ - radius && seg.zEnd <= playerZ + radius) {
        for (const obs of seg.obstacles) {
          if (obs.active) {
            nearby.push(obs);
          }
        }
      }
    }
    return nearby;
  }

  // Dispose a segment and free GPU memory
  private disposeSegment(segment: CaveSegment) {
    this.scene.remove(segment.mesh);
    segment.mesh.geometry.dispose();
    if (Array.isArray(segment.mesh.material)) {
      segment.mesh.material.forEach(m => m.dispose());
    } else {
      segment.mesh.material.dispose();
    }

    for (const obs of segment.obstacles) {
      this.scene.remove(obs.mesh);
      obs.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach(mat => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }
  }

  public clearAll() {
    for (const seg of this.activeSegments) {
      this.disposeSegment(seg);
    }
    this.activeSegments = [];
    this.nextSegmentId = 0;
  }
}
