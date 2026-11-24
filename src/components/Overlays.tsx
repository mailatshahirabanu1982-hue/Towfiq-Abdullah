import {
  FolderOpen,
  Gamepad2,
  Play,
  RotateCcw,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HUDState } from '../game/types';

export function OrientationOverlay() {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0C0D12]"
    >
      <div className="w-full max-w-sm rounded-lg border border-[#F59E0B]/45 bg-[#14151C] p-7 text-center space-y-4 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 flex items-center justify-center">
          <Smartphone className="w-7 h-7 text-[#F59E0B] rotate-90" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-[#F59E0B]">
            LANDSCAPE ORIENTATION REQUIRED
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F4F4F5]">
            Rotate Device Horizontally
          </h2>
          <p className="text-sm text-[#D4D4D8] leading-relaxed">
            PROTOCOL: ECLIPSE is built for horizontal play. Rotate your screen to
            landscape mode to continue your mission.
          </p>
        </div>
      </div>
    </div>
  );
}

interface TitleOverlayProps {
  onStartMission: () => void;
}

export function TitleOverlay({ onStartMission }: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0C0D12]/65">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto hud-scroll rounded-lg border border-[#F59E0B]/40 bg-[#12131A]/95 p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono text-[#F59E0B] tracking-wider">
            OCEAN BLVD · SUNSET LOCKDOWN
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5] leading-none">
            PROTOCOL: ECLIPSE
          </h1>
          <p className="text-xs text-[#D4D4D8] leading-relaxed">
            Work the avenues, take cover behind street cars and concrete
            barriers, scan 4 encrypted pads, and take down the Vault Commander.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 p-2.5 rounded-md bg-[#0C0D12] border border-white/10 text-[11px] font-mono text-[#D4D4D8]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[#F59E0B] font-semibold">PC:</span>
            <span>WASD Move · C Sit/Hide · Mouse Fire · R Reload · E Scan · Q Heal</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[#22C55E] font-semibold">TOUCH:</span>
            <span>Left Stick Move · Right Drag Aim · Hide, Med &amp; Fire Buttons</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onStartMission}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-md bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0C0D12] font-display text-sm sm:text-base font-bold tracking-wide transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Mission</span>
          </button>

          <span className="text-[11px] font-mono text-[#A1A1AA]">
            4 Clues · Street Cover · Endless Levels
          </span>
        </div>
      </div>
    </div>
  );
}

interface PauseOverlayProps {
  isMuted: boolean;
  touchControlsEnabled: boolean;
  onResume: () => void;
  onOpenEvidence: () => void;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
}

export function PauseOverlay({
  isMuted,
  touchControlsEnabled,
  onResume,
  onOpenEvidence,
  onToggleMute,
  onToggleTouchControls,
  onRestart,
  onQuitToTitle,
}: PauseOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0C0D12]/80">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto hud-scroll rounded-lg border border-[#F59E0B]/30 bg-[#14151C] p-5 sm:p-7 space-y-4 shadow-2xl">
        <div>
          <p className="text-xs font-mono text-[#F59E0B]">MISSION PAUSED</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F4F5] mt-0.5">
            PROTOCOL: ECLIPSE
          </h2>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0C0D12] font-semibold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Mission</span>
          </button>

          <button
            type="button"
            onClick={onOpenEvidence}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md bg-[#1C1D26] hover:bg-[#27272A] border border-white/15 text-[#F4F4F5] font-medium text-sm cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-[#F59E0B]" />
            <span>Evidence Board</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] rounded-md bg-[#1C1D26] hover:bg-[#27272A] border border-white/15 text-[#F4F4F5] font-medium text-xs cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#A1A1AA]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#F59E0B]" />
              )}
              <span>{isMuted ? 'Audio Off' : 'Audio On'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTouchControls}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] rounded-md bg-[#1C1D26] hover:bg-[#27272A] border border-white/15 text-[#F4F4F5] font-medium text-xs cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 text-[#22C55E]" />
              <span>{touchControlsEnabled ? 'Touch On' : 'Touch Off'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] rounded-md bg-[#1C1D26] hover:bg-[#27272A] border border-white/15 text-[#F4F4F5] font-medium text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>

            <button
              type="button"
              onClick={onQuitToTitle}
              className="px-3 py-2 min-h-[44px] rounded-md border border-white/10 text-[#A1A1AA] hover:text-[#F4F4F5] text-xs cursor-pointer"
            >
              Quit to Title
            </button>
          </div>
          <p className="pt-1 text-center text-[11px] font-mono text-[#A1A1AA]">
            WASD · Shift · C Hide · Space · Click Fire · R · E · Q Heal · Tab
          </p>
        </div>
      </div>
    </div>
  );
}

interface EndOverlayProps {
  victory: boolean;
  hud: HUDState;
  onRetry: () => void;
  onNextLevel?: () => void;
  onTitle: () => void;
}

export function EndOverlay({
  victory,
  hud,
  onRetry,
  onNextLevel,
  onTitle,
}: EndOverlayProps) {
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
  const mins = Math.floor(hud.elapsedSeconds / 60);
  const secs = Math.floor(hud.elapsedSeconds % 60);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0C0D12]/85">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto hud-scroll rounded-lg border border-[#F59E0B]/30 bg-[#14151C] p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="space-y-1.5">
          <p
            className={`text-xs font-mono ${
              victory ? 'text-[#22C55E]' : 'text-[#F43F5E]'
            }`}
          >
            {victory ? 'MISSION PASSED' : 'WASTED'} · LEVEL {hud.level}
          </p>
          <h2 className="font-display text-3xl font-bold text-[#F4F4F5]">
            {victory ? 'District Cleared' : 'Down on Ocean Blvd'}
          </h2>
          <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed">
            {victory
              ? 'With AEGIS-9 neutralized across escalating street waves, the lockdown collapses. Keep pushing into the next sector.'
              : 'Armed patrol squads overwhelmed your armor before the district could be cleared.'}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <div className="p-2.5 rounded bg-[#0C0D12] border border-white/10">
            <p className="text-[11px] text-[#A1A1AA]">Level</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#F59E0B] tabular-nums">
              {hud.level}
            </p>
          </div>
          <div className="p-2.5 rounded bg-[#0C0D12] border border-white/10">
            <p className="text-[11px] text-[#A1A1AA]">Kills</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#F43F5E] tabular-nums">
              {hud.enemiesDefeated}
            </p>
          </div>
          <div className="p-2.5 rounded bg-[#0C0D12] border border-white/10">
            <p className="text-[11px] text-[#A1A1AA]">Damage</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#22C55E] tabular-nums">
              {hud.totalDamageDealt.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded bg-[#0C0D12] border border-white/10">
            <p className="text-[11px] text-[#A1A1AA]">Accuracy</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#F4F4F5] tabular-nums">
              {accuracy}%
            </p>
          </div>
          <div className="p-2.5 rounded bg-[#0C0D12] border border-white/10">
            <p className="text-[11px] text-[#A1A1AA]">Time</p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#F4F4F5] tabular-nums">
              {mins}:{secs.toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {victory && onNextLevel && (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md bg-[#22C55E] hover:bg-[#4ADE80] text-[#0C0D12] font-semibold text-sm whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Level {hud.level + 1}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0C0D12] font-semibold text-sm whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{victory ? 'Play Again' : 'Retry Mission'}</span>
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="px-5 py-2.5 min-h-[44px] rounded-md bg-[#1C1D26] hover:bg-[#27272A] border border-white/15 text-[#F4F4F5] text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
