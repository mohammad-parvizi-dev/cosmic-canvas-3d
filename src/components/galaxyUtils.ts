
import * as THREE from 'three';

export const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));

export interface GalaxyParams {
    radius: number;
    thickness: number;
    numArms: number;
    armTightness: number;
    armAngularWidth: number;
    coreRatio: number;
    centerBrightColor: THREE.Color;
    armBaseColor: THREE.Color;
    armEdgeColor: THREE.Color;
    nebulaColor: THREE.Color;
    nebulaProbability: number;
    starPointSize: number;
    numStarPoints: number;
    dustColor: THREE.Color;
    dustNebulaColor: THREE.Color;
    dustNebulaProbability: number;
    dustPointSizeMultiplier: number;
    dustOpacity: number;
    dustThicknessMultiplier: number;
    wobbleAmplitude: number;
    wobbleFrequency: number;
    baseArmSpeed: number;
    baseOrbitSpeed: number;
}

export const generateRandomGalaxyParameters = (universeRadius: number): GalaxyParams => {
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
    starPointSize: rand(0.01, 0.03) * (individualGalaxyRadius / 5), // Scale point size with galaxy radius
    numStarPoints: randInt(4000, 12000), // Reduced from original for multi-galaxy performance
    dustColor: new THREE.Color().setHSL(Math.random(), rand(0.1, 0.3), rand(0.05, 0.15)),
    dustNebulaColor: new THREE.Color().setHSL(Math.random(), rand(0.2, 0.4), rand(0.1, 0.2)),
    dustNebulaProbability: rand(0.02, 0.1),
    dustPointSizeMultiplier: rand(3, 8),
    dustOpacity: rand(0.2, 0.5),
    dustThicknessMultiplier: rand(1.2, 2.0),
    wobbleAmplitude: rand(0.05, 0.2),
    wobbleFrequency: rand(1.5, 4.0),
    baseArmSpeed: rand(-0.0015, 0.0015), // For internal rotation of arms/stars
    baseOrbitSpeed: rand(-0.0008, 0.0008), // For rotation of the entire galaxy group
  };
};

