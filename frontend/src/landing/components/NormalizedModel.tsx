import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EraConfig } from '../eras';
import { createCallFlowScreenTexture, type CallFlowCanvasHandle } from './CallFlowScreenTexture';

interface NormalizedModelProps {
  era: EraConfig;
  targetBoundingRadius?: number;
  heroBlendRef: React.MutableRefObject<number>;
}

const TARGET_BOUNDING_RADIUS = 1.15;

export function NormalizedModel({
  era,
  targetBoundingRadius = TARGET_BOUNDING_RADIUS,
  heroBlendRef,
}: NormalizedModelProps) {
  const gltf = useGLTF(era.modelUrl);
  const screenTextureRef = useRef<CallFlowCanvasHandle | null>(null);
  const originalScreenMapsRef = useRef<{
    material: THREE.MeshStandardMaterial;
    map: THREE.Texture | null;
    emissiveMap: THREE.Texture | null;
    emissiveIntensity: number;
  } | null>(null);
  const clonedMaterialsRef = useRef<THREE.Material[]>([]);
  const lastCanvasDrawRef = useRef<number>(-1);
  const lastRenderedBlendRef = useRef<number>(-1);

  const { normalizedScene, offset, uniformScale } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const clonedMaterials: THREE.Material[] = [];

    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Avoid shadow-map self-shadowing / shadow acne shimmer on curved metallic dials;
        // grounding is handled cleanly by <ContactShadows>.
        obj.castShadow = false;
        obj.receiveShadow = false;

        if (obj.material instanceof THREE.MeshStandardMaterial) {
          // Clone OLED_PhoneApp_Screen so we never mutate cached GLTF materials,
          // and soften extreme mirror-like dial reflections on Era 1 slightly to prevent
          // single-pixel specular shimmer during slow orbits.
          if (obj.material.name === 'OLED_PhoneApp_Screen') {
            const matClone = obj.material.clone();
            clonedMaterials.push(matClone);
            obj.material = matClone;
          } else if (era.id === 'era-1' && obj.material.name === 'Aged_Silver') {
            const matClone = obj.material.clone();
            matClone.roughness = Math.max(matClone.roughness, 0.34);
            matClone.envMapIntensity = 0.72;
            clonedMaterials.push(matClone);
            obj.material = matClone;
          } else if (era.id === 'era-1' && obj.material.name === 'Tarnished_Metal') {
            const matClone = obj.material.clone();
            matClone.envMapIntensity = 0.75;
            clonedMaterials.push(matClone);
            obj.material = matClone;
          }
        }
      }
    });

    clonedMaterialsRef.current = clonedMaterials;

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();
    box.getCenter(center);
    box.getBoundingSphere(sphere);

    const safeRadius = Math.max(sphere.radius, 0.001);
    const scale = (targetBoundingRadius / safeRadius) * era.scaleMultiplier;

    return {
      normalizedScene: cloned,
      offset: [-center.x, -center.y, -center.z] as [number, number, number],
      uniformScale: scale,
    };
  }, [gltf.scene, era.id, era.scaleMultiplier, targetBoundingRadius]);

  // Bind continuous morphing CanvasTexture onto `OLED_PhoneApp_Screen` for Era 5
  useEffect(() => {
    if (era.id !== 'era-5') {
      return;
    }

    let screenMat: THREE.MeshStandardMaterial | null = null;
    normalizedScene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial &&
        obj.material.name === 'OLED_PhoneApp_Screen'
      ) {
        screenMat = obj.material;
      }
    });

    if (!screenMat) return;
    const mat = screenMat as THREE.MeshStandardMaterial;

    originalScreenMapsRef.current = {
      material: mat,
      map: mat.map,
      emissiveMap: mat.emissiveMap,
      emissiveIntensity: mat.emissiveIntensity,
    };

    const baseImage = (mat.map?.image as CanvasImageSource | undefined) ?? null;
    const handle = createCallFlowScreenTexture(baseImage);
    screenTextureRef.current = handle;

    // Bind dynamic morph texture immediately so crossfade happens smoothly with zero snap
    mat.map = handle.texture;
    mat.emissiveMap = handle.texture;
    mat.emissiveIntensity = 1.05;
    mat.needsUpdate = true;

    lastCanvasDrawRef.current = -1;
    lastRenderedBlendRef.current = -1;

    return () => {
      if (originalScreenMapsRef.current) {
        const orig = originalScreenMapsRef.current;
        orig.material.map = orig.map;
        orig.material.emissiveMap = orig.emissiveMap;
        orig.material.emissiveIntensity = orig.emissiveIntensity;
        orig.material.needsUpdate = true;
      }
      handle.dispose();
      screenTextureRef.current = null;
      originalScreenMapsRef.current = null;
    };
  }, [era.id, normalizedScene]);

  useEffect(() => {
    const mats = clonedMaterialsRef.current;
    return () => {
      for (const m of mats) {
        m.dispose();
      }
    };
  }, [normalizedScene]);

  useFrame((state) => {
    if (era.id !== 'era-5') return;
    const orig = originalScreenMapsRef.current;
    const handle = screenTextureRef.current;
    if (!orig || !handle) return;

    const blend = heroBlendRef.current;
    const elapsed = state.clock.elapsedTime;
    const blendChanged = Math.abs(blend - lastRenderedBlendRef.current) > 0.008;
    const shouldAnimateLive = blend > 0.78 && elapsed - lastCanvasDrawRef.current > 0.09;

    if (blendChanged || shouldAnimateLive || lastCanvasDrawRef.current < 0) {
      lastCanvasDrawRef.current = elapsed;
      lastRenderedBlendRef.current = blend;
      handle.renderFrame(elapsed, blend);
      orig.material.emissiveIntensity = 1.0 + blend * 0.2;
    }
  });

  return (
    <group rotation={[era.pitchOffset, era.yawOffset, era.rollOffset]}>
      <group scale={uniformScale}>
        <primitive object={normalizedScene} position={offset} />
      </group>
    </group>
  );
}
