import { useEffect, useRef } from 'react';
import { RadarSnapshot } from '../game/types';

interface RadarMinimapProps {
  radar: RadarSnapshot;
  compact: boolean;
}

const RADAR_RANGE = 40;

export function RadarMinimap({ radar, compact }: RadarMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const widthPx = compact ? 104 : 144;
  const heightPx = compact ? 86 : 118;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(widthPx * dpr);
    const targetH = Math.round(heightPx * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);

    const cx = widthPx / 2;
    const cy = heightPx / 2;
    const halfW = widthPx / 2 - 4;
    const halfH = heightPx / 2 - 4;
    const scaleRadius = Math.min(halfW, halfH);

    // Classic GTA-style rectangular rounded GPS minimap
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(3, 3, widthPx - 6, heightPx - 6, 7);
    ctx.fillStyle = 'rgba(12, 13, 18, 0.9)';
    ctx.fill();
    ctx.clip();

    // Subtle city block street grid lines
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = -2; gx <= 2; gx++) {
      const x = cx + gx * (widthPx / 5);
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.lineTo(x, heightPx - 3);
      ctx.stroke();
    }
    for (let gy = -2; gy <= 2; gy++) {
      const y = cy + gy * (heightPx / 5);
      ctx.beginPath();
      ctx.moveTo(3, y);
      ctx.lineTo(widthPx - 3, y);
      ctx.stroke();
    }

    // Player forward sight cone
    ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, scaleRadius * 0.95, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.closePath();
    ctx.fill();

    // Rotate world coordinates into player-heading space (camera forward = up)
    const cosY = Math.cos(radar.playerYaw);
    const sinY = Math.sin(radar.playerYaw);

    const toRadarXY = (wx: number, wz: number) => {
      const dx = wx - radar.playerX;
      const dz = wz - radar.playerZ;
      const rx = dx * cosY - dz * sinY;
      const ry = dx * sinY + dz * cosY;
      return {
        px: (rx / RADAR_RANGE) * halfW,
        py: (ry / RADAR_RANGE) * halfH,
        worldDist: Math.hypot(dx, dz),
      };
    };

    // North indicator on perimeter
    const nX = Math.max(10, Math.min(widthPx - 10, cx + Math.sin(radar.playerYaw) * (halfW - 7)));
    const nY = Math.max(10, Math.min(heightPx - 10, cy - Math.cos(radar.playerYaw) * (halfH - 7)));
    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nX, nY);

    // Draw POIs
    for (const poi of radar.pois) {
      const { px, py, worldDist } = toRadarXY(poi.x, poi.z);

      if (
        (poi.kind === 'drone' ||
          poi.kind === 'enforcer' ||
          poi.kind === 'medkit') &&
        worldDist > RADAR_RANGE
      ) {
        continue;
      }

      const maxX = halfW - 6;
      const maxY = halfH - 6;
      const clamped = Math.abs(px) > maxX || Math.abs(py) > maxY;
      const drawX = cx + Math.max(-maxX, Math.min(maxX, px));
      const drawY = cy + Math.max(-maxY, Math.min(maxY, py));

      if (poi.kind === 'clue') {
        const s = clamped ? 3.5 : 4.2;
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - s);
        ctx.lineTo(drawX + s, drawY);
        ctx.lineTo(drawX, drawY + s);
        ctx.lineTo(drawX - s, drawY);
        ctx.closePath();
        ctx.fill();
      } else if (poi.kind === 'medkit') {
        ctx.fillStyle = poi.color;
        ctx.fillRect(drawX - 3.5, drawY - 1.2, 7, 2.4);
        ctx.fillRect(drawX - 1.2, drawY - 3.5, 2.4, 7);
      } else if (poi.kind === 'door') {
        ctx.fillStyle = poi.color;
        ctx.fillRect(drawX - 4, drawY - 2, 8, 4);
      } else if (poi.kind === 'boss') {
        ctx.strokeStyle = poi.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, poi.kind === 'drone' ? 3 : 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Center Player Arrow
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Outer GTA GPS frame border
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(3, 3, widthPx - 6, heightPx - 6, 7);
    ctx.stroke();
  }, [radar, widthPx, heightPx]);

  return (
    <div className="flex flex-col items-center gap-1 pointer-events-none">
      <canvas
        ref={canvasRef}
        style={{ width: widthPx, height: heightPx }}
        aria-label="GTA-style GPS radar showing player, clues, medkits, and enemies"
      />
      <div className="flex items-center gap-2 text-[10px] font-mono text-[#A1A1AA] bg-[#0C0D12]/88 border border-[#F59E0B]/25 rounded px-2 py-0.5">
        <span className="text-[#F59E0B]">CLUE</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#F43F5E]">FOE</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#22C55E]">MED</span>
      </div>
    </div>
  );
}
