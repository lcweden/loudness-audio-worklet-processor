import { Metrics, Repeat } from '../types';
import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import {
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
  TRUE_PEAK_COEFFICIENTS,
} from './constants';
import { FiniteImpulseResponseFilter } from './finite-impulse-response-filter';

/**
 * Loudness Algorithm Implementation (ITU-R BS.1770-5)
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  lastTime: number = 0;
  kWeightingFilters: Array<Array<Repeat<BiquadraticFilter, 2>>> = [];
  truePeakFilters: Array<Array<Repeat<FiniteImpulseResponseFilter, 4>>> = [];
  momentaryEnergyBuffers: Array<CircularBuffer<number>> = [];
  shortTermEnergyBuffers: Array<CircularBuffer<number>> = [];
  momentaryLoudnessHistories: Array<Array<number>> = [];
  shortTermLoudnessHistories: Array<Array<number>> = [];
  metrics: Array<Metrics> = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    this.processPerInput(inputs, (input, metrics, context) => {
      const { kWeightingFilter, truePeakFilter } = context;
      const { momentaryEnergyBuffer, shortTermEnergyBuffer } = context;
      const { shortTermLoudnessHistory, momentaryLoudnessHistory } = context;
      const kWeightedInput = Array.from({ length: input.length }, (_, i) => new Float32Array(input[i].length));
      const channelWeights = Object.values(CHANNEL_WEIGHT_FACTORS[kWeightedInput.length] ?? {});

      for (let i = 0; i < input.length; i++) {
        kWeightingFilter[i] ??= [
          new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highshelf.a, K_WEIGHTING_COEFFICIENTS.highshelf.b),
          new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highpass.a, K_WEIGHTING_COEFFICIENTS.highpass.b),
        ];

        truePeakFilter[i] ??= [
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase0),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase1),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase2),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase3),
        ];

        for (let j = 0; j < input[i].length; j++) {
          const [highshelfFilter, highpassFilter] = kWeightingFilter[i];
          const highshelfOutput = highshelfFilter.process(input[i][j]);
          kWeightedInput[i][j] = highpassFilter.process(highshelfOutput);

          const attenuation = Math.pow(10, -ATTENUATION_DB / 20);
          const attenuatedSample = input[i][j] * attenuation;
          const oversample = sampleRate >= 96000 ? 2 : 4;
          const truePeaks = [];

          for (let index = 0; index < oversample; index++) {
            const filter = truePeakFilter[i][index];
            truePeaks.push(Math.abs(filter.process(attenuatedSample)));
          }

          const maximumTruePeak = Math.max(...truePeaks);
          const maximumTruePeakLevel = 20 * Math.log10(maximumTruePeak) + ATTENUATION_DB;

          metrics.maximumTruePeakLevel = Math.max(metrics.maximumTruePeakLevel, maximumTruePeakLevel);
        }
      }

      for (let i = 0; i < kWeightedInput[0].length; i++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let j = 0; j < kWeightedInput.length; j++) {
          const sampleEnergy = kWeightedInput[j][i] ** 2;
          const channelWeight = channelWeights[j] ?? 1.0;
          sumOfSquaredChannelWeightedSamples += sampleEnergy * channelWeight;
        }

        momentaryEnergyBuffer.push(sumOfSquaredChannelWeightedSamples);
        shortTermEnergyBuffer.push(sumOfSquaredChannelWeightedSamples);
      }

      if (momentaryEnergyBuffer.isFull() && currentFrame % Math.round(sampleRate * MOMENTARY_HOP_INTERVAL_SEC) === 0) {
        const energies = momentaryEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const momentaryLoudness = this.#energyToLoudness(meanEnergy);

        momentaryLoudnessHistory.push(momentaryLoudness);
        metrics.momentaryLoudness = momentaryLoudness;
      }

      if (momentaryLoudnessHistory.length > 2) {
        const absoluteGatedLoudnesses = momentaryLoudnessHistory.filter((v) => v > LUFS_ABSOLUTE_THRESHOLD);

        if (absoluteGatedLoudnesses.length > 2) {
          const absoluteGatedEnergies = absoluteGatedLoudnesses.map(this.#loudnessToEnergy);
          const sumOfAbsoluteGatedEnergy = absoluteGatedEnergies.reduce((a, b) => a + b, 0);
          const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergies.length;
          const absoluteGatedLoudness = this.#energyToLoudness(absoluteGatedMeanEnergy);
          const relativeThreshold = absoluteGatedLoudness + LUFS_RELATIVE_THRESHOLD_FACTOR;
          const relativeGatedLoudnesses = absoluteGatedLoudnesses.filter((v) => v > relativeThreshold);

          if (relativeGatedLoudnesses.length > 2) {
            const relativeGatedEnergies = relativeGatedLoudnesses.map(this.#loudnessToEnergy);
            const sumOfRelativeGatedEnergy = relativeGatedEnergies.reduce((a, b) => a + b, 0);
            const relativeGatedMeanEnergy = sumOfRelativeGatedEnergy / relativeGatedEnergies.length;
            const integratedLoudness = this.#energyToLoudness(relativeGatedMeanEnergy);

            metrics.integratedLoudness = integratedLoudness;
          }
        }
      }

      if (shortTermEnergyBuffer.isFull() && currentFrame % Math.round(sampleRate * SHORT_TERM_HOP_INTERVAL_SEC) === 0) {
        const energies = shortTermEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const shortTermLoudness = this.#energyToLoudness(meanEnergy);

        shortTermLoudnessHistory.push(shortTermLoudness);
        metrics.shortTermLoudness = shortTermLoudness;
      }

      if (shortTermLoudnessHistory.length > 2) {
        const absoluteGatedLoudnesses = shortTermLoudnessHistory.filter((v) => v > LRA_ABSOLUTE_THRESHOLD);

        if (absoluteGatedLoudnesses.length > 2) {
          const absoluteGatedEnergies = absoluteGatedLoudnesses.map(this.#loudnessToEnergy);
          const sumOfAbsoluteGatedEnergy = absoluteGatedEnergies.reduce((a, b) => a + b, 0);
          const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergies.length;
          const absoluteGatedLoudness = this.#energyToLoudness(absoluteGatedMeanEnergy);
          const relativeThreshold = absoluteGatedLoudness + LRA_RELATIVE_THRESHOLD_FACTOR;
          const relativeGatedLoudnesses = absoluteGatedLoudnesses.filter((v) => v > relativeThreshold);

          if (relativeGatedLoudnesses.length > 2) {
            const sortedLoudnesses = relativeGatedLoudnesses.toSorted((a, b) => a - b);
            const [lowerPercentile, upperPercentile] = [
              LOUDNESS_RANGE_LOWER_PERCENTILE,
              LOUDNESS_RANGE_UPPER_PERCENTILE,
            ].map((percentile) => {
              const lowerIndex = Math.floor(percentile * (sortedLoudnesses.length - 1));
              const upperIndex = Math.ceil(percentile * (sortedLoudnesses.length - 1));

              if (upperIndex === lowerIndex) {
                return sortedLoudnesses[lowerIndex];
              }

              return (
                sortedLoudnesses[lowerIndex] +
                (sortedLoudnesses[upperIndex] - sortedLoudnesses[lowerIndex]) *
                  (percentile * (sortedLoudnesses.length - 1) - lowerIndex)
              );
            });

            const loudnessRange = upperPercentile - lowerPercentile;
            metrics.loudnessRange = loudnessRange;
          }
        }
      }
    });

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }

    if (currentTime - this.lastTime >= 0.1) {
      this.port.postMessage({ currentFrame, currentTime, currentMetrics: this.metrics });
      this.lastTime = currentTime;
    }

    return true;
  }

  processPerInput(
    inputs: Float32Array[][],
    process: (
      input: Float32Array[],
      metrics: Metrics,
      context: {
        kWeightingFilter: Repeat<BiquadraticFilter, 2>[];
        truePeakFilter: Repeat<FiniteImpulseResponseFilter, 4>[];
        momentaryEnergyBuffer: CircularBuffer<number>;
        shortTermEnergyBuffer: CircularBuffer<number>;
        shortTermLoudnessHistory: Array<number>;
        momentaryLoudnessHistory: Array<number>;
      }
    ) => void
  ) {
    if (!inputs.length) return;

    for (let i = 0; i < inputs.length; i++) {
      this.kWeightingFilters[i] ??= [];
      this.truePeakFilters[i] ??= [];
      this.momentaryEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * MOMENTARY_WINDOW_SEC));
      this.shortTermEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * SHORT_TERM_WINDOW_SEC));
      this.shortTermLoudnessHistories[i] ??= [];
      this.momentaryLoudnessHistories[i] ??= [];
      this.metrics[i] ??= {
        momentaryLoudness: Number.NEGATIVE_INFINITY,
        shortTermLoudness: Number.NEGATIVE_INFINITY,
        integratedLoudness: Number.NEGATIVE_INFINITY,
        loudnessRange: Number.NEGATIVE_INFINITY,
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
      };

      this.kWeightingFilters.length = inputs.length;
      this.truePeakFilters.length = inputs.length;
      this.momentaryEnergyBuffers.length = inputs.length;
      this.shortTermEnergyBuffers.length = inputs.length;
      this.shortTermLoudnessHistories.length = inputs.length;
      this.momentaryLoudnessHistories.length = inputs.length;
      this.metrics.length = inputs.length;

      if (!inputs[i].length) continue;

      this.kWeightingFilters[i].length = inputs[i].length;
      this.truePeakFilters[i].length = inputs[i].length;

      const context = {
        kWeightingFilter: this.kWeightingFilters[i],
        truePeakFilter: this.truePeakFilters[i],
        momentaryEnergyBuffer: this.momentaryEnergyBuffers[i],
        shortTermEnergyBuffer: this.shortTermEnergyBuffers[i],
        shortTermLoudnessHistory: this.shortTermLoudnessHistories[i],
        momentaryLoudnessHistory: this.momentaryLoudnessHistories[i],
      };

      process(inputs[i], this.metrics[i], context);
    }
  }

  #energyToLoudness(energy: number): number {
    return -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON));
  }

  #loudnessToEnergy(loudness: number): number {
    return Math.pow(10, (loudness + 0.691) / 10);
  }
}

export { LoudnessProcessor };