export const createSingleGalaxyGroup = (
  params: GalaxyParams
): { 
  starSystem: THREE.Points; 
  dustSystem: THREE.Points | null; 
  originalStarMaterialOpacity: number; 
  originalDustMaterialOpacity: number | null; 
} => {
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
        extensionFactor = 1.0 + (Math.random() - 0.4) * 0.7; // Make edges more irregular
        radialDistance *= extensionFactor;
    }
    const armChoice = Math.floor(Math.random() * numArms);
    const baseAngleForArm = (armChoice / numArms) * Math.PI * 2;
    const spiralOffset = radialDistance * armTightness;
    const angleOffsetWithinArm = (Math.pow(Math.random(), 0.55) - 0.5) * armAngularWidth;
    let angle = baseAngleForArm + spiralOffset + angleOffsetWithinArm;
    const normalizedRadiusForColor = Math.min(1.0, (radialDistance / (radius * Math.max(1, extensionFactor))) ); // Use extended radius for color norm
    
    if (radialDistance > radius * coreRatio * 1.2 && radialDistance < radius * 0.9) { // Apply wobble primarily in mid-arm regions
        angle += getArmWobble(radialDistance, radius, armChoice);
    }

    if (radialDistance < radius * coreRatio) { // Core region adjustments
      angle = Math.random() * Math.PI * 2; // More random angle in core
      if (Math.random() < 0.7) radialDistance *= Math.pow(Math.random(), 1.8) * 0.85; // Pull some core stars inward
    }

    const x = radialDistance * Math.cos(angle);
    const z = radialDistance * Math.sin(angle);
    let yRand = (Math.random() - 0.5) * (Math.random() - 0.5) * 3.8; // More spread for y
    const normalizedRadiusForThickness = Math.min(1.0, radialDistance / (radius * 1.25));
    const thicknessFactor = Math.pow(1.0 - normalizedRadiusForThickness * 0.9, 1.3); // Taper thickness
    let y = yRand * thickness * thicknessFactor;
    if (normalizedRadiusForThickness > 0.7) y *= Math.max(0, (1.0 - (normalizedRadiusForThickness - 0.7)/0.3) * 0.3 + 0.7); // Further flatten outer edges

    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;

    const particleColor = new THREE.Color();
    const randomBrightness = Math.random() * 0.4 + 0.6;

    if (normalizedRadiusForColor < coreRatio * 0.7) { // Deep core
      particleColor.copy(centerBrightColor);
      particleColor.lerp(armBaseColor, Math.pow(normalizedRadiusForColor / (coreRatio * 0.7), 0.5) );
    } else if (normalizedRadiusForColor < coreRatio * 1.3) { // Transition from core to arm
       particleColor.lerpColors(centerBrightColor, armBaseColor, (normalizedRadiusForColor - coreRatio*0.7) / (coreRatio*0.6) );
    } else if (Math.random() < nebulaProbability && normalizedRadiusForColor < 0.85 && normalizedRadiusForColor > coreRatio * 1.5) { // Nebula regions
      particleColor.copy(nebulaColor);
      particleColor.offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.1);
    } else { // Main arm regions
      const armLerpFactor = Math.min(1, Math.max(0, (normalizedRadiusForColor - coreRatio * 1.3)) / (1 - coreRatio * 1.3));
      particleColor.lerpColors(armBaseColor, armEdgeColor, Math.sqrt(armLerpFactor)); // Use sqrt for smoother transition to edge color
      particleColor.offsetHSL((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1); // Add more color variance
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
      let radialDistance = Math.pow(randomProgress, 1.3) * radius * 0.95 + (radius * 0.05); // Slightly different distribution for dust
      let extensionFactor = 1.0;
       if (randomProgress > 0.65) {
        extensionFactor = 1.0 + (Math.random() - 0.35) * 0.6; // Make dust edges irregular too
        radialDistance *= extensionFactor;
      }

      const armChoice = Math.floor(Math.random() * numArms);
      const baseAngleForArm = (armChoice / numArms) * Math.PI * 2;
      const spiralOffset = radialDistance * (armTightness * (0.9 + Math.random() * 0.2)) - 0.05; // Slightly different spiral for dust
      const angleOffsetWithinArm = (Math.random() - 0.5) * armAngularWidth * 0.7; // Tighter dust arms
      let angle = baseAngleForArm + spiralOffset + angleOffsetWithinArm;
      
      const normalizedRadiusForColor = Math.min(1.0, (radialDistance / (radius * Math.max(1, extensionFactor))));

      if (radialDistance > radius * coreRatio * 1.5 && radialDistance < radius * 0.85) { // Wobble dust too
          angle += getArmWobble(radialDistance, radius, armChoice) * 0.8;
      }
       if (radialDistance < radius * coreRatio * 1.8) { // Dust behavior in core
          if (Math.random() < 0.5) radialDistance *= (1.0 + Math.random() * 0.4); // Push some dust further out in core
          else angle += (Math.random() - 0.5) * 0.2; // Or shift angle
      }

      const x = radialDistance * Math.cos(angle);
      const z = radialDistance * Math.sin(angle);
      let yRand = (Math.random() - 0.5) * (Math.random() - 0.5) * 3.0; // Slightly less y-spread for dust
      const normalizedRadiusForThickness = Math.min(1.0, radialDistance / (radius * 1.25));
      const thicknessFactor = Math.pow(1.0 - normalizedRadiusForThickness * 0.85, 1.2);
      let y = yRand * thickness * thicknessFactor * dustThicknessMultiplier * 0.7; // Dust lanes are often thinner
      if (normalizedRadiusForThickness > 0.8) y *= Math.max(0.05, (1.0 - (normalizedRadiusForThickness - 0.8)/0.2) * 0.4 + 0.6);


      dustPositions[i * 3] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;

      const dustParticleColor = new THREE.Color();
      const randomBrightness = Math.random() * 0.2 + 0.1; // Dust is dimmer
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
    // Use NormalBlending for dust to appear more like obscuring lanes
    const dustMaterial = new THREE.PointsMaterial({ size: starPointSize * dustPointSizeMultiplier, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.NormalBlending, opacity: dustOpacity, depthWrite: false });
    originalDustMaterialOpacity = dustMaterial.opacity;
    dustSystem = new THREE.Points(dustGeometry, dustMaterial);
  }

  return { starSystem, dustSystem, originalStarMaterialOpacity, originalDustMaterialOpacity };
};
    