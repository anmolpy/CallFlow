import { useGLTF } from '@react-three/drei';

export const DRACO_DECODER_PATH = '/draco/';

// Configure local Draco decoder path once at module evaluation so all
// Draco-compressed GLB models decode offline without CDN requests.
useGLTF.setDecoderPath(DRACO_DECODER_PATH);

export interface EraConfig {
  id: string;
  index: number;
  eraNumber: string;
  years: string;
  hardwareName: string;
  modelUrl: string;
  yawOffset: number;
  pitchOffset: number;
  rollOffset: number;
  scaleMultiplier: number;
  orbitRangeDeg: [number, number];
  elevationDeg: number;
  endElevationDeg?: number;
}

export const TELEPHONE_ERAS: EraConfig[] = [
  {
    id: 'era-1',
    index: 0,
    eraNumber: '01',
    years: '1900s–1920s',
    hardwareName: 'Ericsson "Eiffel Tower" Magneto',
    modelUrl: '/models/vintage_landline_phone.optimized.glb',
    yawOffset: 0.05,
    pitchOffset: 0.04,
    rollOffset: 0,
    scaleMultiplier: 0.96,
    orbitRangeDeg: [-58, 56],
    elevationDeg: 10,
  },
  {
    id: 'era-2',
    index: 1,
    eraNumber: '02',
    years: '1950s–1960s',
    hardwareName: 'Western Electric Model 500',
    modelUrl: '/models/model500_optimized.glb',
    yawOffset: 0.22,
    pitchOffset: 0.14,
    rollOffset: 0,
    scaleMultiplier: 1.0,
    orbitRangeDeg: [-54, 62],
    elevationDeg: 18,
  },
  {
    id: 'era-3',
    index: 2,
    eraNumber: '03',
    years: '1970s–1980s',
    hardwareName: 'Western Electric Model 2500',
    modelUrl: '/models/model2500_optimized.glb',
    yawOffset: -0.18,
    pitchOffset: 0.14,
    rollOffset: 0,
    scaleMultiplier: 1.0,
    orbitRangeDeg: [-60, 54],
    elevationDeg: 18,
  },
  {
    id: 'era-4',
    index: 3,
    eraNumber: '04',
    years: '1980s–1990s',
    hardwareName: 'Motorola DynaTAC 8000X',
    modelUrl: '/models/dynatac_highres.glb',
    yawOffset: 0.12,
    pitchOffset: 0.03,
    rollOffset: 0,
    scaleMultiplier: 0.92,
    orbitRangeDeg: [-58, 56],
    elevationDeg: 8,
  },
  {
    id: 'era-5',
    index: 4,
    eraNumber: '05',
    years: 'Modern Era',
    hardwareName: 'Smartphone + CallFlow',
    modelUrl: '/models/iphone16_normal.glb',
    yawOffset: 0,
    pitchOffset: 0,
    rollOffset: 0,
    scaleMultiplier: 1.06,
    // Enter from a 3/4 rear/side angle and sweep continuously toward the front screen
    orbitRangeDeg: [-145, -44],
    elevationDeg: 20,
    endElevationDeg: 9,
  },
];

// Scroll timeline partitions across [0, 1] for the sticky 3D track.
// Eras 1–5 span [0, 0.80] (0.16 each); [0.80, 1.00] orbits the smartphone into the Hero.
export const ERA_SCROLL_SPAN = 0.16;
export const HERO_TRANSITION_START = 0.80;

export function getTargetEraIndex(progress: number): number {
  if (progress >= HERO_TRANSITION_START) {
    return TELEPHONE_ERAS.length - 1;
  }
  const idx = Math.floor(Math.max(0, progress) / ERA_SCROLL_SPAN);
  return Math.min(idx, TELEPHONE_ERAS.length - 1);
}

export function preloadRemainingModels(): void {
  for (let i = 1; i < TELEPHONE_ERAS.length; i += 1) {
    useGLTF.preload(TELEPHONE_ERAS[i].modelUrl);
  }
}

// Preload Era 1 immediately at module load for fast first paint.
useGLTF.preload(TELEPHONE_ERAS[0].modelUrl);
