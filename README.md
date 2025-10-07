# Loudness Audio Worklet Processor

[![npm version](https://img.shields.io/npm/v/loudness-worklet.svg)](https://www.npmjs.com/package/loudness-worklet)
[![license](https://img.shields.io/github/license/lcweden/loudness-audio-worklet-processor.svg)](LICENSE)

A loudness meter for the `Web Audio API`, based on the [ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770) standard and implemented as an AudioWorkletProcessor.

[![screenshot](https://github.com/lcweden/loudness-audio-worklet-processor/blob/main/public/screenshots/meter.png)](https://lcweden.github.io/loudness-audio-worklet-processor/)

<p align="center"><a href="https://lcweden.github.io/loudness-audio-worklet-processor/">Demo</a></p>

## Features

- **Loudness Measurement**: Compliant with the **ITU-R BS.1770-5** standard.
- **Comprehensive Metrics**: Calculates Momentary, Short-term, and Integrated Loudness, as well as Loudness Range (LRA) and True-Peak levels.
- **Flexible**: Works with live audio and pre-recorded files.
- **Lightweight**: No external dependencies required.

## Installation

### CDN

Import directly in your code:

```javascript
const module = "https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js";
await audioContext.audioWorklet.addModule(module);
const worklet = new AudioWorkletNode(audioContext, "loudness-processor");
```

### Download

1. Download the pre-built file: [loudness.worklet.js](https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js).
2. Place `loudness.worklet.js` in your project directory (e.g., `/public/`).

```javascript
await audioContext.audioWorklet.addModule("loudness.worklet.js");
const worklet = new AudioWorkletNode(audioContext, "loudness-processor");
```

### NPM

Install via [npm](https://www.npmjs.com/package/loudness-worklet):

```bash
npm install loudness-worklet
```

Use helper functions to create and load the worklet:

```javascript
import { createLoudnessWorklet, LoudnessWorkletNode } from "loudness-worklet";

const worklet = await createLoudnessWorklet(audioContext);

// or

await LoudnessWorkletNode.loadModule(audioContext);
const worklet = new LoudnessWorkletNode(audioContext);
```

## Concepts

### Contexts

Provide the execution environment for audio processing.

#### AudioContext

`AudioContext` is used for real-time audio processing, such as live audio input from a microphone or media stream.

#### OfflineAudioContext

`OfflineAudioContext` is used for processing audio data offline, allowing for rendering and analysis without requiring real-time playback.

### Nodes

Nodes are the building blocks of an audio graph, representing audio sources, processing modules, and destinations. The following nodes are commonly used as a source input:

#### AudioBufferSourceNode

`AudioBufferSourceNode` is used to play audio data stored in an `AudioBuffer`, typically for pre-recorded audio files.

```javascript
const audioContext = new AudioContext();
const arrayBuffer = await file.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
const bufferSource = new AudioBufferSourceNode(audioContext, { buffer: audioBuffer });
```

#### MediaStreamAudioSourceNode

`MediaStreamAudioSourceNode` is used to play audio from a `MediaStream`, such as a live microphone input or a video element.

```javascript
const audioContext = new AudioContext();
const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaStreamSource = new MediaStreamAudioSourceNode(audioContext, { mediaStream });
```

#### MediaElementAudioSourceNode

`MediaElementAudioSourceNode` is used to play audio from an HTML `<audio>` or `<video>` element.

```javascript
const audioContext = new AudioContext();
const mediaElement = document.querySelector("audio");
const elementSource = new MediaElementAudioSourceNode(audioContext, { mediaElement });
```

## Quick Start

### Example

This example shows the easiest way to get started with the Loudness Audio Worklet Processor.

```html
<!DOCTYPE html>
<html>
  <body>
    <button>Share Screen</button>
    <pre></pre>
    <script>
      const module = "https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js";
      const button = document.querySelector("button");
      const pre = document.querySelector("pre");

      button.onclick = async () => {
        // Get the screen stream with audio, for example a youtube tab
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({ audio: true });
        const context = new AudioContext();

        // Load the loudness worklet processor
        await context.audioWorklet.addModule(module);

        // Create the audio node from the stream
        const source = new MediaStreamAudioSourceNode(context, { mediaStream });
        // Create the loudness worklet node
        const worklet = new AudioWorkletNode(context, "loudness-processor", {
          processorOptions: {
            interval: 0.1, // every 0.1s a message will be sent
            capacity: 600 // 1 minute of history can be stored
          }
        });

        worklet.port.onmessage = (event) => {
          pre.textContent = JSON.stringify(event.data, null, 2);
        };

        // Connect the nodes
        source.connect(worklet);
      };
    </script>
  </body>
</html>
```

### File-based measurement

You can measure the loudness of audio files using `OfflineAudioContext`.

```javascript
import { LoudnessWorkletNode } from "loudness-worklet";

const input = document.querySelector("input");

input.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer);
  const { numberOfChannels, length, sampleRate } = audioBuffer;
  const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  await LoudnessWorkletNode.loadModule(context);

  const source = new AudioBufferSourceNode(context, { buffer: audioBuffer });
  const worklet = new LoudnessWorkletNode(context);

  worklet.port.onmessage = (event) => console.log("Loudness Data:", event.data);

  source.connect(worklet).connect(context.destination);
  source.start();

  await context.startRendering();
});
```

### Live-based measurement

Supports all kinds of audio input.

```javascript
import { createLoudnessWorklet } from "loudness-worklet";

const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
const context = new AudioContext({ sampleRate: 48000 });
const source = context.createMediaStreamSource(mediaStream);
const worklet = await createLoudnessWorklet(context, {
  processorOptions: { interval: 1, capacity: 600 }
});

worklet.port.onmessage = (event) => console.log("Loudness Data:", event.data);
source.connect(worklet);

// worklet.connect(context.destination);
// Optionally connect to destination for monitoring (echo)
```

## API

### Options

The `AudioWorkletNode` constructor accepts the following options:

#### Params

| Option                    | Type       | Required | Default | Description                                                                                          |
| ------------------------- | ---------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| numberOfInputs            | `number`   | `N`      | `1`     | Number of input channels.                                                                            |
| numberOfOutputs           | `number`   | `N`      | `1`     | Number of output channels.                                                                           |
| outputChannelCount        | `number[]` | `N`      | -       | Determined at runtime automatically.                                                                 |
| processorOptions.interval | `number`   | `N`      | `null`  | Message interval in seconds.                                                                         |
| processorOptions.capacity | `number`   | `N`      | `null`  | Maximum seconds of history to keep. If set to `null`, the processor will not limit the history size. |

#### Example

Most of the time, you only need to set `processorOptions`.

```javascript
const { numberOfChannels, length, sampleRate } = audioBuffer;
const worklet = new AudioWorkletNode(context, "loudness-processor", {
  numberOfInputs: 1,
  numberOfOutputs: 1,
  outputChannelCount: [numberOfChannels], // Unnecessary
  processorOptions: {
    capacity: length / sampleRate,
    interval: 0.1
  }
});
```

### Message Format

Measurement results are sent back to the main thread via `port.onmessage` with the following format:

```typescript
type AudioLoudnessSnapshot = {
  currentFrame: number;
  currentTime: number;
  currentMetrics: [
    {
      momentaryLoudness: number;
      shortTermLoudness: number;
      integratedLoudness: number;
      maximumMomentaryLoudness: number;
      maximumShortTermLoudness: number;
      maximumTruePeakLevel: number;
      loudnessRange: number;
    }
  ];
};
```

### Units

| Metric                     | Unit          |
| -------------------------- | ------------- |
| `momentaryLoudness`        | `LUFS`/`LKFS` |
| `shortTermLoudness`        | `LUFS`/`LKFS` |
| `integratedLoudness`       | `LUFS`/`LKFS` |
| `maximumMomentaryLoudness` | `LUFS`/`LKFS` |
| `maximumShortTermLoudness` | `LUFS`/`LKFS` |
| `maximumTruePeakLevel`     | `dBTP`        |
| `loudnessRange`            | `LRA`         |

### Supported Channels

Supported channel counts: `1`, `2`, `6`, `8`, `10`, `12`, `24`

> [!NOTE]
> Channel counts not listed above are weighted at `1.0`.

### Coefficients

The following coefficients are used for the K-weighting filter:

|     | highshelf         | highpass          |
| --- | ----------------- | ----------------- |
| a1  | -1.69065929318241 | −1.99004745483398 |
| a2  | 0.73248077421585  | 0.99007225036621  |
| b0  | 1.53512485958697  | 1.0               |
| b1  | -2.69169618940638 | -2.0              |
| b2  | 1.19839281085285  | 1.0               |

The following FIR filter coefficients are used for true-peak measurement:

| Phase 0          | Phase 1          | Phase 2          | Phase 3          |
| ---------------- | ---------------- | ---------------- | ---------------- |
| 0.0017089843750  | −0.0291748046875 | −0.0189208984375 | −0.0083007812500 |
| 0.0109863281250  | 0.0292968750000  | 0.0330810546875  | 0.0148925781250  |
| −0.0196533203125 | −0.0517578125000 | −0.0582275390625 | −0.0266113281250 |
| 0.0332031250000  | 0.0891113281250  | 0.1015625000000  | 0.0476074218750  |
| −0.0594482421875 | −0.1665039062500 | −0.2003173828125 | −0.1022949218750 |
| 0.1373291015625  | 0.4650878906250  | 0.7797851562500  | 0.9721679687500  |
| 0.9721679687500  | 0.7797851562500  | 0.4650878906250  | 0.1373291015625  |
| −0.1022949218750 | −0.2003173828125 | −0.1665039062500 | −0.0594482421875 |
| 0.0476074218750  | 0.1015625000000  | 0.0891113281250  | 0.0332031250000  |
| −0.0266113281250 | −0.0582275390625 | −0.0517578125000 | −0.0196533203125 |
| 0.0148925781250  | 0.0330810546875  | 0.0292968750000  | 0.0109863281250  |
| −0.0083007812500 | −0.0189208984375 | −0.0291748046875 | 0.0017089843750  |

## Validation

### ITU-R BS.2217

The [ITU-R BS.2217](https://www.itu.int/pub/R-REP-BS.2217) test suite provides a table of compliance test files and related information for verifying that a meter
meets the specifications within Recommendation [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770).

| file                                 | measurement | channels |                    |
| ------------------------------------ | ----------- | -------- | ------------------ |
| 1770Comp_2_RelGateTest               | -10.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_AbsGateTest               | -69.5 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_25Hz_2ch           | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_100Hz_2ch          | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_500Hz_2ch          | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_1000Hz_2ch         | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_2000Hz_2ch         | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_10000Hz_2ch        | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_25Hz_2ch           | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_100Hz_2ch          | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_500Hz_2ch          | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_1000Hz_2ch         | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_2000Hz_2ch         | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_10000Hz_2ch        | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_18LKFS_FrequencySweep     | -18.0 LKFS  | 1        | :white_check_mark: |
| 1770Comp_2_24LKFS_SummingTest        | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_SummingTest        | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLeft   | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckRight  | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckCentre | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLFE    | -inf LKFS   | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLs     | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckRs     | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLeft   | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckRight  | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LFKS_ChannelCheckCentre | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLFE    | -inf LKFS   | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLs     | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckRs     | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinCntr-24LKFS       | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL+R-24LKFS        | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL-R-C-24LKFS      | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf Stereo VinL+R-24LKFS     | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770-2 Conf Mono Voice+Music-24LKFS  | -24.0 LKFS  | 1        | :white_check_mark: |
| 1770-2 Conf 6ch VinCntr-23LKFS       | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL+R-23LKFS        | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL-R-C-23LKFS      | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf Stereo VinL+R-23LKFS     | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770-2 Conf Mono Voice+Music-23LKFS  | -23.0 LKFS  | 1        | :white_check_mark: |
| 1770Conf-8channels_24LKFS            | -24.0 LKFS  | 8        | :white_check_mark: |
| 1770Conf-8channels_23LKFS            | -23.0 LKFS  | 8        | :white_check_mark: |
| 1770Conf-10channels_24LKFS           | -24.0 LKFS  | 10       | :white_check_mark: |
| 1770Conf-10channels_23LKFS           | -23.0 LKFS  | 10       | :white_check_mark: |
| 1770Conf-12channels_24LKFS           | -24.0 LKFS  | 12       | :white_check_mark: |
| 1770Conf-12channels_23LKFS           | -23.0 LKFS  | 12       | :white_check_mark: |
| 1770Conf-24channels_24LKFS           | -24.0 LKFS  | 24       | :white_check_mark: |
| 1770Conf-24channels_23LKFS           | -23.0 LKFS  | 24       | :white_check_mark: |

> [!TIP]
> If `decodeAudioData` fails, it's often due to the browser's specific support for the audio file's format (codec), container, or channel layout, rather than a general API incompatibility.
> Try a different browser or convert the audio file to a more widely supported format.
> For example, Chrome has limited support for certain codecs in audio files, while Safari offers broader support. (1770Conf-24channels_24LKFS)

### EBU TECH 3341 Minimum requirements test signals

[EBU TECH 3341](https://tech.ebu.ch/publications/tech3341) defines minimum requirements and corresponding test signals for verifying momentary, short-term, and integrated loudness accuracy, gating behavior, and true-peak measurement.

| file                                 | expected response and accepted tolerances                   |                    |
| ------------------------------------ | ----------------------------------------------------------- | ------------------ |
| seq-3341-1-16bit                     | M, S, I = −23.0 ±0.1 LUFS                                   | :white_check_mark: |
| seq-3341-2-16bit                     | M, S, I = −33.0 ±0.1 LUFS                                   | :white_check_mark: |
| seq-3341-3-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-4-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-5-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-6-6channels-WAVEEX-16bit    | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-7_seq-3342-5-24bit          | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-2011-8_seq-3342-6-24bit-v02 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-9-24bit                     | S = −23.0 ±0.1 LUFS, constant after 3 s                     | :white_check_mark: |
| seq-3341-10-\*-24bit                 | Max S = −23.0 ±0.1 LUFS, for each segment                   | :white_check_mark: |
| seq-3341-11-24bit                    | Max S = −38.0, −37.0, …, −19.0 ±0.1 LUFS, successive values | :white_check_mark: |
| seq-3341-12-24bit                    | M = −23.0 ±0.1 LUFS, constant after 1 s                     | :white_check_mark: |
| seq-3341-13-\*-24bit                 | Max M = −23.0 ±0.1 LUFS, for each segment                   | :white_check_mark: |
| seq-3341-14-24bit                    | Max M = −38.0, …, −19.0 ±0.1 LUFS, successive values        | :white_check_mark: |
| seq-3341-15-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-16-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-17-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-18-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-19-24bit                    | Max true-peak = +3.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-20-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-21-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-22-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-23-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |

### EBU TECH 3342 Minimum requirements test signals

[EBU TECH 3342](https://tech.ebu.ch/publications/tech3342) focuses on the measurement of loudness range.

| file                                 | expected response and accepted tolerances |                    |
| ------------------------------------ | ----------------------------------------- | ------------------ |
| seq-3342-1-16bit                     | LRA = 10 ±1 LU                            | :white_check_mark: |
| seq-3342-2-16bit                     | LRA = 5 ±1 LU                             | :white_check_mark: |
| seq-3342-3-16bit                     | LRA = 20 ±1 LU                            | :white_check_mark: |
| seq-3342-4-16bit                     | LRA = 15 ±1 LU                            | :white_check_mark: |
| seq-3341-7_seq-3342-5-24bit          | LRA = 5 ±1 LU                             | :white_check_mark: |
| seq-3341-2011-8_seq-3342-6-24bit-v02 | LRA = 15 ±1 LU                            | :white_check_mark: |

## Acknowledgments

This project is a learning experiment aimed at exploring audio signal processing and ITU-R BS.1770 loudness measurement standards. I am not an expert in audio engineering or signal processing, and this project was developed as a way to better understand the concepts of audio loudness and implementation techniques. Thanks to the ITU-R BS.1770 standards for providing the theoretical basis for loudness measurement.

## License

This project is licensed under the [MIT License](LICENSE).

## References

- [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770)
- [ITU-R BS.2217](https://www.itu.int/pub/R-REP-BS.2217)
- [EBU Tech 3341](https://tech.ebu.ch/publications/tech3341)
- [EBU Tech 3342](https://tech.ebu.ch/publications/tech3342)
