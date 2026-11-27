import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ERA_SCROLL_SPAN,
  HERO_TRANSITION_START,
  TELEPHONE_ERAS,
  getTargetEraIndex,
  type EraConfig,
} from '../eras';
import { MotionBlurEffect } from './MotionBlurEffect';
import { NormalizedModel } from './NormalizedModel';

interface PhoneStageCanvasProps {
  scrollProgressRef: React.MutableRefObject<number>;
  targetEraIndex: number;
  jumpVersion: number;
  reducedMotion: boolean;
  onDisplayedEraChange?: (eraIndex: number) => void;
}

function easeInOutExpo(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

function easeInOutExpoVelocityNorm(x: number): number {
  if (x <= 0 || x >= 1) return 0;
  return x < 0.5 ? Math.pow(2, 20 * x - 10) : Math.pow(2, -20 * x + 10);
}

function smoothstep(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function PedestalPlaceholder() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.8;
    }
  });
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.68, 0.02, 16, 64]} />
      <meshStandardMaterial color="#161211" roughness={0.35} metalness={0.7} />
    </mesh>
  );
}

interface SpinState {
  active: boolean;
  startTimeMs: number;
  durationMs: number;
  direction: number;
  toEra: number;
  swapped: boolean;
}

interface StageRigProps {
  scrollProgressRef: React.MutableRefObject<number>;
  targetEraIndex: number;
  jumpVersion: number;
  reducedMotion: boolean;
  onDisplayedEraChange?: (eraIndex: number) => void;
}

