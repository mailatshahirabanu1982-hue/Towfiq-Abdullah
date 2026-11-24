/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { EvidenceModal } from './components/EvidenceModal';
import { GameHUD } from './components/GameHUD';
import { MobileControls } from './components/MobileControls';
import {
  EndOverlay,
  OrientationOverlay,
  PauseOverlay,
  TitleOverlay,
} from './components/Overlays';
import { GameEngine } from './game/GameEngine';
import { soundEngine } from './game/soundEngine';
import { GamePhase, HUDState } from './game/types';

const INITIAL_HUD: HUDState = {
  health: 100,
  maxHealth: 100,
  shield: 100,
  maxShield: 100,
  ammo: 24,
  maxAmmo: 24,
  isReloading: false,
  reloadProgress: 0,
  collectedClueIds: [],
  nearbyClue: null,
  nearbyBlastDoorLocked: false,
  blastDoorUnlocked: false,
  bossActive: false,
  bossHealth: 520,
  bossMaxHealth: 520,
  bossName: 'AEGIS-9 EXO-COMMANDER',
  objectiveText: 'Scan data pads (0/4)',
  level: 1,
  medkits: 2,
  maxMedkits: 5,
  healFlashTimer: 0,
  levelBannerText: null,
  isCrouching: false,
  inCover: false,
  enemiesDefeated: 0,
  totalDamageDealt: 0,
  recentDamageTaken: 0,
  damageNumbers: [],
  shotsFired: 0,
  shotsHit: 0,
  crosshairSpread: 0,
  hitMarkerTimer: 0,
  damageFlashTimer: 0,
  pointerLocked: false,
  recentReveal: null,
  elapsedSeconds: 0,
  radar: {
    playerX: 0,
    playerZ: 34,
    playerYaw: 0,
    pois: [],
  },
};

function detectTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 960
  );
}

function checkIsPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [isMuted, setIsMuted] = useState(false);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(
    detectTouchCapable
  );
  const [isPortrait, setIsPortrait] = useState<boolean>(checkIsPortrait);

  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(mount, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        engine.setPhase(nextPhase);
      },
    });
    engineRef.current = engine;

    const handleOrientationCheck = () => {
      const portrait = checkIsPortrait();
      setIsPortrait(portrait);
      if (portrait && phaseRef.current === 'PLAYING') {
        setPhase('PAUSED');
        engine.setPhase('PAUSED');
      }
    };

    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);

    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const transitionPhase = (nextPhase: GamePhase) => {
    setPhase(nextPhase);
    engineRef.current?.setPhase(nextPhase);
  };

  const tryLockHorizontal = () => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (lockType: string) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Browser does not allow programmatic orientation lock outside fullscreen
    }
  };

  const handleStartMission = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    tryLockHorizontal();
    engineRef.current?.resetMission();
    transitionPhase('PLAYING');
    if (!touchControlsEnabled) {
      engineRef.current?.requestPointerLock();
    }
  };

  const handleResume = () => {
    soundEngine.playClick();
    tryLockHorizontal();
    transitionPhase('PLAYING');
    if (!touchControlsEnabled) {
      engineRef.current?.requestPointerLock();
    }
  };

  const handleRestart = () => {
    soundEngine.playClick();
    tryLockHorizontal();
    engineRef.current?.resetMission();
    transitionPhase('PLAYING');
    if (!touchControlsEnabled) {
      engineRef.current?.requestPointerLock();
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    soundEngine.muted = next;
    setIsMuted(next);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0C0D12]">
      {/* Dedicated WebGL Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Active Gameplay HUD */}
      {phase === 'PLAYING' && !isPortrait && (
        <>
          <GameHUD
            hud={hud}
            showTouchControls={touchControlsEnabled}
            onOpenEvidence={() => transitionPhase('EVIDENCE')}
            onPause={() => transitionPhase('PAUSED')}
            onLockPointer={() => engineRef.current?.requestPointerLock()}
            onUseMedicine={() => engineRef.current?.useMedicine()}
            onToggleCrouch={() => engineRef.current?.toggleCrouch()}
          />

          {touchControlsEnabled && (
            <MobileControls
              nearbyClue={hud.nearbyClue}
              medkits={hud.medkits}
              canHeal={
                hud.medkits > 0 &&
                (hud.health < hud.maxHealth || hud.shield < hud.maxShield)
              }
              isCrouching={hud.isCrouching}
              inCover={hud.inCover}
              onMove={(f, r, sprint) =>
                engineRef.current?.setVirtualMove(f, r, sprint)
              }
              onLookDelta={(dx, dy) => engineRef.current?.addLookDelta(dx, dy)}
              onFire={(firing) => engineRef.current?.setVirtualFire(firing)}
              onJump={() => engineRef.current?.triggerJump()}
              onReload={() => engineRef.current?.triggerReload()}
              onScan={() => engineRef.current?.triggerScan()}
              onHeal={() => engineRef.current?.useMedicine()}
              onToggleCrouch={() => engineRef.current?.toggleCrouch()}
            />
          )}
        </>
      )}

      {/* Title Screen */}
      {phase === 'TITLE' && !isPortrait && (
        <TitleOverlay onStartMission={handleStartMission} />
      )}

      {/* Pause Menu */}
      {phase === 'PAUSED' && !isPortrait && (
        <PauseOverlay
          isMuted={isMuted}
          touchControlsEnabled={touchControlsEnabled}
          onResume={handleResume}
          onOpenEvidence={() => transitionPhase('EVIDENCE')}
          onToggleMute={handleToggleMute}
          onToggleTouchControls={() =>
            setTouchControlsEnabled((prev) => !prev)
          }
          onRestart={handleRestart}
          onQuitToTitle={() => {
            engineRef.current?.resetMission();
            transitionPhase('TITLE');
          }}
        />
      )}

      {/* Evidence Board Modal */}
      {phase === 'EVIDENCE' && !isPortrait && (
        <EvidenceModal
          collectedClueIds={hud.collectedClueIds}
          blastDoorUnlocked={hud.blastDoorUnlocked}
          onClose={handleResume}
        />
      )}

      {/* Game Over & Victory Overlays */}
      {(phase === 'GAME_OVER' || phase === 'VICTORY') && !isPortrait && (
        <EndOverlay
          victory={phase === 'VICTORY'}
          hud={hud}
          onRetry={handleRestart}
          onNextLevel={() => {
            soundEngine.playClick();
            engineRef.current?.advanceToNextLevel();
            transitionPhase('PLAYING');
            if (!touchControlsEnabled) {
              engineRef.current?.requestPointerLock();
            }
          }}
          onTitle={() => {
            engineRef.current?.resetMission();
            transitionPhase('TITLE');
          }}
        />
      )}

      {/* Enforce Horizontal-Only Play */}
      {isPortrait && <OrientationOverlay />}
    </div>
  );
}
