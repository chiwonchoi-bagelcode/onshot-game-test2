import type { Shot } from './kit';
import { SCOUTS } from './scouts';
import { A_living } from './acts/a1_living';
import { G_finale } from './acts/a3_finale';
import { Q_roomba, Q_jack, Q_phone, T_title, Z_stinger } from './acts/a4_title';
import { B_yank, B_gentle, C_soda, D_castle, E_balloon, F_flood } from './acts/a2_montage';

export type { Shot, Cue } from './kit';

export const SHOTS: Shot[] = [A_living, B_yank, B_gentle, C_soda, D_castle, E_balloon, F_flood, G_finale, Q_roomba, Q_jack, Q_phone, T_title, Z_stinger, ...SCOUTS];
