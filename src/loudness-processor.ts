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
import { Reference } from './reference';

/**
 * Loudness Algorithm Implementation (ITU-R BS.1770-5)
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  capacity: number | null = null;
  interval: number = 0;
  lastTime: number = 0;
  metrics: Array<Metrics> = [];
  kWeightingFilters: Array<Array<Repeat<BiquadraticFilter, 2>>> = [];
  truePeakFilters: Array<Array<Repeat<FiniteImpulseResponseFilter, 4>>> = [];
  momentaryEnergyBuffers: Array<CircularBuffer<number>> = [];
  momentaryEnergyRunningSums: Array<Reference<number>> = [];
  momentarySampleAccumulators: Array<Reference<number>> = [];
  momentaryLoudnessHistories: Array<Array<number>> | Array<CircularBuffer<number>> = [];
  shortTermEnergyBuffers: Array<CircularBuffer<number>> = [];
  shortTermEnergyRunningSums: Array<Reference<number>> = [];
  shortTermLoudnessHistories: Array<Array<number>> | Array<CircularBuffer<number>> = [];
  shortTermSampleAccumulators: Array<Reference<number>> = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);
    this.capacity = options.processorOptions?.capacity ?? NaN;
    this.interval = options.processorOptions?.interval ?? 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    this.#processPerInput(inputs, (channels, context) => {
      const { kWeightingFilters, truePeakFilters } = context;
      const { momentaryEnergyBuffer, shortTermEnergyBuffer } = context;
      const { momentaryEnergyRunningSum, shortTermEnergyRunningSum } = context;
      const { momentarySampleAccumulator, shortTermSampleAccumulator } = context;
      const { momentaryLoudnessHistory, shortTermLoudnessHistory } = context;
      const { metrics } = context;
      const channelWeights = Object.values(CHANNEL_WEIGHT_FACTORS[channels.length] || new Object());
      const channelCount = channels.length;
      const sampleCount = channels[0].length;

      for (let i = 0; i < sampleCount; i++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let j = 0; j < channelCount; j++) {
          const [highshelfFilter, highpassFilter] = kWeightingFilters[j];
          const highshelfOutput = highshelfFilter.process(channels[j][i]);
          const kWeightedSample = highpassFilter.process(highshelfOutput);
          const sampleEnergy = kWeightedSample ** 2;
          const channelWeight = channelWeights[j] ?? 1.0;

          const attenuation = Math.pow(10, -ATTENUATION_DB / 20);
          const attenuatedSample = channels[j][i] * attenuation;
          const oversample = sampleRate >= 96000 ? 2 : 4;
          const truePeaks = [];

          for (let k = 0; k < oversample; k++) {
            const filter = truePeakFilters[j][k];
            truePeaks.push(Math.abs(filter.process(attenuatedSample)));
          }

          const maximumTruePeak = Math.max(...truePeaks);
          const maximumTruePeakLevel = 20 * Math.log10(maximumTruePeak) + ATTENUATION_DB;
          const previousMaximumTruePeakLevel = metrics.maximumTruePeakLevel;

          metrics.maximumTruePeakLevel = Math.max(previousMaximumTruePeakLevel, maximumTruePeakLevel);

          sumOfSquaredChannelWeightedSamples += sampleEnergy * channelWeight;
        }

        const energy = sumOfSquaredChannelWeightedSamples;

        const previousMomentaryEnergy = momentaryEnergyBuffer.peek() ?? 0;
        const previousMomentaryEnergyForSum = momentaryEnergyBuffer.isFull() ? previousMomentaryEnergy : 0;

        momentaryEnergyRunningSum.set(momentaryEnergyRunningSum.get() + energy - previousMomentaryEnergyForSum);
        momentaryEnergyBuffer.push(energy);

        const previousShortTermEnergy = shortTermEnergyBuffer.peek() ?? 0;
        const previousShortTermEnergyForSum = shortTermEnergyBuffer.isFull() ? previousShortTermEnergy : 0;

        shortTermEnergyRunningSum.set(shortTermEnergyRunningSum.get() + energy - previousShortTermEnergyForSum);
        shortTermEnergyBuffer.push(energy);

        if (momentaryEnergyBuffer.isFull()) {
          const meanEnergy = momentaryEnergyRunningSum.get() / momentaryEnergyBuffer.capacity;
          const momentaryLoudness = this.#energyToLoudness(meanEnergy);

          metrics.momentaryLoudness = momentaryLoudness;
          metrics.maximumMomentaryLoudness = Math.max(metrics.maximumMomentaryLoudness, momentaryLoudness);
        }
      }

      momentarySampleAccumulator.set(momentarySampleAccumulator.get() + sampleCount);
      shortTermSampleAccumulator.set(shortTermSampleAccumulator.get() + sampleCount);

      const momentaryHopSize = Math.round(sampleRate * MOMENTARY_HOP_INTERVAL_SEC);
      const shortTermHopSize = Math.round(sampleRate * SHORT_TERM_HOP_INTERVAL_SEC);

      while (momentarySampleAccumulator.get() >= momentaryHopSize) {
        if (momentaryEnergyBuffer.isFull()) {
          const meanEnergy = momentaryEnergyRunningSum.get() / momentaryEnergyBuffer.capacity;
          const momentaryLoudness = this.#energyToLoudness(meanEnergy);

          momentaryLoudnessHistory.push(momentaryLoudness);
        }

        momentarySampleAccumulator.set(momentarySampleAccumulator.get() - momentaryHopSize);
      }

      while (shortTermSampleAccumulator.get() >= shortTermHopSize) {
        if (shortTermEnergyBuffer.isFull()) {
          const meanEnergy = shortTermEnergyRunningSum.get() / shortTermEnergyBuffer.capacity;
          const shortTermLoudness = this.#energyToLoudness(meanEnergy);

          metrics.shortTermLoudness = shortTermLoudness;
          metrics.maximumShortTermLoudness = Math.max(metrics.maximumShortTermLoudness, shortTermLoudness);

          shortTermLoudnessHistory.push(shortTermLoudness);
        }

        shortTermSampleAccumulator.set(shortTermSampleAccumulator.get() - shortTermHopSize);
      }

      if (momentaryLoudnessHistory.length > 2) {
        const absoluteGatedLoudnesses = Array.from(momentaryLoudnessHistory).filter((v) => v > LUFS_ABSOLUTE_THRESHOLD);

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

      if (shortTermLoudnessHistory.length > 2) {
        const absoluteGatedLoudnesses = Array.from(shortTermLoudnessHistory).filter((v) => v > LRA_ABSOLUTE_THRESHOLD);

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

    this.#passThrough(inputs, outputs);

    if (currentTime - this.lastTime >= this.interval) {
      this.#postMessage({ currentFrame, currentTime, currentMetrics: this.metrics });
      this.lastTime = currentTime;
    }

    return true;
  }

  #processPerInput(
    inputs: Float32Array[][],
    process: (
      channels: Float32Array[],
      context: {
        metrics: Metrics;
        kWeightingFilters: Array<Repeat<BiquadraticFilter, 2>>;
        truePeakFilters: Array<Repeat<FiniteImpulseResponseFilter, 4>>;
        momentaryEnergyBuffer: CircularBuffer<number>;
        momentaryEnergyRunningSum: Reference<number>;
        momentarySampleAccumulator: Reference<number>;
        momentaryLoudnessHistory: Array<number> | CircularBuffer<number>;
        shortTermEnergyBuffer: CircularBuffer<number>;
        shortTermEnergyRunningSum: Reference<number>;
        shortTermLoudnessHistory: Array<number> | CircularBuffer<number>;
        shortTermSampleAccumulator: Reference<number>;
      }
    ) => void
  ): void {
    this.kWeightingFilters.length = inputs.length;
    this.truePeakFilters.length = inputs.length;
    this.momentaryEnergyRunningSums.length = inputs.length;
    this.momentarySampleAccumulators.length = inputs.length;
    this.momentaryEnergyBuffers.length = inputs.length;
    this.momentaryLoudnessHistories.length = inputs.length;
    this.shortTermEnergyRunningSums.length = inputs.length;
    this.shortTermSampleAccumulators.length = inputs.length;
    this.shortTermEnergyBuffers.length = inputs.length;
    this.shortTermLoudnessHistories.length = inputs.length;
    this.metrics.length = inputs.length;

    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i] || !inputs[i].length || !inputs[i][0].length) continue;

      this.kWeightingFilters[i] ??= [];
      this.truePeakFilters[i] ??= [];
      this.momentaryEnergyRunningSums[i] ??= new Reference(0);
      this.momentarySampleAccumulators[i] ??= new Reference(0);
      this.momentaryEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * MOMENTARY_WINDOW_SEC));
      this.momentaryLoudnessHistories[i] ??= this.capacity
        ? new CircularBuffer(Math.ceil(this.capacity! / MOMENTARY_HOP_INTERVAL_SEC))
        : new Array();
      this.shortTermEnergyRunningSums[i] ??= new Reference(0);
      this.shortTermSampleAccumulators[i] ??= new Reference(0);
      this.shortTermEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * SHORT_TERM_WINDOW_SEC));
      this.shortTermLoudnessHistories[i] ??= this.capacity
        ? new CircularBuffer(Math.ceil(this.capacity! / SHORT_TERM_HOP_INTERVAL_SEC))
        : new Array();
      this.metrics[i] ??= {
        momentaryLoudness: Number.NEGATIVE_INFINITY,
        shortTermLoudness: Number.NEGATIVE_INFINITY,
        integratedLoudness: Number.NEGATIVE_INFINITY,
        maximumMomentaryLoudness: Number.NEGATIVE_INFINITY,
        maximumShortTermLoudness: Number.NEGATIVE_INFINITY,
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
        loudnessRange: Number.NEGATIVE_INFINITY,
      };

      this.kWeightingFilters[i].length = inputs[i].length;
      this.truePeakFilters[i].length = inputs[i].length;

      for (let j = 0; j < inputs[i].length; j++) {
        this.kWeightingFilters[i][j] ??= [
          new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highshelf.a, K_WEIGHTING_COEFFICIENTS.highshelf.b),
          new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highpass.a, K_WEIGHTING_COEFFICIENTS.highpass.b),
        ];

        this.truePeakFilters[i][j] ??= [
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase0),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase1),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase2),
          new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase3),
        ];
      }

      process(inputs[i], {
        metrics: this.metrics[i],
        kWeightingFilters: this.kWeightingFilters[i],
        truePeakFilters: this.truePeakFilters[i],
        momentaryEnergyBuffer: this.momentaryEnergyBuffers[i],
        momentaryEnergyRunningSum: this.momentaryEnergyRunningSums[i],
        momentarySampleAccumulator: this.momentarySampleAccumulators[i],
        momentaryLoudnessHistory: this.momentaryLoudnessHistories[i],
        shortTermEnergyBuffer: this.shortTermEnergyBuffers[i],
        shortTermEnergyRunningSum: this.shortTermEnergyRunningSums[i],
        shortTermLoudnessHistory: this.shortTermLoudnessHistories[i],
        shortTermSampleAccumulator: this.shortTermSampleAccumulators[i],
      });
    }
  }

  #passThrough(inputs: Float32Array[][], outputs: Float32Array[][]): void {
    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }
  }

  #postMessage(message?: any): void {
    this.port.postMessage(message);
  }

  #energyToLoudness(energy: number): number {
    return -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON));
  }

  #loudnessToEnergy(loudness: number): number {
    return Math.pow(10, (loudness + 0.691) / 10);
  }
}

export { LoudnessProcessor };
