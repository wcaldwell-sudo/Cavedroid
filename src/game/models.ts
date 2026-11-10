import * as THREE from 'three';

// Procedural materials cache
let shipHullMat: THREE.MeshStandardMaterial;
let shipWingMat: THREE.MeshStandardMaterial;
let canopyMat: THREE.MeshPhysicalMaterial;
let cannonMat: THREE.MeshStandardMaterial;
let thrusterGlowMat: THREE.MeshBasicMaterial;
let droneHullMat: THREE.MeshStandardMaterial;
let droneRingMat: THREE.MeshStandardMaterial;
let droneEyeMat: THREE.MeshStandardMaterial;
let crystalMat: THREE.MeshPhysicalMaterial;
let barrierPylonMat: THREE.MeshStandardMaterial;
let barrierLaserMat: THREE.MeshBasicMaterial;

export function initMaterials(isSoftwareGl: boolean) {
  shipHullMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.35,
  });

  shipWingMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.75,
    roughness: 0.45,
  });

  canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.85,
    transparent: true,
    opacity: isSoftwareGl ? 0.6 : 0.95,
    ior: 1.5,
  });

  cannonMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.2,
  });

  thrusterGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });

  droneHullMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.3,
  });

  droneRingMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.95,
    roughness: 0.15,
  });

  droneEyeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.5,
    roughness: 0.2,
    metalness: 0.5,
  });

  crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.8,
    transparent: true,
    opacity: isSoftwareGl ? 0.75 : 0.9,
    ior: 1.6,
  });

  barrierPylonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.4,
  });

  barrierLaserMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.75,
  });
}

/**
 * Composite 3D Player Droid Fighter (9 distinct procedural parts)
 */
export function createPlayerShip(isSoftwareGl: boolean = false): THREE.Group {
  if (!shipHullMat) initMaterials(isSoftwareGl);

  const ship = new THREE.Group();

  // 1. Primary Silhouette: Tapered Aerodynamic Fuselage
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 2.2); // Nose
  hullShape.lineTo(0.55, 0.4);
  hullShape.lineTo(0.45, -1.6);
  hullShape.lineTo(-0.45, -1.6);
  hullShape.lineTo(-0.55, 0.4);
  hullShape.closePath();

  const hullExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.15,
  };
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, hullExtrudeSettings);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, shipHullMat);
  hullMesh.castShadow = !isSoftwareGl;
  hullMesh.receiveShadow = !isSoftwareGl;
  ship.add(hullMesh);

  // 2. Secondary Read: Tinted Cockpit Canopy Glass
  const canopyGeo = new THREE.ConeGeometry(0.32, 1.2, 5);
  canopyGeo.rotateX(-Math.PI / 2);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.position.set(0, 0.32, 0.1);
  canopyMesh.scale.set(0.9, 0.65, 1.0);
  ship.add(canopyMesh);

  // 3 & 4. Port & Starboard Swept Delta Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.8, -1.2);
  wingShape.lineTo(1.6, -1.6);
  wingShape.lineTo(0, -1.1);
  wingShape.closePath();

  const wingExtrude: THREE.ExtrudeGeometryOptions = {
    depth: 0.08,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  };

  // Starboard wing
  const wingGeoR = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
  wingGeoR.rotateX(Math.PI / 2);
  const wingR = new THREE.Mesh(wingGeoR, shipWingMat);
  wingR.position.set(0.35, 0.02, 0.2);
  wingR.castShadow = !isSoftwareGl;
  ship.add(wingR);

  // Port wing
  const wingGeoL = wingGeoR.clone();
  wingGeoL.scale(-1, 1, 1);
  const wingL = new THREE.Mesh(wingGeoL, shipWingMat);
  wingL.position.set(-0.35, 0.02, 0.2);
  wingL.castShadow = !isSoftwareGl;
  ship.add(wingL);

  // 5 & 6. Vertical Stabilizer Winglet Fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.45, 0.7);
  const finR = new THREE.Mesh(finGeo, shipWingMat);
  finR.position.set(1.9, 0.22, -1.0);
  finR.rotation.z = -0.18;
  ship.add(finR);

  const finL = new THREE.Mesh(finGeo, shipWingMat);
  finL.position.set(-1.9, 0.22, -1.0);
  finL.rotation.z = 0.18;
  ship.add(finL);

  // 7. Dual Ion Thruster Engines
  const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8);
  thrusterGeo.rotateX(Math.PI / 2);

  const thrusterR = new THREE.Mesh(thrusterGeo, cannonMat);
  thrusterR.position.set(0.3, 0.05, -1.5);
  ship.add(thrusterR);

  const thrusterL = new THREE.Mesh(thrusterGeo, cannonMat);
  thrusterL.position.set(-0.3, 0.05, -1.5);
  ship.add(thrusterL);

  // Glowing Thruster Exhauster Rings
  const exhaustGlowGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 8);
  exhaustGlowGeo.rotateX(Math.PI / 2);
  const glowR = new THREE.Mesh(exhaustGlowGeo, thrusterGlowMat);
  glowR.position.set(0.3, 0.05, -1.92);
  ship.add(glowR);

  const glowL = new THREE.Mesh(exhaustGlowGeo, thrusterGlowMat);
  glowL.position.set(-0.3, 0.05, -1.92);
  ship.add(glowL);

  // 8. Underwing Dual Plasma Cannon Barrels
  const cannonGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6);
  cannonGeo.rotateX(Math.PI / 2);

  const cannonR = new THREE.Mesh(cannonGeo, cannonMat);
  cannonR.position.set(1.2, -0.08, -0.2);
  ship.add(cannonR);

  const cannonL = new THREE.Mesh(cannonGeo, cannonMat);
  cannonL.position.set(-1.2, -0.08, -0.2);
  ship.add(cannonL);

  // 9. Animated Dynamic Thruster Plumes
  const flameGeo = new THREE.ConeGeometry(0.18, 1.4, 6);
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, -0.7);

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });

  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.3, 0.05, -1.95);
  flameR.name = 'flameR';
  ship.add(flameR);

  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.3, 0.05, -1.95);
  flameL.name = 'flameL';
  ship.add(flameL);

  return ship;
}

