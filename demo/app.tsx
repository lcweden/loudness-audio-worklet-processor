import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot } from '../types';
import { FileSelector } from './components/file-selector';
import { StatItem } from './components/stat-item';
import { createAudioAnalysis, createPagination, createRange } from './composables';

function App() {
  const [getFile, setFile] = createSignal<File>();
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>([]);
  const getSnapshot = createMemo<AudioLoudnessSnapshot | undefined>(() => getSnapshots().at(-1));
  const audioAnalyzer = createAudioAnalysis<AudioLoudnessSnapshot>(handleAudioAnalysis);
  const snapshotTable = createPagination<AudioLoudnessSnapshot>();
  const snapshotTableSelectedRange = createRange();

  function handleAudioAnalysis(event: MessageEvent) {
    setSnapshots((prev) => [...(prev || []), event.data]);
  }

  function handleAudioAnalysisEnded(_: Event) {
    snapshotTable.setData(getSnapshots());
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
              value={getSnapshot()?.currentMetrics[0].integratedLoudness.toFixed(1) ?? '-'}
              desc="LUFS"
            />
            <StatItem
              title="Loudness Range"
              value={getSnapshot()?.currentMetrics[0].loudnessRange.toFixed(1) ?? '-'}
              desc="LRA"
            />
            <StatItem
              title="True Peak"
              value={getSnapshot()?.currentMetrics[0].maximumTruePeakLevel.toFixed(1) ?? '-'}
              desc="dBTP"
            />
          </div>

          <div class="card card-border min-h-fit overflow-x-auto">
            <table class="table-sm sm:table-md table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" class="checkbox" onclick={handleTableRowClickAll} />
                  </th>
                  <td>Frame</td>
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
                        <td>{snapshot.currentFrame}</td>
                        <td>{snapshot.currentTime.toFixed(1)} ms</td>
                        <td>{snapshot.currentMetrics[0].momentaryLoudness.toFixed(1)}</td>
                        <td>{snapshot.currentMetrics[0].shortTermLoudness.toFixed(1)}</td>
                        <td>{snapshot.currentMetrics[0].integratedLoudness.toFixed(1)}</td>
                        <td>{snapshot.currentMetrics[0].loudnessRange.toFixed(1)}</td>
                        <td>{snapshot.currentMetrics[0].maximumTruePeakLevel.toFixed(1)}</td>
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
