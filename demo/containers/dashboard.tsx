import { createMemo, For, Show } from "solid-js";
import { Stat } from "../components";
import { createLoudnessContext } from "../contexts";

function Dashboard() {
  const [getSnapshots] = createLoudnessContext();
  const getSnapshot = createMemo(() => getSnapshots().at(-1));

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-4 px-2">
        <div class="flex items-center gap-2">
          <p class="text-xs">TIME:</p>
          <div class="badge badge-sm">
            <Show when={getSnapshot()} fallback={"-"} keyed>
              {(snapshot) => snapshot.currentTime.toFixed(1) + "s"}
            </Show>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <p class="text-xs">FRAME:</p>
          <div class="badge badge-sm">
            <Show when={getSnapshot()} fallback={"-"} keyed>
              {(snapshot) => snapshot.currentFrame}
            </Show>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2 px-2 sm:grid-cols-3">
        <For
          each={[
            { key: "loudnessRange", title: "Loudness Range", description: "LRA" },
            { key: "integratedLoudness", title: "Integrated Loudness", description: "LUFS" },
            { key: "maximumTruePeakLevel", title: "True Peak", description: "dBTP" }
          ]}
        >
          {({ key, title, description }) => (
            <Stat
              class="border-base-200 border shadow"
              title={title}
              description={description}
              value={
                <Show when={getSnapshot()} fallback={"-"} keyed>
                  {(snapshot) => (snapshot.currentMetrics[0] as Record<typeof key, number>)[key].toFixed(1)}
                </Show>
              }
            />
          )}
        </For>
      </div>
    </div>
  );
}

export { Dashboard };
