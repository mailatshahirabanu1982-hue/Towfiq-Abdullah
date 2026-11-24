import {
  ArrowUp,
  ChevronDown,
  Crosshair,
  Plus,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { TouchEvent, useRef, useState } from 'react';
import { ClueDefinition } from '../game/types';

interface MobileControlsProps {
  nearbyClue: ClueDefinition | null;
  medkits: number;
  canHeal: boolean;
  isCrouching: boolean;
  inCover: boolean;
  onMove: (forward: number, right: number, sprint: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFire: (firing: boolean) => void;
  onJump: () => void;
  onReload: () => void;
  onScan: () => void;
  onHeal: () => void;
  onToggleCrouch: () => void;
}

export function MobileControls({
  nearbyClue,
  medkits,
  canHeal,
  isCrouching,
  inCover,
  onMove,
  onLookDelta,
  onFire,
  onJump,
  onReload,
  onScan,
  onHeal,
  onToggleCrouch,
}: MobileControlsProps) {
  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const stickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const maxRadius = 36;

  const updateStickFromTouch = (clientX: number, clientY: number) => {
    const el = stickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    const normX = dx / maxRadius;
    const normY = -dy / maxRadius;
    const sprint = dist >= maxRadius * 0.82;
    onMove(normY, normX, sprint);
  };

  const handleStickStart = (e: TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickTouchId.current !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    stickTouchId.current = t.identifier;
    updateStickFromTouch(t.clientX, t.clientY);
  };

  const handleStickMove = (e: TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === stickTouchId.current) {
        updateStickFromTouch(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleStickEnd = (e: TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId.current) {
        stickTouchId.current = null;
        setKnobOffset({ x: 0, y: 0 });
        onMove(0, 0, false);
        break;
      }
    }
  };

  const handleLookStart = (e: TouchEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    lookTouchId.current = t.identifier;
    lastLookPos.current = { x: t.clientX, y: t.clientY };
  };

  const handleLookMove = (e: TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        onLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookEnd = (e: TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <>
      {/* Right-half horizontal touch look surface */}
      <div
        aria-label="Touch look area"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
        className="fixed inset-y-14 right-0 w-1/2 z-10 touch-none pointer-events-auto"
      />

      {/* Bottom-Left Horizontal Thumbstick */}
      <div
        ref={stickBaseRef}
        aria-label="Movement thumbstick"
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
        className="fixed bottom-4 left-4 z-20 w-26 h-26 rounded-full border border-[#F59E0B]/45 bg-[#0C0D12]/75 flex items-center justify-center touch-none pointer-events-auto"
      >
        <div
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
          className="w-10 h-10 rounded-full bg-[#F59E0B]/85 border border-white/60 shadow-lg"
        />
      </div>

      {/* Bottom-Right Horizontal Action Cluster */}
      <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-2 touch-none pointer-events-auto">
        {nearbyClue && (
          <button
            type="button"
            onTouchStart={(e) => {
              e.stopPropagation();
              onScan();
            }}
            onClick={onScan}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-md bg-[#F59E0B] text-[#0C0D12] font-display text-sm font-bold shadow-lg whitespace-nowrap"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan</span>
          </button>
        )}

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            aria-label={isCrouching ? 'Stand up' : 'Sit down and take cover'}
            onTouchStart={(e) => {
              e.stopPropagation();
              onToggleCrouch();
            }}
            onClick={onToggleCrouch}
            className={`w-11 h-11 rounded-full border flex flex-col items-center justify-center ${
              isCrouching
                ? inCover
                  ? 'border-[#22C55E] bg-[#22C55E]/25 text-[#4ADE80]'
                  : 'border-[#F59E0B] bg-[#F59E0B]/25 text-[#FCD34D]'
                : 'border-white/25 bg-[#0C0D12]/80 text-[#F4F4F5] active:bg-[#27272A]'
            }`}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isCrouching ? 'rotate-180' : ''
              }`}
            />
            <span className="text-[8px] font-mono leading-none font-bold">
              {isCrouching ? 'UP' : 'HIDE'}
            </span>
          </button>

          <button
            type="button"
            aria-label="Use medicine"
            disabled={!canHeal}
            onTouchStart={(e) => {
              e.stopPropagation();
              onHeal();
            }}
            onClick={onHeal}
            className={`relative w-11 h-11 rounded-full border flex items-center justify-center ${
              canHeal
                ? 'border-[#22C55E] bg-[#0C0D12]/85 text-[#22C55E] active:bg-[#22C55E]/25'
                : 'border-white/15 bg-[#0C0D12]/60 text-[#71717A]'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#0C0D12] border border-white/20 text-[10px] font-mono text-[#F4F4F5] leading-4 text-center">
              {medkits}
            </span>
          </button>

          <button
            type="button"
            aria-label="Reload weapon"
            onTouchStart={(e) => {
              e.stopPropagation();
              onReload();
            }}
            onClick={onReload}
            className="w-11 h-11 rounded-full border border-white/25 bg-[#0C0D12]/80 text-[#F4F4F5] flex items-center justify-center active:bg-[#27272A]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Jump"
            onTouchStart={(e) => {
              e.stopPropagation();
              onJump();
            }}
            onClick={onJump}
            className="w-11 h-11 rounded-full border border-white/25 bg-[#0C0D12]/80 text-[#F4F4F5] flex items-center justify-center active:bg-[#27272A]"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Fire weapon"
            onTouchStart={(e) => {
              e.stopPropagation();
              onFire(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onFire(false);
            }}
            onTouchCancel={(e) => {
              e.stopPropagation();
              onFire(false);
            }}
            className="w-15 h-15 rounded-full border-2 border-[#F59E0B] bg-[#F59E0B]/25 text-[#F4F4F5] flex items-center justify-center active:bg-[#F59E0B]/65"
          >
            <Crosshair className="w-7 h-7 text-[#FDE68A]" />
          </button>
        </div>
      </div>
    </>
  );
}
