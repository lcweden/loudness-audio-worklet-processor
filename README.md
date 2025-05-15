# Loudness Audio Worklet Processor

A real-time loudness meter for `Web Audio API` based on the ITU-R BS.1770-5 standard, implemented as an `AudioWorkletProcessor`.

## Installation

Download pre-built file [loudness.worklet.js](https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js)

## Usage

### Basic Example

1. Register the processor in your audio context:

   ```javascript
   audioContext.audioWorklet.addModule('loudness.worklet.js').then(() => {
     const loudnessNode = new AudioWorkletNode(audioContext, 'loudness-processor');
     audioSource.connect(loudnessNode).connect(audioContext.destination);

     loudnessNode.port.onmessage = (event) => {
       console.log('Loudness Data:', event.data);
     };
   });
   ```

2. The processor outputs the following via the `port`:

   ```json
   {
     "currentFrame": 2048,
     "currentTime": 3.42,
     "currentMetrics": [
       {
         "momentaryLoudness": -18.2,
         "shortTermLoudness": -17.5,
         "integratedLoudness": -20.0,
         "loudnessRange": 6.2,
         "maximumTruePeakLevel": -0.8
       }
     ]
   }
   ```

## Acknowledgments

This project is a learning experiment aimed at exploring audio signal processing and ITU-R BS.1770 loudness measurement standards. I am not an expert in audio engineering or signal processing, and this project was developed as a way to better understand the concepts of audio loudness and implementation techniques. Thanks to the ITU-R BS.1770 standards for providing the theoretical basis for loudness measurement.

## License

This project is licensed under the [MIT License](LICENSE).
