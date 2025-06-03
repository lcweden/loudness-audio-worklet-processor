import { Accessor, createEffect, createUniqueId, For, Match, mergeProps, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot } from '../../types';
import { createPagination, createRange } from '../composables';

type LoudnessSnapshotsTableProps = {
  getIsProcessing: Accessor<boolean>;
  getIsProcessFinish: Accessor<boolean>;
  getSnapshots: Accessor<AudioLoudnessSnapshot[]>;
  range: ReturnType<typeof createRange>;
};

function LoudnessSnapshotsTable(loudnessSnapshotsTableProps: LoudnessSnapshotsTableProps) {
  const { getSnapshots, getIsProcessFinish, getIsProcessing, range } = mergeProps(loudnessSnapshotsTableProps);
  const snapshotTable = createPagination<AudioLoudnessSnapshot>();

  function handleTablePageSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    snapshotTable.setPageSize(value);
  }

  function handleTableRowClick(index: number) {
    range.select(index);
  }

  function handleTableRowClickAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const snapshotTable = getSnapshots();

    if (!snapshotTable) {
      return;
    }

    if (checkbox.checked) {
      range.selectAll(getSnapshots().length);
    } else {
      range.clear();
    }
  }

  createEffect(() => {
    const isProccessFinish = getIsProcessFinish();
    const snapshots = getSnapshots();

    if (isProccessFinish && snapshots) {
      snapshotTable.setData(snapshots);
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
                        range.isSelected(index) ? 'bg-base-200' : 'bg-base-100'
                      } hover:bg-base-200 cursor-pointer`}
                      onclick={() => handleTableRowClick(index)}
                    >
                      <th>
                        <input
                          id={createUniqueId()}
                          type="checkbox"
                          class="checkbox rounded-field checkbox-sm"
                          checked={range.isSelected(index)}
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
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.prev}>
            «
          </button>
          <button class="btn sm:btn-md btn-sm">Page {snapshotTable.getCurrentPage()}</button>
          <button class="btn sm:btn-md btn-sm btn-square" onclick={snapshotTable.next}>
            »
          </button>
        </div>
      </div>
    </div>
  );
}

export { LoudnessSnapshotsTable };
