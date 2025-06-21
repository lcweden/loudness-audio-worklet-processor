import { Metrics } from '../types';
import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import {
  CHANNEL_WEIGHT_FACTORS,
  FIR_COEFFICIENTS,
  K_WEIGHTING_BIQUAD_COEFFICIENTS,
  LOUDNESS_RANGE_LOWER_PERCENTILE,
  LOUDNESS_RANGE_UPPER_PERCENTILE,
  MOMENTARY_HOP_INTERVAL_SEC,
  MOMENTARY_WINDOW_SEC,
  SHORT_TERM_HOP_INTERVAL_SEC,
  SHORT_TERM_WINDOW_SEC,
} from './constants';
import { FiniteImpulseResponseFilter } from './finite-impulse-response-filter';

/**
 * Loudness Algorithm Implementation (ITU-R BS.1770-5)
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  kWeightingFilters: [BiquadraticFilter, BiquadraticFilter][][] = [];
  truePeakFilters: FiniteImpulseResponseFilter[][][] = [];
  momentaryEnergyBuffers: CircularBuffer<number>[] = [];
  shortTermEnergyBuffers: CircularBuffer<number>[] = [];
  shortTermLoudnessHistory: Array<number>[] = [];
  integratedEnergyBlocks: Array<number>[] = [];
  metrics: Metrics[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);

    for (let i = 0; i < options.numberOfInputs; i++) {
      this.metrics[i] = {
        momentaryLoudness: Number.NEGATIVE_INFINITY,
        shortTermLoudness: Number.NEGATIVE_INFINITY,
        integratedLoudness: Number.NEGATIVE_INFINITY,
        loudnessRange: Number.NEGATIVE_INFINITY,
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
      };
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const kWeightedInputs: Float32Array[][] = [];

    for (let i = 0; i < inputs.length; i++) {
      this.kWeightingFilters[i] ??= [];
      this.truePeakFilters[i] ??= [];
      kWeightedInputs[i] = [];

      for (let j = 0; j < inputs[i].length; j++) {
        this.kWeightingFilters[i][j] ??= [
          new BiquadraticFilter(
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.a,
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.b
          ),
          new BiquadraticFilter(K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.a, K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.b),
        ];
        this.truePeakFilters[i][j] ??= FIR_COEFFICIENTS.map(
          (coefficients) => new FiniteImpulseResponseFilter(coefficients)
        );
        kWeightedInputs[i][j] = new Float32Array(inputs[i][j].length);

        for (let k = 0; k < inputs[i][j].length; k++) {
          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[i][j];
          const highshelfOutput = highshelfFilter.process(inputs[i][j][k]);
          const highpassOutput = highpassFilter.process(highshelfOutput);
          kWeightedInputs[i][j][k] = highpassOutput;

          const attenuation = Math.pow(10, -12.04 / 20);
          const attenuatedSample = inputs[i][j][k] * attenuation;
          const truePeaks = [];

          for (const filter of this.truePeakFilters[i][j]) {
            truePeaks.push(Math.abs(filter.process(attenuatedSample)));
          }

          const maximumTruePeak = Math.max(...truePeaks);
          const maximumTruePeakLevel = 20 * Math.log10(maximumTruePeak) + 12.04;

          this.metrics[i].maximumTruePeakLevel = Math.max(this.metrics[i].maximumTruePeakLevel, maximumTruePeakLevel);
        }
      }
    }

    for (let i = 0; i < kWeightedInputs.length; i++) {
      const momentaryWindowSize = Math.round(sampleRate * MOMENTARY_WINDOW_SEC);
      const shortTermWindowSize = Math.round(sampleRate * SHORT_TERM_WINDOW_SEC);

      this.momentaryEnergyBuffers[i] ??= new CircularBuffer(momentaryWindowSize);
      this.shortTermEnergyBuffers[i] ??= new CircularBuffer(shortTermWindowSize);

      const channelNumber = inputs[i].length as keyof typeof CHANNEL_WEIGHT_FACTORS;
      const channelWeights = Object.values(CHANNEL_WEIGHT_FACTORS[channelNumber] ?? {});

      for (let j = 0; j < kWeightedInputs[i][0].length; j++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let k = 0; k < kWeightedInputs[i].length; k++) {
          const sampleEnergy = kWeightedInputs[i][k][j] ** 2;
          const channelWeight = channelWeights[k] ?? 1.0;
          sumOfSquaredChannelWeightedSamples += sampleEnergy * channelWeight;
        }

        this.momentaryEnergyBuffers[i].push(sumOfSquaredChannelWeightedSamples);
        this.shortTermEnergyBuffers[i].push(sumOfSquaredChannelWeightedSamples);
      }
    }

    for (let i = 0; i < this.momentaryEnergyBuffers.length; i++) {
      const momentaryHopSize = Math.round(sampleRate * MOMENTARY_HOP_INTERVAL_SEC);

      this.integratedEnergyBlocks[i] ??= new Array();

      if (!this.momentaryEnergyBuffers[i].isFull()) {
        continue;
      }

      if (currentFrame % momentaryHopSize !== 0) {
        continue;
      }

      const energies = this.momentaryEnergyBuffers[i].slice();
      const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const loudness = -0.691 + 10 * Math.log10(Math.max(meanEnergy, Number.EPSILON));

      this.metrics[i].momentaryLoudness = loudness;
      this.integratedEnergyBlocks[i].push(meanEnergy);
    }

    for (let i = 0; i < this.shortTermEnergyBuffers.length; i++) {
      const shortTermHopSize = Math.round(sampleRate * SHORT_TERM_HOP_INTERVAL_SEC);

      if (!this.shortTermEnergyBuffers[i].isFull()) {
        continue;
      }

      if (currentFrame % shortTermHopSize !== 0) {
        continue;
      }

      this.shortTermLoudnessHistory[i] ??= new Array();

      const energies = this.shortTermEnergyBuffers[i].slice();
      const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const loudness = -0.691 + 10 * Math.log10(Math.max(meanEnergy, Number.EPSILON));

      this.metrics[i].shortTermLoudness = loudness;
      this.shortTermLoudnessHistory[i].push(loudness);
    }

    for (let i = 0; i < this.shortTermLoudnessHistory.length; i++) {
      if (this.shortTermLoudnessHistory[i].length < 2) {
        continue;
      }

      const absoluteGatedLoudnesses = this.shortTermLoudnessHistory[i].filter((loudness) => loudness > -70);

      if (absoluteGatedLoudnesses.length < 2) {
        continue;
      }

      const absoluteGatedEnergies = absoluteGatedLoudnesses.map((loudness) => Math.pow(10, (loudness + 0.691) / 10));
      const sumOfAbsoluteGatedEnergy = absoluteGatedEnergies.reduce((a, b) => a + b, 0);
      const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergies.length;
      const relativeGatedloudness = -0.691 + 10 * Math.log10(Math.max(absoluteGatedMeanEnergy, Number.EPSILON));
      const relativeGatedLoudnesses = absoluteGatedLoudnesses.filter(
        (loudness) => loudness > relativeGatedloudness + -20
      );

      if (relativeGatedLoudnesses.length < 2) {
        continue;
      }

      const sortedLoudnesses = relativeGatedLoudnesses.toSorted((a, b) => a - b);
      const [lowerPercentile, upperPercentile] = [LOUDNESS_RANGE_LOWER_PERCENTILE, LOUDNESS_RANGE_UPPER_PERCENTILE].map(
        (percentile) => {
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
        }
      );

      const loudnessRange = upperPercentile - lowerPercentile;
      this.metrics[i].loudnessRange = loudnessRange;
    }

    for (let i = 0; i < this.integratedEnergyBlocks.length; i++) {
      const integratedLoudnesses = this.integratedEnergyBlocks[i].map(
        (energy) => -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON))
      );
      const absoluteGatedEnergyBlocks = this.integratedEnergyBlocks[i].filter(
        (_, index) => integratedLoudnesses[index] > -70
      );

      if (!absoluteGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfAbsoluteGatedEnergy = absoluteGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergyBlocks.length;
      const absoluteGatedLoudness = -0.691 + 10 * Math.log10(Math.max(absoluteGatedMeanEnergy, Number.EPSILON));
      const relativeGatedEnergyBlocks = absoluteGatedEnergyBlocks.filter(
        (energy) => -0.691 + 10 * Math.log10(Math.max(energy, Number.EPSILON)) > absoluteGatedLoudness + -10
      );

      if (!relativeGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfRelativeGatedEnergy = relativeGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const relativeGatedMeanEnergy = sumOfRelativeGatedEnergy / relativeGatedEnergyBlocks.length;
      const loudness = -0.691 + 10 * Math.log10(Math.max(relativeGatedMeanEnergy, Number.EPSILON));

      this.metrics[i].integratedLoudness = loudness;
    }

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }

    this.port.postMessage({ currentFrame, currentTime, currentMetrics: this.metrics });

    return true;
  }
}

export { LoudnessProcessor };
