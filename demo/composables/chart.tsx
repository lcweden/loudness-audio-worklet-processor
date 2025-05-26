import * as echarts from 'echarts';
import { createEffect, createSignal, onCleanup } from 'solid-js';

function createChart() {
  const [getChart, setChart] = createSignal<echarts.ECharts>();

  function init(element: HTMLElement) {
    const chart = echarts.init(element);
    setChart(chart);
  }

  function setOption(option: echarts.EChartsCoreOption) {
    const chart = getChart();

    if (chart) {
      chart.setOption(option);
    }
  }

  createEffect(() => {
    const chart = getChart();

    function resizeHandler() {
      if (chart) {
        chart.resize();
      }
    }

    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  });

  onCleanup(() => {
    const chart = getChart();

    if (chart) {
      chart.dispose();
      setChart(undefined);
    }
  });

  return { init, setOption };
}

export { createChart };
