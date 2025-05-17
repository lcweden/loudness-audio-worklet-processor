type Metrics = {
  momentaryLoudness: number;
  shortTermLoudness: number;
  integratedLoudness: number;
  loudnessRange: number;
  maximumTruePeakLevel: number;
};

type AudioLoudnessSnapshot = {
  currentFrame: number;
  currentTime: number;
  currentMetrics: Metrics[];
};

export type { AudioLoudnessSnapshot, Metrics };