/**
 * FPS Cockpit Structural Frame & Visible Flanking Cannons
 */
export function createCockpitInterior(): THREE.Group {
  const cockpit = new THREE.Group();

  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.3,
  });

  // Left & right frame pillars
  const pillarGeo = new THREE.BoxGeometry(0.15, 2.8, 0.2);
  const leftPillar = new THREE.Mesh(pillarGeo, strutMat);
  leftPillar.position.set(-1.6, 0.2, -1.6);
  leftPillar.rotation.z = -0.35;
  cockpit.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, strutMat);
  rightPillar.position.set(1.6, 0.2, -1.6);
  rightPillar.rotation.z = 0.35;
  cockpit.add(rightPillar);

  // Upper canopy arch
  const archGeo = new THREE.BoxGeometry(2.8, 0.14, 0.2);
  const arch = new THREE.Mesh(archGeo, strutMat);
  arch.position.set(0, 1.3, -1.5);
  cockpit.add(arch);

  // Twin visible Plasma Cannons mounted in lower viewport corners
  const gunGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8);
  gunGeo.rotateX(Math.PI / 2);

  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.95,
    roughness: 0.2,
  });

  const leftGun = new THREE.Mesh(gunGeo, gunMat);
  leftGun.position.set(-1.25, -0.75, -1.8);
  leftGun.name = 'fpsGunLeft';
  cockpit.add(leftGun);

  const rightGun = new THREE.Mesh(gunGeo, gunMat);
  rightGun.position.set(1.25, -0.75, -1.8);
  rightGun.name = 'fpsGunRight';
  cockpit.add(rightGun);

  // Glowing muzzle rings
  const muzzleGeo = new THREE.TorusGeometry(0.13, 0.02, 6, 12);
  const muzzleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const muzzleL = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleL.position.set(-1.25, -0.75, -2.9);
  cockpit.add(muzzleL);

  const muzzleR = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleR.position.set(1.25, -0.75, -2.9);
  cockpit.add(muzzleR);

  return cockpit;
}

/**
 * Composite 3D Cave Sentinel Drone (7 distinct procedural parts)
 */
export function createSentinelDrone(isSoftwareGl: boolean = false): THREE.Group {
  if (!droneHullMat) initMaterials(isSoftwareGl);

  const drone = new THREE.Group();

  // 1. Armored Spherical Core Chassis
  const coreGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const core = new THREE.Mesh(coreGeo, droneHullMat);
  core.castShadow = !isSoftwareGl;
  drone.add(core);

  // 2. Glowing Crimson Ocular Sensor Lens
  const eyeGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const eye = new THREE.Mesh(eyeGeo, droneEyeMat);
  eye.position.set(0, 0, 0.58);
  drone.add(eye);

  // 3 & 4. Upper & Lower Counter-Rotating Gyroscopic Rings
  const ringGeo = new THREE.TorusGeometry(1.05, 0.06, 6, 16);
  const ring1 = new THREE.Mesh(ringGeo, droneRingMat);
  ring1.name = 'ring1';
  ring1.rotation.x = Math.PI / 4;
  drone.add(ring1);

  const ring2 = new THREE.Mesh(ringGeo, droneRingMat);
  ring2.name = 'ring2';
  ring2.rotation.x = -Math.PI / 4;
  drone.add(ring2);

  // 5 & 6. Flanking Plasma Blaster Pods
  const podGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.7, 6);
  podGeo.rotateX(Math.PI / 2);

  const podR = new THREE.Mesh(podGeo, droneHullMat);
  podR.position.set(0.9, 0, 0.1);
  drone.add(podR);

  const podL = new THREE.Mesh(podGeo, droneHullMat);
  podL.position.set(-0.9, 0, 0.1);
  drone.add(podL);

  // 7. Base Ion Thruster Node
  const thrusterNodeGeo = new THREE.ConeGeometry(0.25, 0.4, 6);
  thrusterNodeGeo.rotateX(Math.PI);
  const thrusterNode = new THREE.Mesh(thrusterNodeGeo, droneHullMat);
  thrusterNode.position.set(0, -0.7, 0);
  drone.add(thrusterNode);

  // Red glow underneath
  const nodeGlowGeo = new THREE.SphereGeometry(0.15, 6, 6);
  const nodeGlow = new THREE.Mesh(nodeGlowGeo, droneEyeMat);
  nodeGlow.position.set(0, -0.9, 0);
  drone.add(nodeGlow);

  return drone;
}

