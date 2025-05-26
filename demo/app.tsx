import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot, Metrics } from '../types';
import { FileSelector } from './components/file-selector';
import { StatItem } from './components/stat-item';
import { createAudioAnalysis, createPagination, createRange } from './composables';
import { createChart } from './composables/chart';

function App() {
  const [_, setFile] = createSignal<File>();
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>([]);
  const getSnapshot = createMemo<AudioLoudnessSnapshot | undefined>(() => getSnapshots().at(-1));
  const audioAnalyzer = createAudioAnalysis<AudioLoudnessSnapshot>(handleAudioAnalysis);
  const snapshotTable = createPagination<AudioLoudnessSnapshot>();
  const snapshotTableSelectedRange = createRange();
  const snapshotChart = createChart();
  let chartRef: HTMLDivElement;

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
      ['Integrated Loudness', 'integratedLoudness'],
      ['Short-term Loudness', 'shortTermLoudness'],
      ['Momentary Loudness', 'momentaryLoudness'],
    ];

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

  function handleTableRowClick(event: Event) {
    const tableRow = event.currentTarget as HTMLTableRowElement;
    const selectedIndex = Number(tableRow.id);
    snapshotTableSelectedRange.select(selectedIndex);
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
    if (chartRef) {
      snapshotChart.init(chartRef);
    }
  });

  return (
    <div class="bg-base-200 flex h-dvh w-dvw justify-center tabular-nums select-none">
      <div class="bg-base-100 sm:rounded-box container flex flex-1 flex-col sm:m-4 sm:shadow-xl">
        <nav class="flex items-center justify-between p-4">
          <div class="flex items-center gap-1">
            <FileSelector
              onSelect={(file) => (
                setFile(file), audioAnalyzer.process(file, handleAudioAnalysisEnded)
              )}
              onCleanUp={() => setFile(undefined)}
            />
            <p class="text-base-content sm:text-md font-mono text-sm font-light">Loudness Meter</p>
          </div>
          <div class="">
            <a class="btn btn-sm btn-btn-wide btn-primary">GitHub</a>
          </div>
        </nav>
        <main class="flex flex-1 flex-col gap-4 overflow-hidden overflow-y-auto p-4">
          <div class="flex flex-col justify-evenly gap-2 overflow-x-auto md:flex-row">
            <StatItem
              title="Integrated Loudness"
              value={getSnapshot()?.currentMetrics[0].integratedLoudness ?? '-'}
              desc="LUFS"
            />
            <StatItem
              title="Loudness Range"
              value={getSnapshot()?.currentMetrics[0].loudnessRange ?? '-'}
              desc="LRA"
            />
            <StatItem
              title="True Peak"
              value={getSnapshot()?.currentMetrics[0].maximumTruePeakLevel ?? '-'}
              desc="dBTP"
            />
          </div>

          <div class="card card-border">
            <div ref={(ref) => (chartRef = ref)} class="h-full min-h-96 w-full"></div>
          </div>
          <div class="card card-border min-h-fit overflow-x-auto">
            <table class="table-sm sm:table-md table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" class="checkbox" onclick={handleTableRowClickAll} />
                  </th>
                  <td>Time</td>
                  <td>Momentary</td>
                  <td>Short-term</td>
                  <td>Integrated</td>
                  <td>Range</td>
                  <td>Peak</td>
                </tr>
              </thead>
              <tbody>
                <For each={snapshotTable.getPageData()}>
                  {(snapshot) => {
                    const index = getSnapshots().indexOf(snapshot);

                    return (
                      <tr
                        id={String(index)}
                        class={`${
                          snapshotTableSelectedRange.isSelected(index)
                            ? 'bg-base-200'
                            : 'bg-base-100'
                        } hover:bg-base-200 cursor-pointer`}
                        onclick={handleTableRowClick}
                      >
                        <th>
                          <input
                            type="checkbox"
                            class="checkbox"
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
              <tfoot>
                <tr>
                  <td colSpan={8}>
                    <Switch
                      fallback={
                        <div class="join">
                          <button class="join-item btn" onclick={snapshotTable.prev}>
                            «
                          </button>
                          <button class="join-item btn">
                            Page {snapshotTable.getTotalPages()}
                          </button>
                          <button class="join-item btn" onclick={snapshotTable.next}>
                            »
                          </button>
                        </div>
                      }
                    >
                      <Match when={!getSnapshots().length}>
                        <div role="alert" class="alert">
                          <span>Pending</span>
                        </div>
                      </Match>
                      <Match when={getSnapshots().length && !snapshotTable.getPageData().length}>
                        <div role="alert" class="alert">
                          <span>Loading</span>
                        </div>
                      </Match>
                    </Switch>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </main>
      </div>

      <Show when={snapshotTableSelectedRange.getRange()}>
        <div class="fixed inset-x-0 bottom-12 mx-auto max-w-96 p-4">
          <div class="bg-base-100 card card-border flex p-4">
            <button class="btn btn-primary">Play</button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export { App };