function StageRig({
  scrollProgressRef,
  targetEraIndex,
  jumpVersion,
  reducedMotion,
  onDisplayedEraChange,
}: StageRigProps) {
  const { gl, scene, camera, size } = useThree();
  const [displayedEraIndex, setDisplayedEraIndex] = useState<number>(targetEraIndex);
  const [warmMountReady, setWarmMountReady] = useState<boolean>(false);

  const displayedEraRef = useRef<number>(targetEraIndex);
  const latestTargetEraRef = useRef<number>(targetEraIndex);
  const modelGroupRef = useRef<THREE.Group>(null);
  const readyGroupsRef = useRef<Map<number, THREE.Group>>(new Map());
  const warmedErasRef = useRef<Set<number>>(new Set([0]));
  const warmTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastWarmTimestampRef = useRef<number>(0);

  const smoothProgressRef = useRef<number>(scrollProgressRef.current);
  const heroBlendRef = useRef<number>(0);
  const blurStrengthRef = useRef<number>(0);
  const spinDirectionRef = useRef<number>(1);
  const pointerRef = useRef<{ x: number; y: number; smoothX: number; smoothY: number }>({
    x: 0,
    y: 0,
    smoothX: 0,
    smoothY: 0,
  });

  const spinRef = useRef<SpinState>({
    active: false,
    startTimeMs: 0,
    durationMs: 540,
    direction: 1,
    toEra: targetEraIndex,
    swapped: false,
  });

  const lookAtVec = useRef(new THREE.Vector3());

  const handleSceneReady = useCallback((eraIndex: number, group: THREE.Group) => {
    readyGroupsRef.current.set(eraIndex, group);
  }, []);

  // Mount Eras 2–5 hidden in the background shortly after Era 1 first paint so
  // Box3 normalization, texture uploads, transmission passes, and shaders warm up ahead of scroll.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWarmMountReady(true);
    }, 260);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (warmTargetRef.current) {
        warmTargetRef.current.dispose();
        warmTargetRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (window.innerWidth === 0 || window.innerHeight === 0) return;
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  // Snap smoothProgress immediately when user triggers a direct jump (Evolution / era bullet / Skip)
  useEffect(() => {
    if (jumpVersion === 0) return;
    smoothProgressRef.current = scrollProgressRef.current;
  }, [jumpVersion, scrollProgressRef]);

  useEffect(() => {
    latestTargetEraRef.current = targetEraIndex;

    if (targetEraIndex === displayedEraRef.current && !spinRef.current.active) {
      return;
    }

    if (reducedMotion) {
      spinRef.current.active = false;
      blurStrengthRef.current = 0;
      displayedEraRef.current = targetEraIndex;
      setDisplayedEraIndex(targetEraIndex);
      onDisplayedEraChange?.(targetEraIndex);
      return;
    }

    const spin = spinRef.current;
    if (!spin.active) {
      const dir = targetEraIndex >= displayedEraRef.current ? 1 : -1;
      spin.active = true;
      spin.startTimeMs = performance.now();
      spin.durationMs = 540;
      spin.direction = dir;
      spin.toEra = targetEraIndex;
      spin.swapped = false;
      spinDirectionRef.current = dir;
    } else if (!spin.swapped) {
      spin.toEra = targetEraIndex;
    }
  }, [targetEraIndex, reducedMotion, onDisplayedEraChange]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.12);
    const isDesktop = size.width >= 900;
    const baseFov = isDesktop ? 38 : 46;

    // Staggered offscreen GPU warm-up (1 hidden model per ~80ms when idle)
    // Forces transmission render target allocation, clearcoat/PBR shader compile,
    // VBO upload, and CanvasTexture initialization without flashing on screen.
    if (
      warmMountReady &&
      !spinRef.current.active &&
      warmedErasRef.current.size < TELEPHONE_ERAS.length
    ) {
      const now = performance.now();
      if (now - lastWarmTimestampRef.current > 80) {
        for (const [idx, group] of readyGroupsRef.current.entries()) {
          if (!warmedErasRef.current.has(idx)) {
            lastWarmTimestampRef.current = now;
            warmedErasRef.current.add(idx);

            if (!warmTargetRef.current) {
              warmTargetRef.current = new THREE.WebGLRenderTarget(64, 64, {
                type: THREE.HalfFloatType,
              });
            }

            const prevVisible = group.visible;
            const prevTarget = gl.getRenderTarget();
            group.visible = true;
            gl.setRenderTarget(warmTargetRef.current);
            gl.render(scene, camera);
            gl.setRenderTarget(prevTarget);
            group.visible = prevVisible;

            if (warmedErasRef.current.size >= TELEPHONE_ERAS.length && warmTargetRef.current) {
              warmTargetRef.current.dispose();
              warmTargetRef.current = null;
            }
            break;
          }
        }
      }
    }

    const rawProgress = scrollProgressRef.current;
    smoothProgressRef.current = THREE.MathUtils.damp(
      smoothProgressRef.current,
      rawProgress,
      reducedMotion ? 30 : 14,
      dt,
    );
    if (Math.abs(smoothProgressRef.current - rawProgress) < 0.0008) {
      smoothProgressRef.current = rawProgress;
    }
    const p = smoothProgressRef.current;

    const derivedTarget = getTargetEraIndex(rawProgress);
    if (derivedTarget !== latestTargetEraRef.current) {
      latestTargetEraRef.current = derivedTarget;
    }

    pointerRef.current.smoothX = THREE.MathUtils.damp(
      pointerRef.current.smoothX,
      pointerRef.current.x,
      7,
      dt,
    );
    pointerRef.current.smoothY = THREE.MathUtils.damp(
      pointerRef.current.smoothY,
      pointerRef.current.y,
      7,
      dt,
    );

    // Hero transition blend [0.80 -> 0.94]
    const rawHero = THREE.MathUtils.clamp((p - HERO_TRANSITION_START) / 0.14, 0, 1);
    const heroBlend =
      displayedEraRef.current === TELEPHONE_ERAS.length - 1 ? smoothstep(rawHero) : 0;
    heroBlendRef.current = heroBlend;

    // Whip-spin update using wall-clock time
    let fovOffset = 0;
    const spin = spinRef.current;

    if (spin.active && !reducedMotion) {
      const elapsedMs = Math.max(0, performance.now() - spin.startTimeMs);
      const u = Math.min(elapsedMs / spin.durationMs, 1);
      const eased = easeInOutExpo(u);
      const normVel = easeInOutExpoVelocityNorm(u);

      if (u >= 0.5 && !spin.swapped) {
        spin.swapped = true;
        warmedErasRef.current.add(spin.toEra);
        displayedEraRef.current = spin.toEra;
        setDisplayedEraIndex(spin.toEra);
        onDisplayedEraChange?.(spin.toEra);
      }

      if (modelGroupRef.current) {
        if (u < 0.5) {
          modelGroupRef.current.rotation.y = spin.direction * eased * Math.PI * 2;
        } else {
          modelGroupRef.current.rotation.y = spin.direction * (eased - 1) * Math.PI * 2;
        }
      }

      blurStrengthRef.current = normVel;
      fovOffset = normVel * 10; // 38° -> 48° -> 38°

      if (u >= 1) {
        spin.active = false;
        blurStrengthRef.current = 0;
        fovOffset = 0;
        if (modelGroupRef.current) {
          modelGroupRef.current.rotation.y = 0;
        }
        if (displayedEraRef.current !== latestTargetEraRef.current) {
          const nextDir = latestTargetEraRef.current >= displayedEraRef.current ? 1 : -1;
          spin.active = true;
          spin.startTimeMs = performance.now();
          spin.durationMs = 520;
          spin.direction = nextDir;
          spin.toEra = latestTargetEraRef.current;
          spin.swapped = false;
          spinDirectionRef.current = nextDir;
        }
      }
    } else {
      blurStrengthRef.current = 0;
      if (modelGroupRef.current) {
        modelGroupRef.current.rotation.y = 0;
      }
    }

    // Camera inspection orbit + continuous orbital entry into CallFlow Hero
    const activeEra: EraConfig = TELEPHONE_ERAS[displayedEraRef.current];
    const eraStart = displayedEraRef.current * ERA_SCROLL_SPAN;
    const eraLocal = THREE.MathUtils.clamp((p - eraStart) / ERA_SCROLL_SPAN, 0, 1);

    const [startDeg, endDeg] = activeEra.orbitRangeDeg;
    const orbitAzimuth = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(startDeg, endDeg, eraLocal),
    );
    const endElev = activeEra.endElevationDeg ?? activeEra.elevationDeg;
    const orbitElevation = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(activeEra.elevationDeg, endElev, eraLocal) +
        Math.sin(eraLocal * Math.PI) * 3.5,
    );

    const parallaxAzimuth = reducedMotion
      ? 0
      : pointerRef.current.smoothX * 0.1 * (1 - heroBlend * 0.7);
    const parallaxElevation = reducedMotion
      ? 0
      : pointerRef.current.smoothY * 0.05 * (1 - heroBlend * 0.7);

    const targetAzimuth =
      THREE.MathUtils.lerp(orbitAzimuth, 0, heroBlend) + parallaxAzimuth;
    const targetElevation =
      THREE.MathUtils.lerp(orbitElevation, 0.02, heroBlend) + parallaxElevation;

    const orbitDistance = isDesktop ? 4.1 : 5.05;
    const heroDistance = isDesktop ? 3.85 : 5.65;
    const radius = THREE.MathUtils.lerp(orbitDistance, heroDistance, heroBlend);

    const orbitLookX = 0;
    const heroLookX = isDesktop ? -0.92 : 0;
    const orbitLookY = isDesktop ? -0.05 : -0.18;
    const heroLookY = isDesktop ? 0.04 : -0.92;
    const lookX = THREE.MathUtils.lerp(orbitLookX, heroLookX, heroBlend);
    const lookY = THREE.MathUtils.lerp(orbitLookY, heroLookY, heroBlend);

    lookAtVec.current.set(lookX, lookY, 0);

    const cosElev = Math.cos(targetElevation);
    camera.position.set(
      lookX + radius * Math.sin(targetAzimuth) * cosElev,
      lookY + radius * Math.sin(targetElevation),
      radius * Math.cos(targetAzimuth) * cosElev,
    );
    camera.lookAt(lookAtVec.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = baseFov + fovOffset;
      if (Math.abs(camera.fov - desiredFov) > 0.01) {
        camera.fov = desiredFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.48} color="#fffaf8" />
      <directionalLight position={[4.5, 6.2, 5.2]} intensity={2.15} color="#fff9f2" />
      <directionalLight position={[-4.5, 2.2, 3.0]} intensity={1.05} color="#e2e8f0" />
      <directionalLight position={[0, 3.5, -5.0]} intensity={1.15} color="#f8fafc" />

      {/* Offline studio HDRI rig tuned for warm gallery #f9f3f2 reflections */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#2b2523']} />
        <group rotation={[-Math.PI / 5, 0, 0]}>
          <Lightformer
            form="rect"
            intensity={2.4}
            color="#ffffff"
            position={[0, 4.5, 2.5]}
            scale={[9, 3.5, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.5}
            color="#f5ede8"
            position={[-5, 1.5, 1]}
            scale={[4, 7, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            color="#fff7ed"
            position={[5, 2, 2]}
            scale={[4, 6, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#f9f3f2"
            position={[0, -4, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[10, 10, 1]}
          />
        </group>
      </Environment>

      <group ref={modelGroupRef}>
        {TELEPHONE_ERAS.map((era, idx) => {
          const isActive = idx === displayedEraIndex;
          if (!isActive && !warmMountReady) {
            return null;
          }
          return (
            <Suspense key={era.id} fallback={isActive ? <PedestalPlaceholder /> : null}>
              <NormalizedModel
                era={era}
                visible={isActive}
                heroBlendRef={heroBlendRef}
                onSceneReady={handleSceneReady}
              />
            </Suspense>
          );
        })}
      </group>

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.28}
        scale={6.4}
        blur={2.4}
        far={3.2}
        color="#2a201e"
      />

      <MotionBlurEffect blurStrengthRef={blurStrengthRef} spinDirectionRef={spinDirectionRef} />
    </>
  );
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function PhoneStageCanvas({
  scrollProgressRef,
  targetEraIndex,
  jumpVersion,
  reducedMotion,
  onDisplayedEraChange,
}: PhoneStageCanvasProps) {
  const activeEra = TELEPHONE_ERAS[targetEraIndex];

  return (
    <CanvasErrorBoundary
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[#f9f3f2] text-[#161211]">
          <div className="border-t border-[#161211]/15 pt-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#625957]">
              {activeEra.years}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#161211]">
              {activeEra.hardwareName}
            </p>
          </div>
        </div>
      }
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 38, position: [0, 0.25, 4.1], near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.04,
          powerPreference: 'high-performance',
        }}
        className="h-full w-full"
      >
        <StageRig
          scrollProgressRef={scrollProgressRef}
          targetEraIndex={targetEraIndex}
          jumpVersion={jumpVersion}
          reducedMotion={reducedMotion}
          onDisplayedEraChange={onDisplayedEraChange}
        />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
