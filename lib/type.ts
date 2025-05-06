type KWeightingFilters<T> = [T, T][][];

type EnergyBuffer<T> = [T, T, T][];

type Metrics = {
  integratedLoudness: number;
  shortTermLoudness: number;
  momentaryLoudness: number;
  loudnessRange: number;
  truePeakLevel: number;
  maximumMomentaryLoudness: number;
  maximumShortTermLoudness: number;
  maximumTruePeakLevel: number;
  programLoudness: number;
  targetLoudness: number;
  loudnessDeviation: number;
  samplePeak: number;
  dynamicRange: number;
};

export type { EnergyBuffer, KWeightingFilters, Metrics };
