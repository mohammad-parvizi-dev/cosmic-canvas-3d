
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateRandomGalaxyParameters, createSingleGalaxyGroup, GalaxyParams, rand, randInt } from './galaxyUtils';

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
  disintegrationTriggerTime: number | null; 
  disintegrationDelay: number; 
  isDisintegrating: boolean; 
  disintegrationAnimationStartTime: number | null; 
  disintegrationDuration: number;
  disintegrationTargetCamPos: THREE.Vector3 | null;
  disintegrationInitialGroupPos: THREE.Vector3 | null;
  disintegrationRandomScaleFactor: number;
  originalStarMaterialOpacity: number;
  originalDustMaterialOpacity: number | null;
}


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
    if (!currentMount || rendererRef.current) return; 

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010104); 
    sceneRef.current = scene;

    const initialCameraSpread = 150; 
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
    controls.maxDistance = initialCameraSpread * 4; 
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

        instance.group.rotation.y += instance.baseOrbitSpeed * galaxyOrbitSpeedMultiplierRefCurrent.current * 100;
        instance.starSystem.rotation.y += instance.baseArmSpeed * armInternalSpeedMultiplierRefCurrent.current * 100;
        if (instance.dustSystem) {
          instance.dustSystem.rotation.y += instance.baseArmSpeed * armInternalSpeedMultiplierRefCurrent.current * 100 * rand(0.9, 1.1);
        }

        if (instance.disintegrationTriggerTime !== null && !instance.isDisintegrating) {
          if (now >= instance.disintegrationTriggerTime + instance.disintegrationDelay) {
            instance.isDisintegrating = true;
            instance.disintegrationAnimationStartTime = now;
            if (cameraRef.current) {
                instance.disintegrationTargetCamPos = cameraRef.current.position.clone();
            } else { 
                instance.disintegrationTargetCamPos = new THREE.Vector3(0,0, instance.group.position.z + 50);
            }
            instance.disintegrationInitialGroupPos = instance.group.position.clone();
            instance.disintegrationDuration = rand(2.0, 4.5); 
            instance.disintegrationRandomScaleFactor = rand(2.5, 7.0);

            (instance.starSystem.material as THREE.PointsMaterial).opacity = instance.originalStarMaterialOpacity;
            instance.starSystem.scale.set(1,1,1);
            if (instance.dustSystem && instance.originalDustMaterialOpacity !== null) {
              (instance.dustSystem.material as THREE.PointsMaterial).opacity = instance.originalDustMaterialOpacity;
              instance.dustSystem.scale.set(1,1,1);
            }
          }
        }

        if (instance.isDisintegrating && instance.disintegrationAnimationStartTime !== null) {
          const elapsedTime = (now - instance.disintegrationAnimationStartTime) / 1000;
          const progress = Math.min(1, elapsedTime / instance.disintegrationDuration);

          if (progress >= 1) {
            disposePoints(instance.starSystem, sceneRef.current);
            if (instance.dustSystem) disposePoints(instance.dustSystem, sceneRef.current);
            sceneRef.current?.remove(instance.group);
            shouldKeepInstance = false;
          } else {
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

            (instance.starSystem.material as THREE.PointsMaterial).opacity = instance.originalStarMaterialOpacity * (1 - progress * progress); 
            if (instance.dustSystem && instance.originalDustMaterialOpacity !== null) {
              (instance.dustSystem.material as THREE.PointsMaterial).opacity = instance.originalDustMaterialOpacity * (1 - progress * progress); 
            }
          }
        }
        
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

    return () => { 
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, disposePoints]); 

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

    disposePoints(backgroundStarsRef.current, scene); 
    backgroundStarsRef.current = null;

    const bgStarPositions = new Float32Array(15000 * 3);
    const bgStarColors = new Float32Array(15000 * 3);
    const bgColor = new THREE.Color();
    const bgRadius = galaxySpread * 5; 
    for (let i = 0; i < 15000; i++) {
      const r = bgRadius * (0.85 + Math.random() * 0.15); 
      const phi = Math.acos(2 * Math.random() - 1); 
      const theta = Math.random() * Math.PI * 2;
      bgStarPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      bgStarPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bgStarPositions[i * 3 + 2] = r * Math.cos(phi);
      const brightness = Math.random() * 0.2 + 0.2;
      bgColor.setHSL(Math.random() * 0.1 + 0.55, Math.random() * 0.2 + 0.3, brightness); 
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

  }, [galaxySpread, disposePoints]); 

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentGalaxySpreadValue = props.galaxySpread;

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

      const r = rand(currentGalaxySpreadValue * 0.05, currentGalaxySpreadValue * 0.9); 
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
  }, [numGalaxies, regenerationKey, disposePoints, props.galaxySpread]); 

  useEffect(() => {
    if (disintegrationTriggerKey === 0) return; 
    const triggerTime = performance.now();
    galaxyInstancesRef.current.forEach(instance => {
        instance.disintegrationTriggerTime = triggerTime;
        instance.disintegrationDelay = rand(0, 3000); 
        instance.isDisintegrating = false; 
        instance.disintegrationAnimationStartTime = null; 
    });
  }, [disintegrationTriggerKey]);

  useEffect(() => {
    const currentMount = mountRef.current; 
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize); 

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
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [disposePoints, handleResize]); 

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" aria-label="Interactive 3D universe with multiple randomly generated galaxies. Use controls to change global rotation speed and universe spread." />;
};
    