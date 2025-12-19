// Copyright (c) 2025 Climate Interactive / New Venture Fund

import Chart, { type ChartDataSets } from 'chart.js'

import type { BundleGraphSpec, BundleGraphView, DatasetMap } from '@sdeverywhere/check-core'

/**
 * Implementation of the `BundleGraphView` interface that draws a mock
 * graph on an HTML canvas.
 */
export class SampleGraphView implements BundleGraphView {
  constructor(
    readonly parent: HTMLElement,
    graphSpec: BundleGraphSpec,
    datasetMap: DatasetMap
  ) {
    const canvas = document.createElement('canvas')
    parent.appendChild(canvas)
    createChart(canvas, graphSpec, datasetMap)
  }

  destroy(): void {
    // no-op
  }
}

function createChart(canvas: HTMLCanvasElement, graphSpec: BundleGraphSpec, datasetMap: DatasetMap): Chart {
  const chartDatasets: ChartDataSets[] = []
  for (const datasetSpec of graphSpec.datasets) {
    const datasetKey = datasetSpec.datasetKey
    const dataset = datasetMap.get(datasetKey)
    if (!dataset) {
      throw new Error(`Dataset not found for dataset key=${datasetKey}`)
    }

    const color = datasetSpec.color
    chartDatasets.push({
      backgroundColor: color,
      fill: false,
      borderColor: color,
      borderCapStyle: 'round',
      borderWidth: 2,
      label: datasetSpec.label,
      data: Array.from(dataset.entries()).map(([time, value]) => ({ x: time, y: value }))
    })
  }

  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets: chartDatasets
    },
    options: {
      // Use built-in responsive resizing support.  Note that for this to work
      // correctly, the canvas parent must be a container with a fixed size
      // (in `vw` units) and `position: relative`.  For more information:
      //   https://www.chartjs.org/docs/latest/general/responsive.html
      responsive: true,
      maintainAspectRatio: false,

      // Disable animation
      animation: { duration: 0 },
      hover: { animationDuration: 0 },
      responsiveAnimationDuration: 0,

      // Disable the built-in title
      title: { display: false },

      // Customize the legend
      legend: {
        position: 'bottom'
      },

      // Don't show points
      elements: {
        point: {
          radius: 0
        }
      },

      // Axis configurations
      scales: {
        xAxes: [
          {
            type: 'linear',
            position: 'bottom'
          }
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: 'units'
            },
            ticks: {
              beginAtZero: true
            }
          }
        ]
      }
    }
  })
}
