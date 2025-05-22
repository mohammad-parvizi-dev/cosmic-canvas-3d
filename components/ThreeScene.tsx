
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeSceneProps {
  galaxyOrbitSpeedMultiplier: number;
  armInternalSpeedMultiplier: number;
  galaxySpread: number;
  numGalaxies: number;
  regenerationKey: number;
  disintegrationTriggerKey: number;
}

interface GalaxyInstance {
  group: THREE.Group;
  baseOrbitSpeed: number;
  baseArmSpeed: number;
  starSystem: THREE.Points;
  dustSystem: THREE.Points | null;
  // Disintegration properties
  disintegrationTriggerTime: number | null; // Timestamp of the global trigger event
  disintegrationDelay: number; // Random delay before this galaxy starts disintegrating (ms)
  isDisintegrating: boolean; // True once disintegration animation actually starts (after delay)
  disintegrationAnimationStartTime: number | null; // Timestamp when this galaxy's animation starts
  disintegrationDuration: number;
  disintegrationTargetCamPos: THREE.Vector3 | null;
  disintegrationInitialGroupPos: THREE.Vector3 | null;
  disintegrationRandomScaleFactor: number;
  originalStarMaterialOpacity: number;
  originalDustMaterialOpacity: number | null;
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const generateRandomGalaxyParameters = (universeRadius: number) => {
  const individualGalaxyRadius = rand(universeRadius * 0.02, universeRadius * 0.08);
  const armBaseHue = Math.random();
  const nebulaHue = (armBaseHue + rand(0.2, 0.4)) % 1.0;

  return {
    radius: individualGalaxyRadius,
    thickness: individualGalaxyRadius * rand(0.04, 0.1),
    numArms: randInt(2, 5),
    armTightness: rand(0.15, 0.8),
    armAngularWidth: rand(0.4, 1.5),
    coreRatio: rand(0.05, 0.15),
    centerBrightColor: new THREE.Color().setHSL(rand(0.08, 0.15), rand(0.7, 1.0), rand(0.85, 0.95)),
    armBaseColor: new THREE.Color().setHSL(armBaseHue, rand(0.6, 0.9), rand(0.4, 0.6)),
    armEdgeColor: new THREE.Color().setHSL((armBaseHue + rand(-0.05, 0.05)) % 1.0, rand(0.5, 0.8), rand(0.5, 0.7)),
    nebulaColor: new THREE.Color().setHSL(nebulaHue, rand(0.7, 1.0), rand(0.6, 0.75)),
    nebulaProbability: rand(0.05, 0.25),
    starPointSize: rand(0.01, 0.03) * (individualGalaxyRadius / 5),
    numStarPoints: randInt(4000, 12000),
    dustColor: new THREE.Color().setHSL(Math.random(), rand(0.1, 0.3), rand(0.05, 0.15)),
    dustNebulaColor: new THREE.Color().setHSL(Math.random(), rand(0.2, 0.4), rand(0.1, 0.2)),
    dustNebulaProbability: rand(0.02, 0.1),
    dustPointSizeMultiplier: rand(3, 8),
    dustOpacity: rand(0.2, 0.5),
    dustThicknessMultiplier: rand(1.2, 2.0),
    wobbleAmplitude: rand(0.05, 0.2),
    wobbleFrequency: rand(1.5, 4.0),
    baseArmSpeed: rand(-0.0015, 0.0015),
    baseOrbitSpeed: rand(-0.0008, 0.0008),
  };
};

const createSingleGalaxyGroup = (params: ReturnType<typeof generateRandomGalaxyParameters>): Pick<GalaxyInstance, 'starSystem' | 'dustSystem' | 'originalStarMaterialOpacity' | 'originalDustMaterialOpacity'> => {
  const { radius, thickness, numArms, armTightness, armAngularWidth, coreRatio, centerBrightColor, armBaseColor, armEdgeColor, nebulaColor, nebulaProbability, starPointSize, numStarPoints, dustColor, dustNebulaColor, dustNebulaProbability, dustPointSizeMultiplier, dustOpacity, dustThicknessMultiplier, wobbleAmplitude, wobbleFrequency } = params;
  const numDustPoints = Math.floor(numStarPoints / rand(3, 6));

  const getArmWobble = (radialDist: number, currentRadius: number, armIdx: number) => {
    const normalizedRadiusForWobble = radialDist / currentRadius;
    return Math.sin(normalizedRadiusForWobble * wobbleFrequency * Math.PI * 2 + armIdx * Math.PI * rand(0.5,1.0)) * wobbleAmplitude * (1.0 - normalizedRadiusForWobble * 0.5);
  };

  const starPositions = new Float32Array(numStarPoints * 3);
  const starColors = new Float32Array(numStarPoints * 3);
  for (let i = 0; i < numStarPoints; i++) {
    const randomProgress = Math.random();
    let radialDistance = Math.pow(randomProgress, 1.6) * radius;
    let extensionFactor = 1.0;
    if (randomProgress > 0.7) {
        extensionFactor = 1.0 + (Math.random() - 0.4) * 0.7;
        radialDistance *= extensionFactor;
    }
    const armChoice = Math.floor(Math.random() * numArms);
    const baseAngleForArm = (armChoice / numArms) * Math.PI * 2;
    const spiralOffset = radialDistance * armTightness;
    const angleOffsetWithinArm = (Math.pow(Math.random(), 0.55) - 0.5) * armAngularWidth;
    let angle = baseAngleForArm + spiralOffset + angleOffsetWithinArm;
    const normalizedRadiusForColor = Math.min(1.0, (radialDistance / (radius * Math.max(1, extensionFactor))) );
    if (radialDistance > radius * coreRatio * 1.2 && radialDistance < radius * 0.9) {
        angle += getArmWobble(radialDistance, radius, armChoice);
    }
    if (radialDistance < radius * coreRatio) {
      angle = Math.random() * Math.PI * 2;
      if (Math.random() < 0.7) radialDistance *= Math.pow(Math.random(), 1.8) * 0.85;
    }
    const x = radialDistance * Math.cos(angle);
    const z = radialDistance * Math.sin(angle);
    let yRand = (Math.random() - 0.5) * (Math.random() - 0.5) * 3.8;
    const normalizedRadiusForThickness = Math.min(1.0, radialDistance / (radius * 1.25));
    const thicknessFactor = Math.pow(1.0 - normalizedRadiusForThickness * 0.9, 1.3);
    let y = yRand * thickness * thicknessFactor;
    if (normalizedRadiusForThickness > 0.7) y *= Math.max(0, (1.0 - (normalizedRadiusForThickness - 0.7)/0.3) * 0.3 + 0.7);
    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;
    const particleColor = new THREE.Color();
    const randomBrightness = Math.random() * 0.4 + 0.6;
    if (normalizedRadiusForColor < coreRatio * 0.7) {
      particleColor.copy(centerBrightColor);
      particleColor.lerp(armBaseColor, Math.pow(normalizedRadiusForColor / (coreRatio * 0.7), 0.5) );
    } else if (normalizedRadiusForColor < coreRatio * 1.3) {
       particleColor.lerpColors(centerBrightColor, armBaseColor, (normalizedRadiusForColor - coreRatio*0.7) / (coreRatio*0.6) );
    } else if (Math.random() < nebulaProbability && normalizedRadiusForColor < 0.85 && normalizedRadiusForColor > coreRatio * 1.5) {
      particleColor.copy(nebulaColor);
      particleColor.offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.1);
    } else {
      const armLerpFactor = Math.min(1, Math.max(0, (normalizedRadiusForColor - coreRatio * 1.3)) / (1 - coreRatio * 1.3));
      particleColor.lerpColors(armBaseColor, armEdgeColor, Math.sqrt(armLerpFactor));
      particleColor.offsetHSL((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1);
    }
    particleColor.multiplyScalar(randomBrightness);
    starColors[i * 3] = particleColor.r;
    starColors[i * 3 + 1] = particleColor.g;
    starColors[i * 3 + 2] = particleColor.b;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({ size: starPointSize, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const originalStarMaterialOpacity = starMaterial.opacity;
  const starSystem = new THREE.Points(starGeometry, starMaterial);

  let dustSystem: THREE.Points | null = null;
  let originalDustMaterialOpacity: number | null = null;
  if (numDustPoints > 0) {
    const dustPositions = new Float32Array(numDustPoints * 3);
    const dustColorsArray = new Float32Array(numDustPoints * 3);
    for (let i = 0; i < numDustPoints; i++) {
      const randomProgress = Math.random();
      let radialDistance = Math.pow(randomProgress, 1.3) * radius * 0.95 + (radius * 0.05);
      let extensionFactor = 1.0;
      if (randomProgress > 0.65) {
        extensionFactor = 1.0 + (Math.random() - 0.35) * 0.6;
        radialDistance *= extensionFactor;
      }
      const armChoice = Math.floor(Math.random() * numArms);
      const baseAngleForArm = (armChoice / numArms) * Math.PI * 2;
      const spiralOffset = radialDistance * (armTightness * (0.9 + Math.random() * 0.2)) - 0.05;
      const angleOffsetWithinArm = (Math.random() - 0.5) * armAngularWidth * 0.7;
      let angle = baseAngleForArm + spiralOffset + angleOffsetWithinArm;
      const normalizedRadiusForColor = Math.min(1.0, (radialDistance / (radius * Math.max(1, extensionFactor))));
      if (radialDistance > radius * coreRatio * 1.5 && radialDistance < radius * 0.85) {
          angle += getArmWobble(radialDistance, radius, armChoice) * 0.8;
      }
      if (radialDistance < radius * coreRatio * 1.8) {
          if (Math.random() < 0.5) radialDistance *= (1.0 + Math.random() * 0.4);
          else angle += (Math.random() - 0.5) * 0.2;
      }
      const x = radialDistance * Math.cos(angle);
      const z = radialDistance * Math.sin(angle);
      let yRand = (Math.random() - 0.5) * (Math.random() - 0.5) * 3.0;
      const normalizedRadiusForThickness = Math.min(1.0, radialDistance / (radius * 1.25));
      const thicknessFactor = Math.pow(1.0 - normalizedRadiusForThickness * 0.85, 1.2);
      let y = yRand * thickness * thicknessFactor * dustThicknessMultiplier * 0.7;
      if (normalizedRadiusForThickness > 0.8) y *= Math.max(0.05, (1.0 - (normalizedRadiusForThickness - 0.8)/0.2) * 0.4 + 0.6);
      dustPositions[i * 3] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;
      const dustParticleColor = new THREE.Color();
      const randomBrightness = Math.random() * 0.2 + 0.1;
      if (Math.random() < dustNebulaProbability && normalizedRadiusForColor > coreRatio * 1.5) {
        dustParticleColor.copy(dustNebulaColor);
      } else {
        dustParticleColor.copy(dustColor);
      }
      dustParticleColor.offsetHSL(0, (Math.random() -0.5) * 0.1, (Math.random()-0.5)*0.05);
      dustParticleColor.multiplyScalar(randomBrightness);
      dustColorsArray[i * 3] = dustParticleColor.r;
      dustColorsArray[i * 3 + 1] = dustParticleColor.g;
      dustColorsArray[i * 3 + 2] = dustParticleColor.b;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColorsArray, 3));
    const dustMaterial = new THREE.PointsMaterial({ size: starPointSize * dustPointSizeMultiplier, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.NormalBlending, opacity: dustOpacity, depthWrite: false });
    originalDustMaterialOpacity = dustMaterial.opacity;
    dustSystem = new THREE.Points(dustGeometry, dustMaterial);
  }
  return { starSystem, dustSystem, originalStarMaterialOpacity, originalDustMaterialOpacity };
};

export const ThreeScene: React.FC<ThreeSceneProps> = (props) => {
  const { galaxyOrbitSpeedMultiplier, armInternalSpeedMultiplier, galaxySpread, numGalaxies, regenerationKey, disintegrationTriggerKey } = props;

  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const galaxyInstancesRef = useRef<GalaxyInstance[]>([]);
  const backgroundStarsRef = useRef<THREE.Points | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const galaxyOrbitSpeedMultiplierRefCurrent = useRef(galaxyOrbitSpeedMultiplier);
  const armInternalSpeedMultiplierRefCurrent = useRef(armInternalSpeedMultiplier);

  useEffect(() => {
    galaxyOrbitSpeedMultiplierRefCurrent.current = galaxyOrbitSpeedMultiplier;
  }, [galaxyOrbitSpeedMultiplier]);

  useEffect(() => {
    armInternalSpeedMultiplierRefCurrent.current = armInternalSpeedMultiplier;
  }, [armInternalSpeedMultiplier]);

  const disposePoints = useCallback((pointsObject: THREE.Points | null, scene: THREE.Scene | null) => {
    if (pointsObject) {
      pointsObject.geometry?.dispose();
      const material = pointsObject.material;
      if (material) {
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else (material as THREE.Material).dispose();
      }
      scene?.remove(pointsObject);
    }
  }, []);

  const handleResize = useCallback(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (renderer && camera && mountRef.current) {
      const { clientWidth, clientHeight } = mountRef.current;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }
  }, []);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || rendererRef.current) return; // Ensure this runs only once for setup

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010104); // Dark space blue/black
    sceneRef.current = scene;

