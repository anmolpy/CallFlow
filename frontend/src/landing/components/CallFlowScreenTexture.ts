import * as THREE from 'three';

const SCREEN_WIDTH = 512;
const SCREEN_HEIGHT = 1108;

export interface CallFlowCanvasHandle {
  texture: THREE.CanvasTexture;
  renderFrame: (elapsedSeconds: number, heroBlend: number) => void;
  dispose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generates an offscreen CanvasTexture mapped onto the iPhone 16 `OLED_PhoneApp_Screen`
 * material, smoothly crossfading from the native phone keypad into the live CallFlow
 * mobile console during the Hero orbiting transition.
 */
export function createCallFlowScreenTexture(
  baseKeypadImage?: CanvasImageSource | null,
): CallFlowCanvasHandle {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Offscreen buffer for the CallFlow UI layer so we can smoothly alpha-blend & reveal it
  const uiCanvas = document.createElement('canvas');
  uiCanvas.width = SCREEN_WIDTH;
  uiCanvas.height = SCREEN_HEIGHT;
  const uiCtx = uiCanvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  // GLTF textures use flipY = false to match TEXCOORD_0 orientation.
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const drawCallFlowLayer = (elapsedSeconds: number, morph: number) => {
    if (!uiCtx) return;

    const bgGrad = uiCtx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    bgGrad.addColorStop(0, '#070d1f');
    bgGrad.addColorStop(0.45, '#0b1630');
    bgGrad.addColorStop(1, '#060a16');
    uiCtx.fillStyle = bgGrad;
    uiCtx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const radGrad = uiCtx.createRadialGradient(256, 140, 20, 256, 140, 320);
    radGrad.addColorStop(0, 'rgba(37, 99, 235, 0.36)');
    radGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    uiCtx.fillStyle = radGrad;
    uiCtx.fillRect(0, 0, SCREEN_WIDTH, 480);

    // Status bar
    uiCtx.fillStyle = '#e2e8f0';
    uiCtx.font = '600 22px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('9:41', 42, 54);

    // Dynamic Island pill
    uiCtx.fillStyle = '#020617';
    drawRoundedRect(uiCtx, 186, 28, 140, 36, 18);
    uiCtx.fill();

    // Signal & battery
    uiCtx.fillStyle = '#94a3b8';
    uiCtx.fillRect(410, 38, 6, 14);
    uiCtx.fillRect(420, 34, 6, 18);
    uiCtx.fillRect(430, 30, 6, 22);
    uiCtx.strokeStyle = '#cbd5e1';
    uiCtx.lineWidth = 2;
    drawRoundedRect(uiCtx, 448, 35, 34, 16, 4);
    uiCtx.stroke();
    uiCtx.fillStyle = '#34d399';
    drawRoundedRect(uiCtx, 451, 38, 24, 10, 2);
    uiCtx.fill();

    // App Header
    uiCtx.fillStyle = '#2563eb';
    drawRoundedRect(uiCtx, 32, 92, 46, 46, 14);
    uiCtx.fill();

    uiCtx.fillStyle = '#ffffff';
    uiCtx.font = '700 24px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('CF', 40, 123);

    uiCtx.fillStyle = '#f8fafc';
    uiCtx.font = '700 28px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('CallFlow', 92, 118);

    uiCtx.fillStyle = '#94a3b8';
    uiCtx.font = '500 17px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('Support Queue Console', 92, 140);

    const pulse = 0.65 + 0.35 * Math.sin(elapsedSeconds * 3.2);
    uiCtx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    drawRoundedRect(uiCtx, 384, 100, 96, 32, 16);
    uiCtx.fill();
    uiCtx.fillStyle = `rgba(52, 211, 153, ${pulse.toFixed(2)})`;
    uiCtx.beginPath();
    uiCtx.arc(404, 116, 5, 0, Math.PI * 2);
    uiCtx.fill();
    uiCtx.fillStyle = '#6ee7b7';
    uiCtx.font = '700 15px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('LIVE', 418, 121);

    // KPI Row
    const kpis = [
      { label: 'QUEUED', value: '04', color: '#38bdf8' },
      { label: 'ACTIVE', value: '12', color: '#34d399' },
      { label: 'AVG HANDLE', value: '3m 18s', color: '#a78bfa' },
    ];
    kpis.forEach((kpi, idx) => {
      const x = 32 + idx * 154;
      uiCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      uiCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      uiCtx.lineWidth = 1.5;
      drawRoundedRect(uiCtx, x, 168, 140, 88, 18);
      uiCtx.fill();
      uiCtx.stroke();

      uiCtx.fillStyle = '#94a3b8';
      uiCtx.font = '600 13px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(kpi.label, x + 14, 196);

      uiCtx.fillStyle = kpi.color;
      uiCtx.font = '700 28px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(kpi.value, x + 14, 236);
    });

    // Active Call Card
    uiCtx.fillStyle = 'rgba(30, 58, 138, 0.28)';
    uiCtx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    uiCtx.lineWidth = 1.5;
    drawRoundedRect(uiCtx, 32, 278, 448, 224, 22);
    uiCtx.fill();
    uiCtx.stroke();

    uiCtx.fillStyle = '#60a5fa';
    uiCtx.font = '700 14px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('IN PROGRESS • CALL #CF-4821', 52, 312);

    uiCtx.fillStyle = '#f8fafc';
    uiCtx.font = '700 24px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('Maya Lin — Enterprise SLA', 52, 348);

    uiCtx.fillStyle = '#cbd5e1';
    uiCtx.font = '400 17px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('Assigned: Elena Rostova (AVAILABLE)', 52, 378);

    uiCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    drawRoundedRect(uiCtx, 52, 398, 408, 84, 14);
    uiCtx.fill();
    uiCtx.fillStyle = '#94a3b8';
    uiCtx.font = '600 13px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('LATEST NOTE', 68, 422);
    uiCtx.fillStyle = '#e2e8f0';
    uiCtx.font = '400 16px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('Verified webhook failover & rotated API', 68, 448);
    uiCtx.fillText('keys. Follow-up summary queued.', 68, 470);

    // Queued Calls Section
    uiCtx.fillStyle = '#94a3b8';
    uiCtx.font = '700 14px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('PRIORITY QUEUE', 36, 540);

    const queueItems = [
      { name: 'Devon Brooks', wait: '00:24', status: 'QUEUED', badge: '#f59e0b' },
      { name: 'Sora Takahashi', wait: '00:41', status: 'QUEUED', badge: '#38bdf8' },
      { name: 'Liam O’Connor', wait: '01:05', status: 'ROUTING', badge: '#34d399' },
    ];
    queueItems.forEach((item, idx) => {
      const y = 558 + idx * 78;
      uiCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      uiCtx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      drawRoundedRect(uiCtx, 32, y, 448, 64, 16);
      uiCtx.fill();
      uiCtx.stroke();

      uiCtx.fillStyle = '#f1f5f9';
      uiCtx.font = '600 19px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(item.name, 52, y + 32);

      uiCtx.fillStyle = '#64748b';
      uiCtx.font = '500 14px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(`Wait ${item.wait}`, 52, y + 52);

      uiCtx.fillStyle = `${item.badge}28`;
      drawRoundedRect(uiCtx, 344, y + 16, 116, 32, 16);
      uiCtx.fill();
      uiCtx.fillStyle = item.badge;
      uiCtx.font = '700 13px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(item.status, 368, y + 37);
    });

    // Agent Availability Section
    uiCtx.fillStyle = '#94a3b8';
    uiCtx.font = '700 14px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('AGENT ROSTER', 36, 822);

    const agents = [
      { name: 'Elena R.', state: 'AVAILABLE', dot: '#34d399' },
      { name: 'Marcus T.', state: 'BUSY', dot: '#f59e0b' },
      { name: 'Priya S.', state: 'AVAILABLE', dot: '#34d399' },
    ];
    agents.forEach((ag, idx) => {
      const x = 32 + idx * 154;
      uiCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      drawRoundedRect(uiCtx, x, 840, 140, 74, 16);
      uiCtx.fill();

      uiCtx.fillStyle = ag.dot;
      uiCtx.beginPath();
      uiCtx.arc(x + 22, 864, 5, 0, Math.PI * 2);
      uiCtx.fill();

      uiCtx.fillStyle = '#e2e8f0';
      uiCtx.font = '600 16px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(ag.name, x + 36, 870);

      uiCtx.fillStyle = '#94a3b8';
      uiCtx.font = '600 12px system-ui, -apple-system, sans-serif';
      uiCtx.fillText(ag.state, x + 20, 896);
    });

    // Throughput Analytics Bar Chart
    uiCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    uiCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    drawRoundedRect(uiCtx, 32, 936, 448, 120, 20);
    uiCtx.fill();
    uiCtx.stroke();

    uiCtx.fillStyle = '#94a3b8';
    uiCtx.font = '700 13px system-ui, -apple-system, sans-serif';
    uiCtx.fillText('RESOLUTION ANALYTICS (98.4% SLA)', 52, 966);

    const bars = [0.45, 0.62, 0.55, 0.78, 0.7, 0.88, 0.94, 0.82, 0.96, 0.91];
    bars.forEach((h, idx) => {
      const wave = 0.04 * Math.sin(elapsedSeconds * 2.4 + idx * 0.7) * morph;
      const barH = Math.max(12, Math.min(62, (h + wave) * 60));
      const bx = 54 + idx * 41;
      const by = 1042 - barH;
      uiCtx.fillStyle = idx >= 8 ? '#38bdf8' : '#2563eb';
      drawRoundedRect(uiCtx, bx, by, 24, barH, 6);
      uiCtx.fill();
    });

    uiCtx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    drawRoundedRect(uiCtx, 190, 1078, 132, 7, 4);
    uiCtx.fill();
  };

  const renderFrame = (elapsedSeconds: number, heroBlend: number) => {
    if (!ctx) return;

    // Smooth crossfade + subtle vertical reveal across the orbiting Hero entry
    const morph = smoothstep(0.12, 0.84, heroBlend);

    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Base layer: original iPhone keypad texture
    if (morph < 0.999) {
      if (baseKeypadImage) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(baseKeypadImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        ctx.restore();
      } else {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }
    }

    // Foreground layer: CallFlow Console smoothly fading & sliding up over the keypad
    if (morph > 0.001) {
      drawCallFlowLayer(elapsedSeconds, morph);
      ctx.save();
      ctx.globalAlpha = morph;
      const slideOffset = (1 - morph) * 28;
      ctx.drawImage(uiCanvas, 0, slideOffset, SCREEN_WIDTH, SCREEN_HEIGHT);
      ctx.restore();
    }

    texture.needsUpdate = true;
  };

  renderFrame(0, 0);

  return {
    texture,
    renderFrame,
    dispose: () => {
      texture.dispose();
    },
  };
}
