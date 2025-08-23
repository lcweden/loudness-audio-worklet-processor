import * as echarts from "echarts";
import { createEffect, createMemo, For, on, onCleanup, onMount, Show } from "solid-js";
import { Stat } from "../components";
import { createLoudness } from "../hooks";
import { replace } from "../utils";

function Dashboard() {
  const { getSnapshots, getIsProcessing, getIsFinished, reset } = createLoudness();
  const getSnapshot = createMemo(() => getSnapshots().at(-1));
  let container: HTMLDivElement;
  let observer: ResizeObserver;
  let chart: echarts.ECharts;

  createEffect(
    on(getIsProcessing, (isProcessing) => {
      if (!chart) return;

      if (isProcessing) {
        chart.showLoading("default", {
          text: "",
          color: "#000000",
          maskColor: "transparent",
          zlevel: 0,
          fontSize: 24,
          showSpinner: true,
          spinnerRadius: 12,
          lineWidth: 3
        });
      } else {
        chart.hideLoading();
      }
    })
  );

  createEffect(
    on([getIsFinished, getSnapshots], ([isFinished, snapshots]) => {
      if (!isFinished || !snapshots || !chart) return;

      const times = snapshots.map((v) => v.currentTime.toFixed(1));
      const momentaryLoudness = snapshots.map((v) => Number(v.currentMetrics[0].momentaryLoudness.toFixed(2)));
      const shortTermLoudness = snapshots.map((v) => Number(v.currentMetrics[0].shortTermLoudness.toFixed(2)));
      const integratedLoudness = snapshots.map((v) => Number(v.currentMetrics[0].integratedLoudness.toFixed(2)));

      chart.setOption({
        tooltip: {
          extraCssText: "rounded-box",
          trigger: "axis",
          backgroundColor: "oklch(95% 0.0081 61.42)",
          borderColor: "oklch(90% 0.0081 61.42)",
          borderWidth: 2,
          borderRadius: 16
        },
        xAxis: { type: "category", data: times, axisLabel: { formatter: "{value} s" } },
        yAxis: { type: "value", scale: true, axisLabel: { formatter: "{value} LUFS" } },
        series: [
          {
            name: "Momentary Loudness",
            data: replace(momentaryLoudness, Number.NEGATIVE_INFINITY, null),
            type: "line",
            smooth: true,
            showSymbol: false
          },
          {
            name: "Short Term Loudness",
            data: replace(shortTermLoudness, Number.NEGATIVE_INFINITY, null),
            type: "line",
            smooth: true,
            showSymbol: false
          },
          {
            name: "Integrated Loudness",
            data: replace(integratedLoudness, Number.NEGATIVE_INFINITY, null),
            type: "line",
            smooth: true,
            showSymbol: false
          }
        ],
        dataZoom: [
          { type: "slider", start: 0, end: 100 },
          { type: "inside", start: 0, end: 100 }
        ]
      });
    })
  );

  onMount(() => {
    chart = echarts.init(container);
    observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
  });

  onCleanup(() => {
    observer.unobserve(container);
    chart.dispose();
    reset();
  });

  return (
    <div class="flex flex-col gap-4 p-2">
      <div class="flex items-center justify-between pl-4">
        <div class="flex items-center gap-4">
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
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div class="rounded-box border-base-200 h-96 w-full border shadow" ref={(e) => (container = e)} />
    </div>
  );
}

export { Dashboard };
