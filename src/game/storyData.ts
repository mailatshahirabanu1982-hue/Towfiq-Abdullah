import { ClueDefinition } from './types';

export const CLUE_DEFINITIONS: ClueDefinition[] = [
  {
    id: 'clue-cruiser-recorder',
    title: 'Valkyrie-7 Flight Recorder',
    zoneName: 'Crashed Hover-Cruiser (West Plaza)',
    codeFragment: 'EC-49',
    summary:
      'Recovered from the smoking cockpit of the downed corporate courier craft.',
    storyReveal:
      'Telemetry proves the Valkyrie-7 was shot down by orbital defense cannons inside Sector 9—not mechanical failure. Someone triggered Protocol: Eclipse manually from the central plaza.',
    position: [-23.5, 0.9, 14.5],
    accentColor: 0x06b6d4,
  },
  {
    id: 'clue-alley-manifest',
    title: 'Encrypted Cargo Manifest',
    zoneName: 'West Neon Alley (Wreckage Pod)',
    codeFragment: 'LP-07',
    summary:
      'Salvaged from an ejected armored container wedged behind the crashed cruiser.',
    storyReveal:
      'The courier was hauling a live neural-core backup labeled "ECLIPSE-OMEGA" destined for off-world extraction before Helios Corp locked down the block.',
    position: [-32.5, 0.9, -4.5],
    accentColor: 0xf59e0b,
  },
  {
    id: 'clue-server-cipher',
    title: 'Helios Root Security Cipher',
    zoneName: 'Corporate Server Terminal (Northeast)',
    codeFragment: 'SE-82',
    summary:
      'Extracted from an isolated Helios Corp relay terminal humming beneath the neon tower.',
    storyReveal:
      'Executive Directive 09 ordered all street-level drones onto lethal containment and sealed the Central Vault behind AEGIS-9—an autonomous heavy mech.',
    position: [26.5, 1.0, -4.5],
    accentColor: 0xd946ef,
  },
  {
    id: 'clue-clinic-neural',
    title: 'Dr. Vance’s Neural Implant Log',
    zoneName: 'Black-Market Clinic (Southeast)',
    codeFragment: '9X-00',
    summary:
      'Hidden inside an unlicensed cyber-clinic operating behind shuttered neon signage.',
    storyReveal:
      'The final cipher shard confirms Dr. Vance survived the crash and uploaded the master override key before AEGIS-9 purged the alley. All 4 shards combine to open the Central Blast Door.',
    position: [25.5, 0.9, 22.0],
    accentColor: 0x06b6d4,
  },
];

export const ACCESS_CODE = 'EC49-LP07-SE82-9X00';
