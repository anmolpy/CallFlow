import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

interface MotionBlurEffectProps {
  blurStrengthRef: React.MutableRefObject<number>;
  spinDirectionRef: React.MutableRefObject<number>;
}

const WhipSpinBlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uBlurStrength: { value: 0 },
    uSpinDirection: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uBlurStrength;
    uniform float uSpinDirection;
    varying vec2 vUv;

    void main() {
      if (uBlurStrength <= 0.0005) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 centered = vUv - vec2(0.5);
      float dist = length(centered);
      // Combine horizontal whip-streak + subtle radial burst centered on the model
      vec2 radialDir = dist > 0.0001 ? normalize(centered) * dist : vec2(0.0);
      vec2 tangentialDir = vec2(uSpinDirection, 0.0) * 0.65;
      vec2 blurVec = (radialDir * 0.45 + tangentialDir) * uBlurStrength * 0.055;

      vec4 accum = vec4(0.0);
      const int SAMPLES = 12;
      float totalWeight = 0.0;

      for (int i = 0; i < SAMPLES; i++) {
        float t = (float(i) / float(SAMPLES - 1)) - 0.5;
        float weight = 1.0 - abs(t) * 1.15;
        vec2 sampleUv = clamp(vUv + blurVec * t, vec2(0.001), vec2(0.999));
        accum += texture2D(tDiffuse, sampleUv) * weight;
        totalWeight += weight;
      }

      gl_FragColor = accum / totalWeight;
    }
  `,
};

/**
 * Renders directly to the default WebGL canvas when idle (`blur <= 0.0005`) for
 * native MSAA sharpness, and engages EffectComposer + OutputPass with radial/directional
 * whip-spin blur strictly proportional to angular velocity during era swaps.
 */
export function MotionBlurEffect({ blurStrengthRef, spinDirectionRef }: MotionBlurEffectProps) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const renderPassRef = useRef<RenderPass | null>(null);
  const blurPassRef = useRef<ShaderPass | null>(null);
  const hasWarmedRef = useRef<boolean>(false);

  const composerResources = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(
      Math.max(1, size.width),
      Math.max(1, size.height),
      {
        type: THREE.HalfFloatType,
        samples: 4,
      },
    );
    const composer = new EffectComposer(gl, target);
    const renderPass = new RenderPass(scene, camera);
    const blurPass = new ShaderPass(WhipSpinBlurShader);
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(blurPass);
    composer.addPass(outputPass);

    return { composer, renderPass, blurPass, outputPass, target };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composerRef.current = composerResources.composer;
    renderPassRef.current = composerResources.renderPass;
    blurPassRef.current = composerResources.blurPass;

    return () => {
      composerResources.composer.dispose();
      composerResources.target.dispose();
      composerResources.blurPass.dispose();
      composerResources.outputPass.dispose();
      composerRef.current = null;
      renderPassRef.current = null;
      blurPassRef.current = null;
    };
  }, [composerResources]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const dpr = gl.getPixelRatio();
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [gl, size.width, size.height]);

  useFrame(() => {
    const blur = blurStrengthRef.current;
    const composer = composerRef.current;
    const blurPass = blurPassRef.current;

    // Warm the MSAA HalfFloatType render target + post-processing shaders once on startup
    // with uBlurStrength = 0 so the first whip-spin never hitches.
    if (!hasWarmedRef.current && composer && blurPass) {
      hasWarmedRef.current = true;
      blurPass.uniforms.uBlurStrength.value = 0;
      composer.render();
      return;
    }

    if (blur <= 0.0005 || !composer || !blurPass) {
      // Strictly bypass post-processing when idle so models remain razor-sharp
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    blurPass.uniforms.uBlurStrength.value = blur;
    blurPass.uniforms.uSpinDirection.value = spinDirectionRef.current;
    composer.render();
  }, 1);

  return null;
}
