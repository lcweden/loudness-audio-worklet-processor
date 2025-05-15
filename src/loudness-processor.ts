import { Metrics } from '../types';
import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import {
  CHANNEL_WEIGHT_FACTORS,
  FIR_COEFFICIENTS,
  K_WEIGHTING_BIQUAD_COEFFICIENTS,
  LOUDNESS_RANGE_LOWER_PERCENTILE,
  LOUDNESS_RANGE_UPPER_PERCENTILE,
  MIN_GATE_LOUDNESS,
  MOMENTARY_HOP_INTERVAL_SEC,
  MOMENTARY_WINDOW_SEC,
  RELATIVE_GATE_OFFSET,
  SHORT_TERM_HOP_INTERVAL_SEC,
  SHORT_TERM_WINDOW_SEC,
} from './constants';
import { FiniteImpulseResponseFilter } from './finite-impulse-response-filter';
import { calculateLufs } from './utils';

/**
 * A class that implements the loudness algorithm as specified in ITU-R BS.1771.
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
    const weightedInputs: Float32Array[][] = [];

    for (let i = 0; i < inputs.length; i++) {
      this.kWeightingFilters[i] ??= [];
      this.truePeakFilters[i] ??= [];
      weightedInputs[i] = [];

      for (let j = 0; j < inputs[i].length; j++) {
        this.kWeightingFilters[i][j] ??= [
          new BiquadraticFilter(
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.a,
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.b
          ),
          new BiquadraticFilter(
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.a,
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.b
          ),
        ];
        this.truePeakFilters[i][j] ??= FIR_COEFFICIENTS.map(
          (coefficients) => new FiniteImpulseResponseFilter(coefficients)
        );
        weightedInputs[i][j] = new Float32Array(inputs[i][j].length);

        for (let k = 0; k < inputs[i][j].length; k++) {
          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[i][j];
          const highshelfOutput = highshelfFilter.process(inputs[i][j][k]);
          const highpassOutput = highpassFilter.process(highshelfOutput);
          const kWeightedSample = highpassOutput;
          const channelWeightedSample = kWeightedSample * CHANNEL_WEIGHT_FACTORS[j];

          weightedInputs[i][j][k] = channelWeightedSample;

          const attenuation = Math.pow(10, -12.04 / 20);
          const attenuatedSample = inputs[i][j][k] * attenuation;
          const truePeaks = [];

          for (const filter of this.truePeakFilters[i][j]) {
            truePeaks.push(Math.abs(filter.process(attenuatedSample)));
          }

          const maximumTruePeak = Math.max(...truePeaks);
          const maximumTruePeakLevel = 20 * Math.log10(maximumTruePeak) + 12.04;

          this.metrics[i].maximumTruePeakLevel = Math.max(
            this.metrics[i].maximumTruePeakLevel,
            maximumTruePeakLevel
          );
        }
      }
    }

    for (let i = 0; i < weightedInputs.length; i++) {
      const momentaryWindowSize = Math.round(sampleRate * MOMENTARY_WINDOW_SEC);
      const shortTermWindowSize = Math.round(sampleRate * SHORT_TERM_WINDOW_SEC);

      this.momentaryEnergyBuffers[i] ??= new CircularBuffer(momentaryWindowSize);
      this.shortTermEnergyBuffers[i] ??= new CircularBuffer(shortTermWindowSize);

      for (let j = 0; j < weightedInputs[0][0].length; j++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let k = 0; k < weightedInputs[0].length; k++) {
          sumOfSquaredChannelWeightedSamples += weightedInputs[i][k][j] ** 2;
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
      const loudness = calculateLufs(meanEnergy);

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
      const loudness = calculateLufs(meanEnergy);

      this.metrics[i].shortTermLoudness = loudness;
      this.shortTermLoudnessHistory[i].push(loudness);
    }

    for (let i = 0; i < this.shortTermLoudnessHistory.length; i++) {
      if (this.shortTermLoudnessHistory[i].length < 2) {
        continue;
      }

      const sortedLoudnesses = this.shortTermLoudnessHistory[i].toSorted((a, b) => a - b);
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

      this.metrics[i].loudnessRange = loudnessRange;
    }

    for (let i = 0; i < this.integratedEnergyBlocks.length; i++) {
      const integratedLoudnesses = this.integratedEnergyBlocks[i].map(calculateLufs);
      const absoluteGatedEnergyBlocks = this.integratedEnergyBlocks[i].filter(
        (_, index) => integratedLoudnesses[index] > MIN_GATE_LOUDNESS
      );

      if (!absoluteGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfAbsoluteGatedEnergy = absoluteGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergyBlocks.length;
      const absoluteGatedLoudness = calculateLufs(absoluteGatedMeanEnergy);
      const relativeGatedEnergyBlocks = absoluteGatedEnergyBlocks.filter(
        (energy) => calculateLufs(energy) > absoluteGatedLoudness + RELATIVE_GATE_OFFSET
      );

      if (!relativeGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfRelativeGatedEnergy = relativeGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const relativeGatedMeanEnergy = sumOfRelativeGatedEnergy / relativeGatedEnergyBlocks.length;
      const loudness = calculateLufs(relativeGatedMeanEnergy);

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
