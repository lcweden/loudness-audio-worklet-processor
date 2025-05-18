import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot } from '../types';
import { createAudioAnalysis } from './composables/audio-analysis';
import { createPagination } from './composables/pagination';

function App() {
  const [getFile, setFile] = createSignal<File>();
  const [getSnapshot, setSnapshot] = createSignal<AudioLoudnessSnapshot>();
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>();
  const [getSelectedRange, setSelectedRange] = createSignal<[number, number]>();
  const snapshots = createPagination<AudioLoudnessSnapshot>();
  const { analysis } = createAudioAnalysis(handleAudioAnalysis);

  function handleFileSelect(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    const file = files?.[0];

    if (!file) {
      return;
    }

    setFile(file);
    analysis(file, handleAudioAnalysisEnded);
  }

  function handleFileCleanUp(_: Event) {
    setFile(undefined);
  }

  function handleAudioAnalysis(event: MessageEvent) {
    setSnapshot(event.data);
    setSnapshots((prev) => [...(prev || []), event.data]);
  }

  function handleAudioAnalysisEnded(_: Event) {
    snapshots.setData(getSnapshots()!);
  }

  function handleTableRowClick(event: Event) {
    const tableRow = event.currentTarget as HTMLTableRowElement;
    const selectedIndex = Number(tableRow.id);
    const selectedRange = getSelectedRange();

    if (!selectedRange) {
      setSelectedRange([selectedIndex, selectedIndex]);
    } else if (selectedRange.every((value) => value === selectedIndex)) {
      setSelectedRange(undefined);
    } else {
      const [start, end] = selectedRange;
      if (selectedIndex < start) {
        setSelectedRange([selectedIndex, end]);
      } else if (selectedIndex > end) {
        setSelectedRange([start, selectedIndex]);
      } else if (selectedIndex === start) {
        setSelectedRange([start, start]);
      } else if (selectedIndex === end) {
        setSelectedRange([end, end]);
      } else {
        if (selectedIndex - start < end - selectedIndex) {
          setSelectedRange([start, selectedIndex]);
        } else {
          setSelectedRange([selectedIndex, end]);
        }
      }
    }
  }

  function handleTableRowClickAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const snapshots = getSnapshots();

    if (!snapshots) {
      return;
    }

    if (checkbox.checked) {
      setSelectedRange([0, snapshots.length! - 1]);
    } else {
      setSelectedRange(undefined);
    }
  }

  return (
    <div class="bg-base-200 flex h-dvh w-dvw justify-center tabular-nums select-none">
      <div class="bg-base-100 sm:rounded-box container flex flex-1 flex-col sm:m-4 sm:shadow-xl">
        <nav class="flex items-center justify-between p-4">
          <div class="flex items-center gap-1">
            <label class="btn btn-sm btn-primary max-sm:btn-square">
              <p>
                <span class="max-sm:hidden">Select File</span>
              </p>
              <input
                type="file"
                accept="*"
                class="hidden"
                onClick={handleFileCleanUp}
                onChange={handleFileSelect}
              />
            </label>

            <p class="text-base-content sm:text-md font-mono text-sm font-light">Loudness Meter</p>
          </div>
          <div class="">
            <a class="btn btn-sm btn-btn-wide btn-primary">GitHub</a>
          </div>
        </nav>
        <main class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div class="stats-vertical stats sm:stats-horizontal card card-border min-h-fit overflow-auto shadow">
            <div class="stat bg-base-100 place-items-center">
              <div class="stat-title">Integrated Loudness</div>
              <div class="stat-value select-text">
                {getSnapshot()?.currentMetrics[0].integratedLoudness.toFixed(1) ?? '-'}
              </div>
              <div class="stat-desc">LUFS</div>
            </div>
            <div class="stat bg-base-100 place-items-center">
              <div class="stat-title">Loudness Range</div>
              <div class="stat-value select-text">
                {getSnapshot()?.currentMetrics[0].loudnessRange.toFixed(1) ?? '-'}
              </div>
              <div class="stat-desc">LRA</div>
            </div>
            <div class="stat bg-base-100 place-items-center">
              <div class="stat-title">True Peak</div>
              <div class="stat-value select-text">
                {getSnapshot()?.currentMetrics[0].maximumTruePeakLevel.toFixed(1) ?? '-'}
              </div>
              <div class="stat-desc">dBTP</div>
            </div>
          </div>

          <div class="card card-border min-h-fit overflow-x-auto shadow">
            <table class="table-sm sm:table-md table">
              <thead>
                <tr class="bg-base-300">
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
                <For each={snapshots.getPageData()}>
                  {(snapshot) => {
                    const index = getSnapshots()!.indexOf(snapshot);

                    return (
                      <tr
                        id={String(index)}
                        class={`${(() => {
                          const range = getSelectedRange();
                          const isSelected = range && index >= range[0] && index <= range[1];

                          return isSelected ? 'bg-base-200' : 'bg-base-100';
                        })()} hover:bg-base-200 cursor-pointer`}
                        onclick={handleTableRowClick}
                      >
                        <th>
                          <input
                            type="checkbox"
                            class="checkbox"
                            checked={(() => {
                              const range = getSelectedRange();
                              const isSelected = range && index >= range[0] && index <= range[1];

                              return isSelected;
                            })()}
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
                          <button class="join-item btn" onclick={snapshots.prev}>
                            «
                          </button>
                          <button class="join-item btn">Page {snapshots.getTotalPages()}</button>
                          <button class="join-item btn" onclick={snapshots.next}>
                            »
                          </button>
                        </div>
                      }
                    >
                      <Match when={!getSnapshots()!?.length}>
                        <div role="alert" class="alert">
                          <span>Pending</span>
                        </div>
                      </Match>
                      <Match when={getSnapshots()!?.length && !snapshots.getPageData().length}>
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

      <Show when={getSelectedRange()}>
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
