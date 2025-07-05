type Repeat<T, C extends number, Result extends any[] = []> = Result['length'] extends C
  ? Result
  : Repeat<T, C, [...Result, T]>;

type Metrics = {
  momentaryLoudness: number;
  shortTermLoudness: number;
  integratedLoudness: number;
  maximumMomentaryLoudness: number;
  maximumShortTermLoudness: number;
  maximumTruePeakLevel: number;
  loudnessRange: number;
};

type AudioLoudnessSnapshot = {
  currentFrame: number;
  currentTime: number;
  currentMetrics: Metrics[];
};

export type { AudioLoudnessSnapshot, Metrics, Repeat };
