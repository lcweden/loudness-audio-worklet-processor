type Metrics = {
  momentaryLoudness: number;
  shortTermLoudness: number;
  integratedLoudness: number;
  loudnessRange: number;
  maximumTruePeakLevel: number;
};

type LoudnessProcessorData = {
  currentFrame: number;
  currentTime: number;
  currentMetrics: Metrics[];
};

export type { LoudnessProcessorData, Metrics };
