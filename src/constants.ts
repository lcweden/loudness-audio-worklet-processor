const K_WEIGHTING_COEFFICIENTS = {
  highshelf: { a: [-1.69065929318241, 0.73248077421585], b: [1.53512485958697, -2.69169618940638, 1.19839281085285] },
  highpass: { a: [-1.99004745483398, 0.99007225036621], b: [1.0, -2.0, 1.0] }
};

const TRUE_PEAK_COEFFICIENTS = {
  lowpass: {
    phase0: [
      0.001708984375, 0.010986328125, -0.0196533203125, 0.033203125, -0.0594482421875, 0.1373291015625, 0.97216796875,
      -0.102294921875, 0.047607421875, -0.026611328125, 0.014892578125, -0.00830078125
    ],
    phase1: [
      -0.0291748046875, 0.029296875, -0.0517578125, 0.089111328125, -0.16650390625, 0.465087890625, 0.77978515625,
      -0.2003173828125, 0.1015625, -0.0582275390625, 0.0330810546875, -0.0189208984375
    ],
    phase2: [
      -0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625, -0.2003173828125, 0.77978515625, 0.465087890625,
      -0.16650390625, 0.089111328125, -0.0517578125, 0.029296875, -0.0291748046875
    ],
    phase3: [
      -0.00830078125, 0.014892578125, -0.026611328125, 0.047607421875, -0.102294921875, 0.97216796875, 0.1373291015625,
      -0.0594482421875, 0.033203125, -0.0196533203125, 0.010986328125, 0.001708984375
    ]
  }
};

const CHANNEL_WEIGHT_FACTORS: { [channels: number]: Record<string, number> } = {
  1: { mono: 1.0 },
  2: { L: 1.0, R: 1.0 },
  6: { L: 1.0, R: 1.0, C: 1.0, LFE: 0.0, Ls: 1.41, Rs: 1.41 },
  8: { L: 1.0, R: 1.0, C: 1.0, LFE: 0.0, Lss: 1.41, Rss: 1.41, Lrs: 1.0, Rrs: 1.0 },
  10: { L: 1.0, R: 1.0, C: 1.0, LFE: 0.0, Ls: 1.41, Rs: 1.41, Tfl: 1.0, Tfr: 1.0, Tbl: 1.0, Tbr: 1.0 },
  12: {
    L: 1.0,
    R: 1.0,
    C: 1.0,
    LFE: 0.0,
    Lss: 1.41,
    Rss: 1.41,
    Lrs: 1.0,
    Rrs: 1.0,
    Tfl: 1.0,
    Tfr: 1.0,
    Tbl: 1.0,
    Tbr: 1.0
  },
  24: {
    FL: 1.41,
    FR: 1.41,
    FC: 1.0,
    LFE1: 0.0,
    BL: 1.0,
    BR: 1.0,
    FLc: 1.0,
    FRc: 1.0,
    BC: 1.0,
    LFE2: 0.0,
    SiL: 1.41,
    SiR: 1.41,
    TpFL: 1.0,
    TpFR: 1.0,
    TpFC: 1.0,
    TpC: 1.0,
    TpBL: 1.0,
    TpBR: 1.0,
    TpSiL: 1.0,
    TpSiR: 1.0,
    TpBC: 1.0,
    BtFC: 1.0,
    BtFL: 1.0,
    BtFR: 1.0
  }
};

const MOMENTARY_WINDOW_SEC = 0.4;

const MOMENTARY_HOP_INTERVAL_SEC = 0.1;

const SHORT_TERM_WINDOW_SEC = 3.0;

const SHORT_TERM_HOP_INTERVAL_SEC = 0.1;

const LOUDNESS_RANGE_LOWER_PERCENTILE = 0.1;

const LOUDNESS_RANGE_UPPER_PERCENTILE = 0.95;

const ATTENUATION_DB = 12.04;

const LUFS_ABSOLUTE_THRESHOLD = -70;

const LUFS_RELATIVE_THRESHOLD_FACTOR = -10;

const LRA_ABSOLUTE_THRESHOLD = -70;

const LRA_RELATIVE_THRESHOLD_FACTOR = -20;

export {
  ATTENUATION_DB,
  CHANNEL_WEIGHT_FACTORS,
  K_WEIGHTING_COEFFICIENTS,
  LOUDNESS_RANGE_LOWER_PERCENTILE,
  LOUDNESS_RANGE_UPPER_PERCENTILE,
  LRA_ABSOLUTE_THRESHOLD,
  LRA_RELATIVE_THRESHOLD_FACTOR,
  LUFS_ABSOLUTE_THRESHOLD,
  LUFS_RELATIVE_THRESHOLD_FACTOR,
  MOMENTARY_HOP_INTERVAL_SEC,
  MOMENTARY_WINDOW_SEC,
  SHORT_TERM_HOP_INTERVAL_SEC,
  SHORT_TERM_WINDOW_SEC,
  TRUE_PEAK_COEFFICIENTS
};
