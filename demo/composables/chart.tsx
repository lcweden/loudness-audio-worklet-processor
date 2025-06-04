import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { createEffect, createSignal, onCleanup } from 'solid-js';

echarts.use([LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

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

  function setIsLoading(isLoading: boolean, options?: {}) {
    const chart = getChart();

    if (chart) {
      if (isLoading) {
        chart.showLoading('default', options);
      } else {
        chart.hideLoading();
      }
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

  return { init, setOption, setIsLoading };
}

export { createChart };