/**
 * Procedural Jagged Rock Stalactite / Stalagmite Spire
 */
export function createRockSpire(isHanging: boolean, height: number = 5, radius: number = 1.2): THREE.Mesh {
  const geo = new THREE.ConeGeometry(radius, height, 7, 3);
  const pos = geo.attributes.position;

  // Add procedural rocky vertex noise
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const factor = Math.sin(y * 2.5) * 0.18 + Math.cos(y * 4.2) * 0.12;
    pos.setX(i, pos.getX(i) + factor);
    pos.setZ(i, pos.getZ(i) + factor * 0.8);
  }
  geo.computeVertexNormals();

  if (isHanging) {
    geo.rotateX(Math.PI);
    geo.translate(0, -height / 2, 0);
  } else {
    geo.translate(0, height / 2, 0);
  }

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.9,
    metalness: 0.15,
    flatShading: true,
  });

  return new THREE.Mesh(geo, rockMat);
}

/**
 * Ancient Subterranean Crystal Cluster (Collectible / High Score Multiplier)
 */
export function createCrystalCluster(isSoftwareGl: boolean = false): THREE.Group {
  if (!crystalMat) initMaterials(isSoftwareGl);

  const cluster = new THREE.Group();

  // Central Obelisk
  const centerGeo = new THREE.CylinderGeometry(0.02, 0.45, 1.8, 6);
  const center = new THREE.Mesh(centerGeo, crystalMat);
  center.castShadow = !isSoftwareGl;
  cluster.add(center);

  // Flanking Shards
  const shardGeo = new THREE.CylinderGeometry(0.01, 0.25, 1.2, 5);
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(shardGeo, crystalMat);
    const angle = (i * Math.PI) / 2;
    shard.position.set(Math.cos(angle) * 0.45, -0.2, Math.sin(angle) * 0.45);
    shard.rotation.z = Math.cos(angle) * 0.35;
    shard.rotation.x = Math.sin(angle) * 0.35;
    cluster.add(shard);
  }

  // Inner Point Light (subtle glow on walls)
  if (!isSoftwareGl) {
    const light = new THREE.PointLight(0x06b6d4, 1.2, 8);
    cluster.add(light);
  }

  return cluster;
}

/**
 * Energy Barrier Forcefield (Passage hazard)
 */
export function createEnergyBarrier(width: number = 8, height: number = 6): THREE.Group {
  const barrier = new THREE.Group();

  // Top and bottom emitter pylons
  const pylonGeo = new THREE.BoxGeometry(width, 0.6, 0.8);
  const topPylon = new THREE.Mesh(pylonGeo, barrierPylonMat);
  topPylon.position.y = height / 2;
  barrier.add(topPylon);

  const bottomPylon = new THREE.Mesh(pylonGeo, barrierPylonMat);
  bottomPylon.position.y = -height / 2;
  barrier.add(bottomPylon);

  // Pulsating laser forcefield grid
  const planeGeo = new THREE.PlaneGeometry(width - 0.4, height - 1.2, 4, 4);
  const laserGrid = new THREE.Mesh(planeGeo, barrierLaserMat);
  laserGrid.name = 'laserGrid';
  barrier.add(laserGrid);

  return barrier;
}

/**
 * Powerup Core (Shield or Overdrive)
 */
export function createPowerupCore(type: 'shield' | 'boost' | 'weapon'): THREE.Group {
  const group = new THREE.Group();

  const color = type === 'shield' ? 0x22c55e : type === 'boost' ? 0x38bdf8 : 0xf59e0b;
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  const coreGeo = new THREE.OctahedronGeometry(0.55, 0);
  const core = new THREE.Mesh(coreGeo, mat);
  group.add(core);

  // Outer orbital ring
  const ringGeo = new THREE.TorusGeometry(0.85, 0.04, 6, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'powerupRing';
  group.add(ring);

  return group;
}
