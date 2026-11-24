import { CheckCircle2, Lock, X } from 'lucide-react';
import { ACCESS_CODE, CLUE_DEFINITIONS } from '../game/storyData';

interface EvidenceModalProps {
  collectedClueIds: string[];
  blastDoorUnlocked: boolean;
  onClose: () => void;
}

export function EvidenceModal({
  collectedClueIds,
  blastDoorUnlocked,
  onClose,
}: EvidenceModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-board-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0C0D12]/85"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-lg border border-[#F59E0B]/40 bg-[#14151C] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
          <div>
            <h2
              id="evidence-board-title"
              className="font-display text-2xl font-bold text-[#F4F4F5]"
            >
              Evidence Board &amp; Decryption Log
            </h2>
            <p className="text-xs font-mono text-[#A1A1AA] tabular-nums mt-0.5">
              Shards Decrypted: {collectedClueIds.length}/
              {CLUE_DEFINITIONS.length} · Master Override:{' '}
              <span className={blastDoorUnlocked ? 'text-[#22C55E]' : 'text-[#F59E0B]'}>
                {blastDoorUnlocked ? ACCESS_CODE : 'ENCRYPTED'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Evidence Board"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto hud-scroll">
          {CLUE_DEFINITIONS.map((clue) => {
            const unlocked = collectedClueIds.includes(clue.id);
            return (
              <div
                key={clue.id}
                className={`rounded-md border p-4 space-y-2 ${
                  unlocked
                    ? 'bg-[#1C1D26] border-[#F59E0B]/45'
                    : 'bg-[#0C0D12] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-[#A1A1AA]">
                    {clue.zoneName}
                  </span>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[#22C55E]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{clue.codeFragment}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[#71717A]">
                      <Lock className="w-3.5 h-3.5" />
                      <span>LOCKED</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display text-lg font-bold text-[#F4F4F5]">
                  {unlocked ? clue.title : 'Encrypted Data Pad'}
                </h3>

                <p className="text-sm text-[#D4D4D8] leading-relaxed">
                  {unlocked
                    ? clue.storyReveal
                    : `Explore ${clue.zoneName} and press [E] near the glowing beacon to decrypt this cipher shard.`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-t border-white/10 bg-[#0C0D12]">
          <span className="text-xs text-[#A1A1AA]">
            Press <span className="font-mono text-[#F4F4F5]">[Tab]</span> or{' '}
            <span className="font-mono text-[#F4F4F5]">[Esc]</span> to return to
            the street.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-md bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0C0D12] text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            Resume Mission
          </button>
        </div>
      </div>
    </div>
  );
}
