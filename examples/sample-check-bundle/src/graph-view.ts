// Copyright (c) 2025 Climate Interactive / New Venture Fund

import Chart, { type ChartDataSets } from 'chart.js'

import type { BundleGraphSpec, BundleGraphView, DatasetMap } from '@sdeverywhere/check-core'

/**
 * Implementation of the `BundleGraphView` interface that draws a mock
 * graph on an HTML canvas.
 */
export class SampleGraphView implements BundleGraphView {
  private chart?: Chart

  constructor(
    readonly parent: HTMLElement,
    graphSpec: BundleGraphSpec,
    datasetMap: DatasetMap
  ) {
    // Add a container to hold the graph and legend elements
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.top = '0'
    container.style.left = '0'
    container.style.bottom = '0'
    container.style.right = '0'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    parent.appendChild(container)

    // Add a container just for the graph canvas (needed for Chart.js responsive resizing)
    const graphContainer = document.createElement('div')
    graphContainer.style.position = 'relative'
    graphContainer.style.flex = '1'
    graphContainer.style.minHeight = '0'
    container.appendChild(graphContainer)

    // Add a canvas element to the graph container and initialize the graph view around that canvas
    const canvas = document.createElement('canvas')
    graphContainer.appendChild(canvas)
    this.chart = createChart(canvas, graphSpec, datasetMap)

    // Add a legend container element to the container
    const legend = document.createElement('div')
    container.appendChild(legend)
    legend.style.display = 'flex'
    legend.style.flexDirection = 'row'
    legend.style.flexWrap = 'wrap'
    legend.style.justifyContent = 'center'
    legend.style.alignItems = 'center'
    legend.style.flex = '0 0 auto'
    legend.style.color = '#000'

    // Add the legend items
    for (const itemSpec of graphSpec.legendItems) {
      const legendItem = document.createElement('div')
      legendItem.style.backgroundColor = itemSpec.color
      legendItem.textContent = itemSpec.label
      legendItem.style.margin = '0 3px 4px 3px'
      legendItem.style.padding = '3px 8px'
      legendItem.style.color = '#fff'
      legendItem.style.textAlign = 'center'
      legendItem.style.textShadow = '0 .5px 1.5px #000'
      legend.appendChild(legendItem)
    }
  }

  destroy(): void {
    this.chart?.destroy()
    this.chart = undefined
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

      // Disable the built-in title and legend
      title: { display: false },
      legend: { display: false },

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
