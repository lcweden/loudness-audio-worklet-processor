import { Metrics, Repeat } from "../types";
import { BiquadraticFilter } from "./biquadratic-filter";
import { CircularBuffer } from "./circular-buffer";
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
  TRUE_PEAK_COEFFICIENTS
} from "./constants";
import { FiniteImpulseResponseFilter } from "./finite-impulse-response-filter";

/**
 * Loudness Algorithm Implementation (ITU-R BS.1770-5)
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  capacity: number | null = null;
  interval: number | null = null;
  lastTime: number = 0;
  metrics: Metrics[] = [];
  kWeightingFilters: Repeat<BiquadraticFilter, 2>[][] = [];
  truePeakFilters: Repeat<FiniteImpulseResponseFilter, 4>[][] = [];
  momentaryEnergyBuffers: CircularBuffer<number>[] = [];
  momentaryEnergyRunningSums: number[] = [];
  momentarySampleAccumulators: number[] = [];
  momentaryLoudnessHistories: number[][] | CircularBuffer<number>[] = [];
  shortTermEnergyBuffers: CircularBuffer<number>[] = [];
  shortTermEnergyRunningSums: number[] = [];
  shortTermLoudnessHistories: number[][] | CircularBuffer<number>[] = [];
  shortTermSampleAccumulators: number[] = [];

  constructor(options: AudioWorkletNodeOptions) {
    super();

    const { numberOfInputs = 1, numberOfOutputs = 1, outputChannelCount, processorOptions } = options;

    if (processorOptions) {
      const { capacity, interval } = processorOptions;

      this.capacity = capacity ?? null;
      this.interval = interval ?? null;
    }

    for (let index = 0; index < numberOfInputs; index++) {
      this.momentaryEnergyRunningSums[index] = 0;
      this.momentarySampleAccumulators[index] = 0;
      this.momentaryEnergyBuffers[index] = new CircularBuffer(Math.round(sampleRate * MOMENTARY_WINDOW_SEC));
      this.momentaryLoudnessHistories[index] = this.capacity
        ? new CircularBuffer(Math.ceil(this.capacity / MOMENTARY_HOP_INTERVAL_SEC))
        : new Array();
      this.shortTermEnergyRunningSums[index] = 0;
      this.shortTermSampleAccumulators[index] = 0;
      this.shortTermEnergyBuffers[index] = new CircularBuffer(Math.round(sampleRate * SHORT_TERM_WINDOW_SEC));
      this.shortTermLoudnessHistories[index] = this.capacity
        ? new CircularBuffer(Math.ceil(this.capacity / SHORT_TERM_HOP_INTERVAL_SEC))
        : new Array();
      this.metrics[index] = {
        momentaryLoudness: Number.NEGATIVE_INFINITY,
        shortTermLoudness: Number.NEGATIVE_INFINITY,
        integratedLoudness: Number.NEGATIVE_INFINITY,
        maximumMomentaryLoudness: Number.NEGATIVE_INFINITY,
        maximumShortTermLoudness: Number.NEGATIVE_INFINITY,
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
        loudnessRange: Number.NEGATIVE_INFINITY
      };
    }

    for (let index = 0; index < numberOfOutputs; index++) {
      const channelCount = outputChannelCount ? outputChannelCount[index] : 24;

      this.kWeightingFilters[index] = Array.from({ length: channelCount }, () => [
        new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highshelf.a, K_WEIGHTING_COEFFICIENTS.highshelf.b),
        new BiquadraticFilter(K_WEIGHTING_COEFFICIENTS.highpass.a, K_WEIGHTING_COEFFICIENTS.highpass.b)
      ]);

      this.truePeakFilters[index] = Array.from({ length: channelCount }, () => [
        new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase0),
        new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase1),
        new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase2),
        new FiniteImpulseResponseFilter(TRUE_PEAK_COEFFICIENTS.lowpass.phase3)
      ]);
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const inputsCount = inputs.length;

    for (let inputIdx = 0; inputIdx < inputsCount; inputIdx++) {
      const channels = inputs[inputIdx];
      const channelCount = channels.length;
      const sampleCount = channels[0].length;
      const channelWeights = Object.values(CHANNEL_WEIGHT_FACTORS[channelCount] || CHANNEL_WEIGHT_FACTORS[1]);
      const attenuation = Math.pow(10, -ATTENUATION_DB / 20);

      for (let sampleIdx = 0; sampleIdx < sampleCount; sampleIdx++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let channelIdx = 0; channelIdx < channelCount; channelIdx++) {
          const sample = channels[channelIdx][sampleIdx];
          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[inputIdx][channelIdx];
          const highshelfOutput = highshelfFilter.process(sample);
          const kWeightedSample = highpassFilter.process(highshelfOutput);
          const sampleEnergy = kWeightedSample ** 2;
          const channelWeight = channelWeights[channelIdx] ?? 1.0;

          sumOfSquaredChannelWeightedSamples += sampleEnergy * channelWeight;

          const attenuatedSample = channels[channelIdx][sampleIdx] * attenuation;
          const oversample = sampleRate >= 96000 ? 2 : 4;
          const truePeaks = [];

          for (let l = 0; l < oversample; l++) {
            const filter = this.truePeakFilters[inputIdx][channelIdx][l];
            truePeaks.push(Math.abs(filter.process(attenuatedSample)));
          }

          const maximumTruePeakLevel = 20 * Math.log10(Math.max(...truePeaks)) + ATTENUATION_DB;
          const previousMaximumTruePeakLevel = this.metrics[inputIdx].maximumTruePeakLevel;

          this.metrics[inputIdx].maximumTruePeakLevel = Math.max(previousMaximumTruePeakLevel, maximumTruePeakLevel);
        }

        const energy = sumOfSquaredChannelWeightedSamples;

        const previousMomentaryEnergy = this.momentaryEnergyBuffers[inputIdx].peek() ?? 0;
        const previousMomentaryEnergyForSum = this.momentaryEnergyBuffers[inputIdx].isFull()
          ? previousMomentaryEnergy
          : 0;

        this.momentaryEnergyRunningSums[inputIdx] += energy - previousMomentaryEnergyForSum;
        this.momentaryEnergyBuffers[inputIdx].push(energy);

        const previousShortTermEnergy = this.shortTermEnergyBuffers[inputIdx].peek() ?? 0;
        const previousShortTermEnergyForSum = this.shortTermEnergyBuffers[inputIdx].isFull()
          ? previousShortTermEnergy
          : 0;

        this.shortTermEnergyRunningSums[inputIdx] += energy - previousShortTermEnergyForSum;
        this.shortTermEnergyBuffers[inputIdx].push(energy);

        if (this.momentaryEnergyBuffers[inputIdx].isFull()) {
          const meanEnergy = this.momentaryEnergyRunningSums[inputIdx] / this.momentaryEnergyBuffers[inputIdx].capacity;
          const momentaryLoudness = this.#energyToLoudness(meanEnergy);

          this.metrics[inputIdx].momentaryLoudness = momentaryLoudness;
          this.metrics[inputIdx].maximumMomentaryLoudness = Math.max(
            this.metrics[inputIdx].maximumMomentaryLoudness,
            momentaryLoudness
          );
        }
      }

      this.momentarySampleAccumulators[inputIdx] += sampleCount;
      const momentaryHopSize = Math.round(sampleRate * MOMENTARY_HOP_INTERVAL_SEC);

      while (this.momentarySampleAccumulators[inputIdx] >= momentaryHopSize) {
        if (this.momentaryEnergyBuffers[inputIdx].isFull()) {
          const meanEnergy = this.momentaryEnergyRunningSums[inputIdx] / this.momentaryEnergyBuffers[inputIdx].capacity;
          const momentaryLoudness = this.#energyToLoudness(meanEnergy);

          this.momentaryLoudnessHistories[inputIdx].push(momentaryLoudness);
        }

        this.momentarySampleAccumulators[inputIdx] -= momentaryHopSize;
      }

      this.shortTermSampleAccumulators[inputIdx] += sampleCount;
      const shortTermHopSize = Math.round(sampleRate * SHORT_TERM_HOP_INTERVAL_SEC);

      while (this.shortTermSampleAccumulators[inputIdx] >= shortTermHopSize) {
        if (this.shortTermEnergyBuffers[inputIdx].isFull()) {
          const meanEnergy = this.shortTermEnergyRunningSums[inputIdx] / this.shortTermEnergyBuffers[inputIdx].capacity;
          const shortTermLoudness = this.#energyToLoudness(meanEnergy);

          this.metrics[inputIdx].shortTermLoudness = shortTermLoudness;
          this.metrics[inputIdx].maximumShortTermLoudness = Math.max(
            this.metrics[inputIdx].maximumShortTermLoudness,
            shortTermLoudness
          );

          this.shortTermLoudnessHistories[inputIdx].push(shortTermLoudness);
        }

        this.shortTermSampleAccumulators[inputIdx] -= shortTermHopSize;
      }

      if (this.momentaryLoudnessHistories[inputIdx].length > 2) {
        const absoluteGatedLoudnesses = Array.from(this.momentaryLoudnessHistories[inputIdx]).filter(
          (v) => v > LUFS_ABSOLUTE_THRESHOLD
        );

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

            this.metrics[inputIdx].integratedLoudness = integratedLoudness;
          }
        }
      }

      if (this.shortTermLoudnessHistories[inputIdx].length > 2) {
        const absoluteGatedLoudnesses = Array.from(this.shortTermLoudnessHistories[inputIdx]).filter(
          (v) => v > LRA_ABSOLUTE_THRESHOLD
        );

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
              LOUDNESS_RANGE_UPPER_PERCENTILE
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
            this.metrics[inputIdx].loudnessRange = loudnessRange;
          }
        }
      }
    }

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }

    if (currentTime - this.lastTime >= Number(this.interval)) {
      const snapshot = { currentFrame, currentTime, currentMetrics: this.metrics };
      this.port.postMessage(snapshot);
      this.lastTime = currentTime;
    }

    return true;
  }

  #energyToLoudness(energy: number): number {
    return -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON));
  }

  #loudnessToEnergy(loudness: number): number {
    return Math.pow(10, (loudness + 0.691) / 10);
  }
}

export { LoudnessProcessor };
