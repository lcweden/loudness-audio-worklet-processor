import { Accessor, createEffect, createMemo, createSignal, mergeProps, Setter, Show } from 'solid-js';
import { AudioLoudnessSnapshot } from '../../types';
import { FileSelector } from '../components';
import { createAudioAnalysis, createRange } from '../composables';
import { LoudnessMetricStats, LoudnessSnapshotsChart, LoudnessSnapshotsTable } from '../containers';

type MeterPageProps = {
  getFile: Accessor<File | undefined>;
  setFile: Setter<File | undefined>;
};

function MeterPage(meterPageProps: MeterPageProps) {
  const { setFile, getFile } = mergeProps(meterPageProps);
  const [getIsProcessing, setIsProccessing] = createSignal<boolean>(false);
  const [getIsProcessFinish, setIsProccessFinish] = createSignal<boolean>(false);
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>([]);
  const getSnapshot = createMemo<AudioLoudnessSnapshot | undefined>(() => getSnapshots().at(-1));
  const audioAnalyzer = createAudioAnalysis<AudioLoudnessSnapshot>(handleAudioAnalysis);
  const snapshotSelectedRange = createRange();

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files as FileList;

    if (files.length > 0) {
      setFile(files[0]);
    }
  }

  function handleAudioAnalysis(event: MessageEvent<AudioLoudnessSnapshot>) {
    const snapshots = getSnapshots();
    const lastSnapshot = snapshots.at(-1);
    const lastSnapshotTime = Number(lastSnapshot?.currentTime.toFixed(1));
    const formattedSnapshot = {
      ...event.data,
      currentTime: Number(event.data.currentTime.toFixed(1)),
      currentMetrics: event.data.currentMetrics.map((currentMetric) => ({
        integratedLoudness: Number(currentMetric.integratedLoudness.toFixed(1)),
        loudnessRange: Number(currentMetric.loudnessRange.toFixed(1)),
        maximumTruePeakLevel: Number(currentMetric.maximumTruePeakLevel.toFixed(1)),
        momentaryLoudness: Number(currentMetric.momentaryLoudness.toFixed(1)),
        shortTermLoudness: Number(currentMetric.shortTermLoudness.toFixed(1)),
      })),
    };

    if (!lastSnapshot || lastSnapshotTime !== formattedSnapshot.currentTime) {
      setSnapshots((prev) => [...(prev || []), formattedSnapshot]);
    }
  }

  function handleAudioAnalysisEnded(_: Event) {
    setIsProccessing(false);
    setIsProccessFinish(true);
  }

  createEffect(() => {
    const file = getFile();

    if (file) {
      setSnapshots([]);
      setIsProccessing(true);
      setIsProccessFinish(false);
      audioAnalyzer.process(file, handleAudioAnalysisEnded);
    }
  });

  return (
    <>
      <div class="font-urbanist flex min-h-dvh flex-col gap-6 pb-[env(safe-area-inset-bottom)] lining-nums select-none">
        <nav class="navbar from-base-100 via-base-100 sticky top-0 z-10 container mx-auto bg-gradient-to-b via-80% to-transparent">
          <div class="flex-1">
            <a class="btn btn-ghost text-lg font-light tracking-wider sm:text-xl" href="">
              Loudness Meter
            </a>
          </div>
          <div class="flex-none">
            <FileSelector class="btn btn-wide btn-primary" onchange={handleFileSelect} accept="*audio, *video" />
          </div>
        </nav>

        <main class="container mx-auto flex min-h-0 min-w-0 flex-1 flex-col gap-6 p-4">
          <LoudnessMetricStats getSnapshot={getSnapshot} />
          <LoudnessSnapshotsChart
            getIsProcessing={getIsProcessing}
            getIsProcessFinish={getIsProcessFinish}
            getSnapshots={getSnapshots}
          />
          <LoudnessSnapshotsTable
            getIsProcessing={getIsProcessing}
            getIsProcessFinish={getIsProcessFinish}
            getSnapshots={getSnapshots}
            range={snapshotSelectedRange}
          />
        </main>
      </div>

      <Show when={snapshotSelectedRange.getRange()}>
        <div class="fixed right-0 bottom-24 left-0 flex justify-center">
          <div class="bg-neutral/5 rounded-box w-96 space-y-1 p-1 backdrop-blur-md">
            <div class="badge badge-xs">{audioAnalyzer.getBuffer()?.sampleRate}Hz</div>
            <div class="bg-neutral rounded-box p-1">
              <button class="btn btn-square btn-sm btn-accent" type="button"></button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

export { MeterPage };
