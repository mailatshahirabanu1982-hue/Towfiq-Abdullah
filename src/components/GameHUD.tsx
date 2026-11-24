import {
  ChevronDown,
  FolderOpen,
  Heart,
  Pause,
  Plus,
  Shield,
  Skull,
  Star,
  Zap,
} from 'lucide-react';
import { CLUE_DEFINITIONS } from '../game/storyData';
import { HUDState } from '../game/types';
import { RadarMinimap } from './RadarMinimap';

interface GameHUDProps {
  hud: HUDState;
  showTouchControls: boolean;
  onOpenEvidence: () => void;
  onPause: () => void;
  onLockPointer: () => void;
  onUseMedicine: () => void;
  onToggleCrouch: () => void;
}

export function GameHUD({
  hud,
  showTouchControls,
  onOpenEvidence,
  onPause,
  onLockPointer,
  onUseMedicine,
  onToggleCrouch,
}: GameHUDProps) {
  const spreadPx = Math.round(6 + hud.crosshairSpread * 16);
  const showHitMarker = hud.hitMarkerTimer > 0;
  const showDamageVignette = hud.damageFlashTimer > 0;
  const showHealVignette = hud.healFlashTimer > 0;
  const canHeal =
    hud.medkits > 0 &&
    (hud.health < hud.maxHealth || hud.shield < hud.maxShield);
  const heatStars = Math.min(5, hud.level + (hud.blastDoorUnlocked ? 1 : 0));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Damage Vignette */}
      {showDamageVignette && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(239, 68, 68, 0.55)',
          }}
        />
      )}

      {/* Heal Vignette */}
      {showHealVignette && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 85px rgba(34, 197, 94, 0.45)',
          }}
        />
      )}

      {/* Subtle crouch / cover edge tint */}
      {hud.isCrouching && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: hud.inCover
              ? 'inset 0 0 70px rgba(34, 197, 94, 0.2)'
              : 'inset 0 0 65px rgba(12, 13, 18, 0.45)',
          }}
        />
      )}

      {/* Floating 3D-Projected Hit Damage Numbers */}
      {hud.damageNumbers.map((d) => (
        <div
          key={d.id}
          aria-hidden="true"
          className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono font-bold pointer-events-none select-none whitespace-nowrap ${
            d.isKill
              ? 'text-base sm:text-lg text-[#F59E0B]'
              : 'text-sm sm:text-base text-[#FEF08A]'
          }`}
          style={{
            left: `${d.screenX * 100}%`,
            top: `${d.screenY * 100}%`,
            opacity: d.opacity,
            textShadow: '0 2px 6px rgba(12, 13, 18, 0.95)',
          }}
        >
          {d.isKill ? `-${d.amount} KILL` : `-${d.amount}`}
        </div>
      ))}

      {/* Top Row: GTA Wanted Stars, Objective & Stats + Menu & GPS Radar */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-5 flex items-start justify-between gap-2.5">
        <div className="max-w-[235px] sm:max-w-[285px] rounded-md bg-[#0C0D12]/85 border border-[#F59E0B]/30 px-2.5 py-1.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums leading-tight">
            <span className="shrink-0 text-[#F59E0B] font-bold">
              LVL {hud.level}
            </span>
            <span
              className="inline-flex items-center gap-0.5 shrink-0"
              aria-label={`Wanted level ${heatStars} of 5`}
            >
              {[1, 2, 3, 4, 5].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-3 h-3 ${
                    starIdx <= heatStars
                      ? 'text-[#F59E0B] fill-[#F59E0B]'
                      : 'text-[#3F3F46]'
                  }`}
                />
              ))}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#F4F4F5]">
            {hud.objectiveText}
          </p>
          <div className="mt-1 pt-1 border-t border-white/10 flex items-center gap-3 text-[11px] font-mono tabular-nums">
            <span className="inline-flex items-center gap-1 text-[#F4F4F5]">
              <Skull className="w-3 h-3 text-[#F43F5E]" />
              <span className="text-[#A1A1AA]">KILLS</span>
              <span className="font-bold">{hud.enemiesDefeated}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#F4F4F5]">
              <Zap className="w-3 h-3 text-[#F59E0B]" />
              <span className="text-[#A1A1AA]">DMG</span>
              <span className="font-bold">
                {hud.totalDamageDealt.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 shrink-0">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onOpenEvidence}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-md bg-[#0C0D12]/85 hover:bg-[#18181B] border border-[#F59E0B]/30 text-xs font-medium text-[#F4F4F5] whitespace-nowrap cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#F59E0B]" />
              <span>Evidence</span>
              <span className="hidden lg:inline font-mono text-[#A1A1AA]">
                [Tab]
              </span>
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause mission"
              className="inline-flex items-center justify-center px-3 py-2 min-h-[40px] min-w-[40px] rounded-md bg-[#0C0D12]/85 hover:bg-[#18181B] border border-[#F59E0B]/30 text-xs font-medium text-[#F4F4F5] cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          <RadarMinimap radar={hud.radar} compact={showTouchControls} />
        </div>
      </div>

      {/* Level Transition Banner */}
      {hud.levelBannerText && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 rounded-md bg-[#0C0D12]/92 border border-[#F59E0B]/70 px-4 py-1.5 text-center">
          <p className="font-display text-sm sm:text-base font-bold text-[#FBBF24] tracking-wide whitespace-nowrap">
            {hud.levelBannerText}
          </p>
        </div>
      )}

      {/* Top-Center Boss Health Bar */}
      {hud.bossActive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[min(360px,45vw)] rounded-md bg-[#0C0D12]/88 border border-[#F43F5E]/55 px-3.5 py-2">
          <div className="flex items-center justify-between text-xs font-display font-bold text-[#F43F5E]">
            <span className="truncate">{hud.bossName}</span>
            <span className="font-mono tabular-nums shrink-0 ml-2">
              {hud.bossHealth}/{hud.bossMaxHealth}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-[#27272A] overflow-hidden">
            <div
              className="h-full bg-[#F43F5E] transition-all duration-100"
              style={{
                width: `${Math.max(
                  0,
                  (hud.bossHealth / hud.bossMaxHealth) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Center Dynamic Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-[#FDE68A]" />
          <div
            style={{ transform: `translateY(-${spreadPx}px)` }}
            className="absolute w-0.5 h-2.5 bg-[#FDE68A]/90"
          />
          <div
            style={{ transform: `translateY(${spreadPx}px)` }}
            className="absolute w-0.5 h-2.5 bg-[#FDE68A]/90"
          />
          <div
            style={{ transform: `translateX(-${spreadPx}px)` }}
            className="absolute h-0.5 w-2.5 bg-[#FDE68A]/90"
          />
          <div
            style={{ transform: `translateX(${spreadPx}px)` }}
            className="absolute h-0.5 w-2.5 bg-[#FDE68A]/90"
          />
          {showHitMarker && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-0.5 bg-[#F43F5E] rotate-45 absolute" />
              <div className="w-5 h-0.5 bg-[#F43F5E] -rotate-45 absolute" />
            </div>
          )}
        </div>
      </div>

      {/* Contextual Prompts Below Crosshair */}
      <div className="absolute top-[63%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        {!hud.pointerLocked && !showTouchControls && (
          <button
            type="button"
            onClick={onLockPointer}
            className="pointer-events-auto px-3 py-1 rounded bg-[#0C0D12]/85 border border-[#F59E0B]/50 text-[11px] font-medium text-[#FCD34D] hover:bg-[#18181B] whitespace-nowrap cursor-pointer"
          >
            Click to Lock Aim
          </button>
        )}

        {hud.isCrouching && (
          <div
            className={`px-3 py-0.5 rounded border text-[11px] font-mono font-semibold whitespace-nowrap ${
              hud.inCover
                ? 'bg-[#0C0D12]/90 border-[#22C55E] text-[#4ADE80]'
                : 'bg-[#0C0D12]/85 border-[#F59E0B]/70 text-[#FCD34D]'
            }`}
          >
            {hud.inCover ? 'HIDDEN IN COVER' : 'CROUCHED · LOW PROFILE'}
          </div>
        )}

        {hud.nearbyClue && (
          <div className="px-3 py-1 rounded bg-[#0C0D12]/88 border border-[#F59E0B] text-[11px] font-medium text-[#F4F4F5] whitespace-nowrap">
            {showTouchControls ? (
              <span>Tap Scan · {hud.nearbyClue.title}</span>
            ) : (
              <span>
                <span className="font-mono text-[#F59E0B]">[E]</span> Scan{' '}
                {hud.nearbyClue.title}
              </span>
            )}
          </div>
        )}

        {hud.nearbyBlastDoorLocked && (
          <div className="px-3 py-1 rounded bg-[#0C0D12]/88 border border-[#F43F5E]/70 text-[11px] font-medium text-[#FCA5A5] whitespace-nowrap">
            Vault Locked · Clues {hud.collectedClueIds.length}/
            {CLUE_DEFINITIONS.length}
          </div>
        )}
      </div>

      {/* Decryption Reveal Story Banner */}
      {hud.recentReveal && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-[min(340px,54vw)] rounded bg-[#0C0D12]/90 border border-[#F59E0B]/65 px-3 py-1.5 ${
            showTouchControls ? 'bottom-4' : 'bottom-16'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#F59E0B]">
            <span className="truncate">
              DECRYPTED · {hud.recentReveal.title}
            </span>
            <span className="shrink-0 ml-2">
              {hud.recentReveal.codeFragment}
            </span>
          </div>
          <p className="text-[11px] text-[#E4E4E7] mt-0.5 leading-snug line-clamp-2">
            {hud.recentReveal.storyReveal}
          </p>
        </div>
      )}

      {/* Health, Armor, Medkits & Sit/Hide Cover Button */}
      <div
        className={`absolute rounded-md bg-[#0C0D12]/85 border border-[#F59E0B]/25 px-2.5 py-1.5 space-y-1 ${
          showTouchControls
            ? 'bottom-4 left-34 w-42'
            : 'bottom-4 left-4 w-52'
        }`}
      >
        {hud.damageFlashTimer > 0 && hud.recentDamageTaken > 0 && (
          <div className="absolute -top-5 right-1 font-mono text-xs font-bold text-[#F43F5E] tabular-nums">
            -{hud.recentDamageTaken} DMG
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-[#38BDF8]">
              <Shield className="w-3 h-3" />
              <span>Armor</span>
            </span>
            <span className="font-mono tabular-nums text-[#F4F4F5]">
              {hud.shield}/{hud.maxShield}
            </span>
          </div>
          <div className="h-1.5 w-full rounded bg-[#27272A] overflow-hidden">
            <div
              className="h-full bg-[#38BDF8] transition-all duration-100"
              style={{ width: `${(hud.shield / hud.maxShield) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-[#22C55E]">
              <Heart className="w-3 h-3" />
              <span>Health</span>
            </span>
            <span className="font-mono tabular-nums text-[#F4F4F5]">
              {hud.health}/{hud.maxHealth}
            </span>
          </div>
          <div className="h-1.5 w-full rounded bg-[#27272A] overflow-hidden">
            <div
              className="h-full bg-[#22C55E] transition-all duration-100"
              style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-1 border-t border-white/10 grid grid-cols-2 gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onUseMedicine}
            disabled={!canHeal}
            className={`px-1.5 py-1 rounded border text-[10px] font-mono tabular-nums flex items-center justify-between transition-colors ${
              canHeal
                ? 'border-[#22C55E]/55 bg-[#22C55E]/15 text-[#4ADE80] hover:bg-[#22C55E]/25 cursor-pointer'
                : 'border-white/10 bg-[#18181B]/60 text-[#71717A] cursor-default'
            }`}
          >
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Plus className="w-3 h-3" />
              <span>MED {hud.medkits}</span>
            </span>
            <span>{showTouchControls ? '' : '[Q]'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleCrouch}
            className={`px-1.5 py-1 rounded border text-[10px] font-mono flex items-center justify-between transition-colors cursor-pointer ${
              hud.isCrouching
                ? hud.inCover
                  ? 'border-[#22C55E] bg-[#22C55E]/25 text-[#4ADE80]'
                  : 'border-[#F59E0B] bg-[#F59E0B]/25 text-[#FCD34D]'
                : 'border-white/15 bg-[#18181B]/80 text-[#E4E4E7] hover:border-[#F59E0B]/60'
            }`}
          >
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  hud.isCrouching ? 'rotate-180' : ''
                }`}
              />
              <span>{hud.isCrouching ? 'STAND' : 'HIDE'}</span>
            </span>
            <span>{showTouchControls ? '' : '[C]'}</span>
          </button>
        </div>
      </div>

      {/* Ammo Counter */}
      <div
        className={`absolute rounded-md bg-[#0C0D12]/85 border border-[#F59E0B]/25 px-3 py-1.5 text-right ${
          showTouchControls ? 'bottom-22 right-4' : 'bottom-4 right-4'
        }`}
      >
        <div className="flex items-baseline justify-end gap-1.5">
          <span className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F5] tabular-nums">
            {hud.isReloading ? 'RELOAD' : hud.ammo}
          </span>
          {!hud.isReloading && (
            <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
              / {hud.maxAmmo}
            </span>
          )}
        </div>
        {hud.isReloading && (
          <div className="mt-1 h-1.5 w-20 ml-auto rounded bg-[#27272A] overflow-hidden">
            <div
              className="h-full bg-[#F59E0B]"
              style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