    const initialCameraSpread = 150; // Use a fixed value for initial camera setup
    const camera = new THREE.PerspectiveCamera(
      55, currentMount.clientWidth / currentMount.clientHeight, 0.1, initialCameraSpread * 10
    );
    camera.position.set(0, initialCameraSpread * 0.3, initialCameraSpread * 1.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = initialCameraSpread * 4; // Will be updated by galaxySpread effect
    controls.target.set(0,0,0);
    controlsRef.current = controls;

    camera.lookAt(scene.position);

    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const stillActiveGalaxies: GalaxyInstance[] = [];

      galaxyInstancesRef.current.forEach(instance => {
        let shouldKeepInstance = true;

        // 1. Always apply normal rotation first
        instance.group.rotation.y += instance.baseOrbitSpeed * galaxyOrbitSpeedMultiplierRefCurrent.current * 100;
        instance.starSystem.rotation.y += instance.baseArmSpeed * armInternalSpeedMultiplierRefCurrent.current * 100;
        if (instance.dustSystem) {
          instance.dustSystem.rotation.y += instance.baseArmSpeed * armInternalSpeedMultiplierRefCurrent.current * 100 * rand(0.9, 1.1);
        }

        // 2. Check and potentially start disintegration animation (after delay)
        if (instance.disintegrationTriggerTime !== null && !instance.isDisintegrating) {
          if (now >= instance.disintegrationTriggerTime + instance.disintegrationDelay) {
            instance.isDisintegrating = true;
            instance.disintegrationAnimationStartTime = now;
            if (cameraRef.current) {
                instance.disintegrationTargetCamPos = cameraRef.current.position.clone();
            } else { // Fallback if camera somehow not ready
                instance.disintegrationTargetCamPos = new THREE.Vector3(0,0, instance.group.position.z + 50);
            }
            instance.disintegrationInitialGroupPos = instance.group.position.clone();
            instance.disintegrationDuration = rand(2.0, 4.5); // Duration of the disintegration animation
            instance.disintegrationRandomScaleFactor = rand(2.5, 7.0); // More explosive scaling

            // Reset opacity and scale to original before starting fade/scale animation
            (instance.starSystem.material as THREE.PointsMaterial).opacity = instance.originalStarMaterialOpacity;
            instance.starSystem.scale.set(1,1,1);
            if (instance.dustSystem && instance.originalDustMaterialOpacity !== null) {
              (instance.dustSystem.material as THREE.PointsMaterial).opacity = instance.originalDustMaterialOpacity;
              instance.dustSystem.scale.set(1,1,1);
            }
          }
        }

        // 3. If actively disintegrating, perform animation
        if (instance.isDisintegrating && instance.disintegrationAnimationStartTime !== null) {
          const elapsedTime = (now - instance.disintegrationAnimationStartTime) / 1000;
          const progress = Math.min(1, elapsedTime / instance.disintegrationDuration);

          if (progress >= 1) {
            // Animation complete: dispose and mark for removal
            disposePoints(instance.starSystem, sceneRef.current);
            if (instance.dustSystem) disposePoints(instance.dustSystem, sceneRef.current);
            sceneRef.current?.remove(instance.group);
            shouldKeepInstance = false;
          } else {
            // Animation in progress: apply transformations
            if (instance.disintegrationInitialGroupPos && instance.disintegrationTargetCamPos) {
              instance.group.position.lerpVectors(
                instance.disintegrationInitialGroupPos,
                instance.disintegrationTargetCamPos,
                progress
              );
            }
            const scaleProgress = 1 + progress * instance.disintegrationRandomScaleFactor;
            instance.starSystem.scale.set(scaleProgress, scaleProgress, scaleProgress);
            if (instance.dustSystem) {
              instance.dustSystem.scale.set(scaleProgress, scaleProgress, scaleProgress);
            }

            (instance.starSystem.material as THREE.PointsMaterial).opacity = instance.originalStarMaterialOpacity * (1 - progress * progress); // Faster fade
            if (instance.dustSystem && instance.originalDustMaterialOpacity !== null) {
              (instance.dustSystem.material as THREE.PointsMaterial).opacity = instance.originalDustMaterialOpacity * (1 - progress * progress); // Faster fade
            }
          }
        }
        
        // 4. If instance is to be kept, add to the list for the next frame
        if (shouldKeepInstance) {
          stillActiveGalaxies.push(instance);
        }
      });
      galaxyInstancesRef.current = stillActiveGalaxies;

      controlsRef.current?.update();
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => { // Cleanup for the initial scene setup
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      // Renderer and controls disposal moved to the final cleanup effect
    };
  }, [handleResize, disposePoints]); // Runs once

  // Effect for background stars and camera/controls limits based on galaxySpread
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (cameraRef.current) {
      cameraRef.current.far = galaxySpread * 10;
      cameraRef.current.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.maxDistance = galaxySpread * 4;
    }

    disposePoints(backgroundStarsRef.current, scene); // Dispose old background
    backgroundStarsRef.current = null;

    const bgStarPositions = new Float32Array(15000 * 3);
    const bgStarColors = new Float32Array(15000 * 3);
    const bgColor = new THREE.Color();
    const bgRadius = galaxySpread * 5; // Background significantly larger than galaxy spread
    for (let i = 0; i < 15000; i++) {
      const r = bgRadius * (0.85 + Math.random() * 0.15); // Distribute in a thick shell
      const phi = Math.acos(2 * Math.random() - 1); // Uniform spherical distribution
      const theta = Math.random() * Math.PI * 2;
      bgStarPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      bgStarPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bgStarPositions[i * 3 + 2] = r * Math.cos(phi);
      const brightness = Math.random() * 0.2 + 0.2;
      bgColor.setHSL(Math.random() * 0.1 + 0.55, Math.random() * 0.2 + 0.3, brightness); // Cool distant stars
      bgStarColors[i*3] = bgColor.r;
      bgStarColors[i*3+1] = bgColor.g;
      bgStarColors[i*3+2] = bgColor.b;
    }
    const bgGeometry = new THREE.BufferGeometry();
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgStarPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgStarColors, 3));
    const bgMaterial = new THREE.PointsMaterial({ size: Math.max(0.15, 0.00035 * bgRadius), sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
    backgroundStarsRef.current = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(backgroundStarsRef.current);

  }, [galaxySpread, disposePoints]); // Re-run if galaxySpread changes

  // Galaxy Generation Effect
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Use the galaxySpread from props for galaxy generation volume
    const currentGalaxySpreadValue = props.galaxySpread;

    // Dispose existing galaxies before creating new ones
    galaxyInstancesRef.current.forEach(instance => {
      disposePoints(instance.starSystem, scene);
      if (instance.dustSystem) disposePoints(instance.dustSystem, scene);
      scene.remove(instance.group);
    });
    galaxyInstancesRef.current = [];

    for (let i = 0; i < numGalaxies; i++) {
      const galaxyParams = generateRandomGalaxyParameters(currentGalaxySpreadValue);
      const { starSystem, dustSystem, originalStarMaterialOpacity, originalDustMaterialOpacity } = createSingleGalaxyGroup(galaxyParams);
      const group = new THREE.Group();
      group.add(starSystem);
      if (dustSystem) group.add(dustSystem);

      // Scatter galaxies within the currentGalaxySpreadValue
      const r = rand(currentGalaxySpreadValue * 0.05, currentGalaxySpreadValue * 0.9); // Slightly less than full spread to avoid edge clipping
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      group.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      group.rotation.set(rand(0, Math.PI*2), rand(0, Math.PI*2), rand(0, Math.PI*2));
      const scale = rand(0.4, 1.2);
      group.scale.set(scale, scale, scale);
      scene.add(group);
      galaxyInstancesRef.current.push({
        group,
        baseArmSpeed: galaxyParams.baseArmSpeed,
        baseOrbitSpeed: galaxyParams.baseOrbitSpeed,
        starSystem,
        dustSystem,
        disintegrationTriggerTime: null,
        disintegrationDelay: 0,
        isDisintegrating: false,
        disintegrationAnimationStartTime: null,
        disintegrationDuration: 0,
        disintegrationTargetCamPos: null,
        disintegrationInitialGroupPos: null,
        disintegrationRandomScaleFactor: 1,
        originalStarMaterialOpacity,
        originalDustMaterialOpacity
      });
    }
  }, [numGalaxies, regenerationKey, disposePoints, props.galaxySpread]); // Also depends on props.galaxySpread for generation volume.

  // Disintegration Trigger Effect
  useEffect(() => {
    if (disintegrationTriggerKey === 0) return; // Do nothing on initial load
    // This key change triggers the disintegration priming
    const triggerTime = performance.now();
    galaxyInstancesRef.current.forEach(instance => {
        // Prime for disintegration, actual start handled by animate loop after delay
        instance.disintegrationTriggerTime = triggerTime;
        instance.disintegrationDelay = rand(0, 3000); // Random delay up to 3 seconds
        instance.isDisintegrating = false; // Reset state
        instance.disintegrationAnimationStartTime = null; // Reset state
    });
  }, [disintegrationTriggerKey]);


  // Final Cleanup Effect (when component unmounts)
  useEffect(() => {
    const currentMount = mountRef.current; // Capture for use in cleanup
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize); // Ensure resize listener is removed

      if (sceneRef.current) {
        galaxyInstancesRef.current.forEach(instance => {
          disposePoints(instance.starSystem, sceneRef.current);
          if (instance.dustSystem) disposePoints(instance.dustSystem, sceneRef.current);
          sceneRef.current?.remove(instance.group);
        });
        galaxyInstancesRef.current = [];
        disposePoints(backgroundStarsRef.current, sceneRef.current);
        backgroundStarsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (currentMount && rendererRef.current.domElement.parentNode === currentMount) {
          currentMount.removeChild(rendererRef.current.domElement);
        }
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      // Nullify refs
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [disposePoints, handleResize]); // Depends on these callbacks

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" aria-label="Interactive 3D universe with multiple randomly generated galaxies. Use controls to change global rotation speed and universe spread." />;
};
