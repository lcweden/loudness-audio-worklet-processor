import { Accessor, createEffect, createUniqueId, For, Match, mergeProps, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot } from '../../types';
import { createPagination, createRange } from '../composables';

type LoudnessSnapshotsTableProps = {
  getIsProcessing: Accessor<boolean>;
  getIsProcessFinish: Accessor<boolean>;
  getSnapshots: Accessor<AudioLoudnessSnapshot[]>;
  snapshotSelectedRange: ReturnType<typeof createRange>;
};

function LoudnessSnapshotsTable(loudnessSnapshotsTableProps: LoudnessSnapshotsTableProps) {
  const { getSnapshots, getIsProcessFinish, getIsProcessing, snapshotSelectedRange } =
    mergeProps(loudnessSnapshotsTableProps);
  const snapshotTable = createPagination<AudioLoudnessSnapshot>();
  let checkboxRef: HTMLInputElement;

  function handleTablePageSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    snapshotTable.setPageSize(value);
  }

  function handleTableRowClick(index: number) {
    snapshotSelectedRange.select(index);
  }

  function handleTableRowClickAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const snapshotTable = getSnapshots();

    if (!snapshotTable) {
      return;
    }

    if (checkbox.checked) {
      snapshotSelectedRange.selectAll(getSnapshots().length);
    } else {
      snapshotSelectedRange.clear();
    }
  }

  createEffect(() => {
    const isProccessFinish = getIsProcessFinish();
    const snapshots = getSnapshots();
    const selectedRange = snapshotSelectedRange.getRange();

    if (isProccessFinish && snapshots) {
      snapshotTable.setData(snapshots);
    }

    if (selectedRange) {
      const count = selectedRange[1] - selectedRange[0] + 1;

      if (count === snapshots.length) {
        checkboxRef.checked = true;
      } else {
        checkboxRef.checked = false;
      }
    }
  });

  return (
    <div class="flex flex-col gap-2">
      <div class="card card-border overflow-x-auto overscroll-none">
        <table class="table-sm sm:table-md table text-nowrap">
          <thead>
            <tr>
              <th>
                <input
                  ref={(element) => (checkboxRef = element)}
                  id={createUniqueId()}
                  type="checkbox"
                  class="checkbox rounded-field checkbox-sm"
                  disabled={getSnapshots().length === 0}
                  onchange={handleTableRowClickAll}
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

          <Show when={getIsProcessFinish()}>
            <tbody>
              <For each={snapshotTable.getPageData()}>
                {(snapshot) => {
                  const index = getSnapshots().indexOf(snapshot);

                  return (
                    <tr
                      class={`${
                        snapshotSelectedRange.isSelected(index) ? 'bg-base-200' : 'bg-base-100'
                      } hover:bg-base-200 cursor-pointer`}
                      onclick={() => handleTableRowClick(index)}
                    >
                      <th>
                        <input
                          id={createUniqueId()}
                          type="checkbox"
                          class="checkbox rounded-field checkbox-sm"
                          checked={snapshotSelectedRange.isSelected(index)}
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
          </Show>

          <Show when={!getIsProcessFinish()}>
            <tfoot>
              <tr>
                <td colspan={7}>
                  <Switch>
                    <Match when={!getIsProcessing()}>
                      <div role="alert" class="alert alert-horizontal">
                        <span class="loading loading-ball loading-md"></span>
                        <div>
                          <h3 class="font-bold">Pending</h3>
                          <div class="text-xs">Select a audio file to start meter</div>
                        </div>
                      </div>
                    </Match>
                    <Match when={getIsProcessing()}>
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
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.first}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
              <path
                fill-rule="evenodd"
                d="M10.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L12.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z"
                clip-rule="evenodd"
              />
              <path
                fill-rule="evenodd"
                d="M4.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L6.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.prev}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
              <path
                fill-rule="evenodd"
                d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button class="btn sm:btn-md btn-sm">Page {snapshotTable.getCurrentPage()}</button>
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.next}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
              <path
                fill-rule="evenodd"
                d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.last}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
              <path
                fill-rule="evenodd"
                d="M13.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                clip-rule="evenodd"
              />
              <path
                fill-rule="evenodd"
                d="M19.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06L17.69 12l-6.97-6.97a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export { LoudnessSnapshotsTable };
