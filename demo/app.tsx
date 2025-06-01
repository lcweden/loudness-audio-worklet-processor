import { createEffect, createMemo, createSignal, createUniqueId, For, Match, Show, Switch } from 'solid-js';
import type { AudioLoudnessSnapshot, Metrics } from '../types';
import { FileSelector } from './components/file-selector';
import { createAudioAnalysis, createChart, createPagination, createRange } from './composables';

function App() {
  const [getFile, setFile] = createSignal<File>();
  const [getIsProccessing, setIsProccessing] = createSignal<boolean>(false);
  const [getIsProccessFinish, setIsProccessFinish] = createSignal<boolean>(false);
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>([]);
  const getSnapshot = createMemo<AudioLoudnessSnapshot | undefined>(() => getSnapshots().at(-1));
  const audioAnalyzer = createAudioAnalysis<AudioLoudnessSnapshot>(handleAudioAnalysis);
  const snapshotTable = createPagination<AudioLoudnessSnapshot>();
  const snapshotTableSelectedRange = createRange();
  const snapshotChart = createChart();
  let chartRef: HTMLDivElement | undefined;

  function handleFileSelect(file: File) {
    setFile(file);
    setSnapshots([]);
    setIsProccessing(true);
    setIsProccessFinish(false);
    snapshotTable.setData([]);
    audioAnalyzer.process(file, handleAudioAnalysisEnded);
  }

  function handleFileCleanUp() {}

  function handleTablePageSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    snapshotTable.setPageSize(value);
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
    const snapshots = getSnapshots();
    const legends: Array<[string, keyof Metrics]> = [
      ['Integrated', 'integratedLoudness'],
      ['Short-term', 'shortTermLoudness'],
      ['Momentary', 'momentaryLoudness'],
    ];

    setIsProccessing(false);
    setIsProccessFinish(true);
    snapshotTable.setData(snapshots);
    snapshotChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: legends.map(([key]) => key) },
      xAxis: {
        type: 'category',
        data: snapshots.map((snapshot) => snapshot.currentTime),
        name: 'Time (s)',
      },
      yAxis: { type: 'value', name: 'Loudness (LUFS)', min: 'dataMin', max: 'dataMax' },
      series: legends.map(([key, value]) => ({
        name: key,
        data: snapshots.map((snapshot) => {
          const loudness = snapshot.currentMetrics[0][value];
          return loudness === Number.NEGATIVE_INFINITY ? null : loudness;
        }),
        type: 'line',
        smooth: true,
        emphasis: { focus: 'series' },
        lineStyle: { width: 4 },
      })),
    });
  }

  function handleTableRowClick(index: number) {
    snapshotTableSelectedRange.select(index);
  }

  function handleTableRowClickAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const snapshotTable = getSnapshots();

    if (!snapshotTable) {
      return;
    }

    if (checkbox.checked) {
      snapshotTableSelectedRange.selectAll(getSnapshots().length);
    } else {
      snapshotTableSelectedRange.clear();
    }
  }

  createEffect(() => {
    if (getFile() && chartRef) {
      snapshotChart.init(chartRef);
    }
  });

  return (
    <Show
      when={getFile()}
      fallback={
        <div class="hero h-dvh">
          <div class="hero-content text-center">
            <div class="max-w-md">
              <h1 class="text-5xl font-bold">Hello there</h1>
              <p class="py-6">
                Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi. In
                deleniti eaque aut repudiandae et a id nisi.
              </p>
              <div class="flex justify-center gap-1">
                <FileSelector
                  class="btn btn-wide btn-primary"
                  onSelect={handleFileSelect}
                  onCleanUp={handleFileCleanUp}
                />
                <a class="btn btn-square btn-neutral">
                  <img class="w-6" src="/logos/github-mark-white.svg" alt="Github" />
                </a>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <>
        <div class="font-urbanist flex min-h-dvh flex-col gap-6 pb-[env(safe-area-inset-bottom)] lining-nums select-none">
          <nav class="navbar from-base-100 via-base-100 sticky top-0 z-10 container mx-auto bg-gradient-to-b via-80% to-transparent">
            <div class="flex-1">
              <a class="btn btn-ghost btn-sm text-lg font-light tracking-wider sm:text-xl" href="">
                Loudness Meter
              </a>
            </div>
            <div class="flex-none">
              <FileSelector class="btn btn-primary btn-sm" onSelect={handleFileSelect} onCleanUp={handleFileCleanUp} />
            </div>
          </nav>

          <main class="container mx-auto flex min-h-0 min-w-0 flex-1 flex-col gap-6 p-4">
            <div class="grid grid-cols-3 items-center">
              <div class="flex flex-col items-center gap-3 justify-self-start sm:justify-self-center-safe">
                <p class="text-xs font-light sm:text-sm">Loudness Range</p>
                <p class="text-xl sm:text-6xl">
                  <Show when={getSnapshot()} fallback={'-'} keyed={true}>
                    {(snapshot) => {
                      const value = snapshot.currentMetrics[0].loudnessRange;
                      return value === Number.NEGATIVE_INFINITY ? '-' : value;
                    }}
                  </Show>
                </p>
                <p class="text-xs font-light">LRA</p>
              </div>
              <div class="flex flex-col items-center gap-3">
                <p class="text-sm font-light">Integrated Loudness</p>
                <p class="text-5xl sm:text-8xl">
                  <Show when={getSnapshot()} fallback={'-'} keyed={true}>
                    {(snapshot) => {
                      const value = snapshot.currentMetrics[0].integratedLoudness;
                      return value === Number.NEGATIVE_INFINITY ? '-' : value;
                    }}
                  </Show>
                </p>
                <p class="text-xs font-light">LUFS</p>
              </div>
              <div class="flex flex-col items-center gap-3 justify-self-end sm:justify-self-center-safe">
                <p class="text-xs font-light sm:text-sm">True Peak Level</p>
                <p class="text-xl sm:text-6xl">
                  <Show when={getSnapshot()} fallback={'-'} keyed={true}>
                    {(snapshot) => {
                      const value = snapshot.currentMetrics[0].maximumTruePeakLevel;
                      return value === Number.NEGATIVE_INFINITY ? '-' : value;
                    }}
                  </Show>
                </p>
                <p class="text-xs font-light">dBTP</p>
              </div>
            </div>

            <div ref={(element) => (chartRef = element)} class="min-h-96 w-full">
              {/* echarts */}
            </div>

            <div class="card card-border overflow-x-auto overscroll-none">
              <table class="table-sm sm:table-md table text-nowrap">
                <thead>
                  <tr>
                    <th>
                      <input
                        id={createUniqueId()}
                        type="checkbox"
                        class="checkbox rounded-field checkbox-sm"
                        disabled={getSnapshots().length === 0}
                        onclick={handleTableRowClickAll}
                      />
                    </th>
                    <th>Time</th>
                    <th>Momentary</th>
                    <th>Short-term</th>
                    <th>Integrated</th>
                    <th>Range</th>
                    <th>Peak</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={snapshotTable.getPageData()}>
                    {(snapshot) => {
                      const index = getSnapshots().indexOf(snapshot);

                      return (
                        <tr
                          class={`${
                            snapshotTableSelectedRange.isSelected(index) ? 'bg-base-200' : 'bg-base-100'
                          } hover:bg-base-200 cursor-pointer`}
                          onclick={() => handleTableRowClick(index)}
                        >
                          <th>
                            <input
                              id={createUniqueId()}
                              type="checkbox"
                              class="checkbox rounded-field checkbox-sm"
                              checked={snapshotTableSelectedRange.isSelected(index)}
                            />
                          </th>
                          <td>{snapshot.currentTime} ms</td>
                          <td>{snapshot.currentMetrics[0].momentaryLoudness}</td>
                          <td>{snapshot.currentMetrics[0].shortTermLoudness}</td>
                          <td>{snapshot.currentMetrics[0].integratedLoudness}</td>
                          <td>{snapshot.currentMetrics[0].loudnessRange}</td>
                          <td>{snapshot.currentMetrics[0].maximumTruePeakLevel}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>

                <Show when={!getIsProccessFinish()}>
                  <tfoot>
                    <tr>
                      <td colspan={7}>
                        <Switch>
                          <Match when={!getIsProccessing()}>
                            <div role="alert" class="alert alert-horizontal">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-6"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
                                />
                              </svg>
                              <div>
                                <h3 class="font-bold">Pending</h3>
                                <div class="text-xs">Select a audio file to start meter</div>
                              </div>
                            </div>
                          </Match>
                          <Match when={getIsProccessing()}>
                            <div role="alert" class="alert alert-horizontal">
                              <span class="loading loading-spinner loading-md"></span>
                              <div>
                                <h3 class="font-bold">Loading</h3>
                                <div class="text-xs">Analyzing audio file...</div>
                              </div>
                            </div>
                          </Match>
                        </Switch>
                      </td>
                    </tr>
                  </tfoot>
                </Show>
              </table>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <p class="text-xs font-semibold sm:text-sm">Rows per page</p>
                <select
                  id={createUniqueId()}
                  class="select select-sm sm:select-md w-fit"
                  value={snapshotTable.getPageSize()}
                  onChange={handleTablePageSizeChange}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div class="flex gap-0.5">
                <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.prev}>
                  «
                </button>
                <button class="btn sm:btn-md btn-sm">Page {snapshotTable.getCurrentPage()}</button>
                <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.next}>
                  »
                </button>
              </div>
            </div>
          </main>
        </div>

        <Show when={false}>
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
    </Show>
  );
}

export { App };
