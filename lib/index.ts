/**
 * A class that implements the loudness algorithm as specified in ITU-R BS.1770-5.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class _ extends AudioWorkletProcessor {
  static FRAMES_SIZE = 128;

  static SAMPLE_RATE: number = 48000;

  /**
   * 400ms gating block
   */
  static BLOCK_DURATION = 0.4;

  /**
   * 75% overlap
   */
  static BLOCK_OVERLAP = 0.75;

  static BLOCK_SAMPLE_SIZE = Math.floor(_.SAMPLE_RATE * _.BLOCK_DURATION);

  static BLOCK_HOP_SAMPLES = Math.floor(
    _.BLOCK_SAMPLE_SIZE * (1 - _.BLOCK_OVERLAP),
  );

  static K_WEIGHTING_FILTERS: { a: number[]; b: number[] }[] = [
    {
      a: [1.0, -1.69065929318241, 0.73248077421585],
      b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    },
    {
      a: [1.0, -1.99004745483398, 0.99007225036621],
      b: [1.0, -2.0, 1.0],
    },
  ];

  static CHANNEL_WEIGHTS = [1.0, 1.0, 1.0, 0.0, 1.41, 1.41, 1.41, 1.41];

  kWeightingFilterStates: { x: Float32Array; y: Float32Array }[][][] = [];

  blockBuffers: number[][] = [];

  blockHistories: number[][] = [];

  data: { gatedBlock: number; integratedLufs: number }[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);

    for (let i = 0; i < options.numberOfInputs; i++) {
      this.data[i] = { gatedBlock: 0, integratedLufs: -Infinity };
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const framesPerBlock = Math.floor(_.BLOCK_SAMPLE_SIZE / _.FRAMES_SIZE);
    const framesPerHop = Math.floor(_.BLOCK_HOP_SAMPLES / _.FRAMES_SIZE);
    const filteredSamples: number[][][] = [];
    const meanSquares: number[][] = [];
    const weightedMeanSquares: number[] = [];

    /**
     * Stage 1: “K” frequency weighting
     */
    for (let i = 0; i < inputs.length; i++) {
      if (!this.kWeightingFilterStates[i]) {
        this.kWeightingFilterStates[i] = new Array(inputs[i].length);
      }

      for (let j = 0; j < inputs[i].length; j++) {
        if (!this.kWeightingFilterStates[i][j]) {
          this.kWeightingFilterStates[i][j] = Array.from({ length: 2 }, () => ({
            x: new Float32Array(3).fill(0),
            y: new Float32Array(2).fill(0),
          }));
        }

        if (!filteredSamples[i]) {
          filteredSamples[i] = [];
        }

        for (let k = 0; k < inputs[i][j].length; k++) {
          if (!filteredSamples[i][j]) {
            filteredSamples[i][j] = [];
          }

          const filters = Array.from({ length: 2 }, (_v, k) => ({
            state: this.kWeightingFilterStates[i][j][k],
            coefficient: _.K_WEIGHTING_FILTERS[k],
          }));

          filters[0].state.x[2] = filters[0].state.x[1];
          filters[0].state.x[1] = filters[0].state.x[0];
          filters[0].state.x[0] = inputs[i][j][k];

          const result1 =
            filters[0].coefficient.b[0] * filters[0].state.x[0] +
            filters[0].coefficient.b[1] * filters[0].state.x[1] +
            filters[0].coefficient.b[2] * filters[0].state.x[2] -
            filters[0].coefficient.a[1] * filters[0].state.y[0] -
            filters[0].coefficient.a[2] * filters[0].state.y[1];

          filters[0].state.y[1] = filters[0].state.y[0];
          filters[0].state.y[0] = result1;

          filters[1].state.x[2] = filters[1].state.x[1];
          filters[1].state.x[1] = filters[1].state.x[0];
          filters[1].state.x[0] = result1;

          const result2 =
            filters[1].coefficient.b[0] * filters[1].state.x[0] +
            filters[1].coefficient.b[1] * filters[1].state.x[1] +
            filters[1].coefficient.b[2] * filters[1].state.x[2] -
            filters[1].coefficient.a[1] * filters[1].state.y[0] -
            filters[1].coefficient.a[2] * filters[1].state.y[1];

          filters[1].state.y[1] = filters[1].state.y[0];
          filters[1].state.y[0] = result2;

          filteredSamples[i][j][k] = result2;

          outputs[i][j].set(inputs[i][j]);
        }
      }
    }

    /**
     * Stage 2: Mean square calculation for each channel
     */
    for (let i = 0; i < filteredSamples.length; i++) {
      if (!meanSquares[i]) {
        meanSquares[i] = [];
      }

      for (let j = 0; j < filteredSamples[i].length; j++) {
        let sum = 0;

        for (let k = 0; k < filteredSamples[i][j].length; k++) {
          sum += filteredSamples[i][j][k] ** 2;
        }

        meanSquares[i][j] = sum / (filteredSamples[i][j].length || 1);
      }
    }

    /**
     * Stage 3: Channel-weighted summation, surround channels have larger weights, and the LFE channel is excluded
     */
    for (let i = 0; i < meanSquares.length; i++) {
      let sum = 0;

      for (let j = 0; j < meanSquares[i].length; j++) {
        sum += (_.CHANNEL_WEIGHTS[j] ?? 1.0) * meanSquares[i][j];
      }

      weightedMeanSquares[i] = sum;
    }

    /**
     * Stage 4: Gating of 400 ms blocks (overlapping by 75%), where two thresholds are used
     * - the first at −70 LKFS;
     * - the second at −10 dB relative to the level measured after application of the first threshold;
     */
    for (let i = 0; i < weightedMeanSquares.length; i++) {
      if (!this.blockBuffers[i]) {
        this.blockBuffers[i] = [];
      }

      if (!this.blockHistories[i]) {
        this.blockHistories[i] = [];
      }

      this.blockBuffers[i].push(weightedMeanSquares[i]);
    }

    for (let i = 0; i < this.blockBuffers.length; i++) {
      if (this.blockBuffers[i].length * _.FRAMES_SIZE >= _.BLOCK_SAMPLE_SIZE) {
        const samples = this.blockBuffers[i].slice(0, framesPerBlock);
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

        this.blockBuffers[i].splice(0, framesPerHop);
        this.blockHistories[i].push(mean);
      }
    }

    for (let i = 0; i < this.blockHistories.length; i++) {
      if (!this.blockHistories[i] || this.blockHistories[i].length === 0) {
        this.data[i].integratedLufs = -Infinity;
        continue;
      }

      const nonGatedLufs: number[] = [];

      for (let j = 0; j < this.blockHistories[i].length; j++) {
        if (this.blockHistories[i][j] > 0) {
          nonGatedLufs.push(
            -0.691 + 10 * Math.log10(this.blockHistories[i][j]),
          );
        } else {
          nonGatedLufs.push(-Infinity);
        }
      }

      const firstStageGatedLufs = nonGatedLufs.filter((v) => v > -70);

      if (firstStageGatedLufs.length === 0) {
        this.data[i].integratedLufs = -Infinity;
        continue;
      }

      const meanLoudness =
        firstStageGatedLufs.reduce((a, b) => a + b, 0) /
        firstStageGatedLufs.length;

      const secondStageGatedLufs = firstStageGatedLufs.filter(
        (v) => v > meanLoudness - 10,
      );

      if (secondStageGatedLufs.length === 0) {
        this.data[i].integratedLufs = -Infinity;
        continue;
      }

      const integratedLufs =
        secondStageGatedLufs.reduce((a, b) => a + b, 0) /
        secondStageGatedLufs.length;

      this.data[i].gatedBlock = secondStageGatedLufs.length;
      this.data[i].integratedLufs = integratedLufs;
    }

    /**
     * Output
     */
    this.port.postMessage(this.data);

    return true;
  }
}

registerProcessor("loudness", _);
