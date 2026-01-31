// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { ChartDataSets } from 'chart.js'
import { Chart } from 'chart.js'

import type { GraphViewModel, GraphDataset } from './graph-vm'

const gridColor = '#444'
const fontFamily = 'sans-serif'
const fontSize = 12
const fontColor = '#888'

/**
 * Wraps a native chart element.
 */
export class GraphView {
  private chart: Chart

  constructor(readonly canvas: HTMLCanvasElement, readonly viewModel: GraphViewModel) {
    this.chart = createChart(canvas, viewModel)
  }

  /**
   * Destroy the chart and any associated resources.
   */
  destroy(): void {
    this.chart?.destroy()
    this.chart = undefined
  }
}

/**
 * Convert a line style to Chart.js configuration.
 *
 * @param dataset The graph dataset.
 * @returns Chart.js dataset configuration.
 */
function datasetToChartJs(dataset: GraphDataset): ChartDataSets {
  const { color, style, points } = dataset

  const chartDataset: ChartDataSets = {
    data: points,
    borderColor: color,
    borderWidth: 2,
    lineTension: 0,
    pointBorderWidth: 0,
    pointBorderColor: 'transparent'
  }

  // Configure based on style
  switch (style) {
    case 'solid':
      chartDataset.fill = false
      chartDataset.pointRadius = points.length === 1 ? 5 : 0
      chartDataset.pointBackgroundColor = color
      break

    case 'dashed':
      chartDataset.fill = false
      chartDataset.borderDash = [6, 3]
      chartDataset.pointRadius = points.length === 1 ? 5 : 0
      chartDataset.pointBackgroundColor = color
      break

    case 'scatter':
      chartDataset.showLine = false
      chartDataset.pointRadius = 4
      chartDataset.pointBackgroundColor = color
      chartDataset.borderWidth = 0
      break

    case 'area':
      chartDataset.fill = true
      chartDataset.backgroundColor = hexToRgba(color, 0.3)
      chartDataset.pointRadius = 0
      break

    case 'none':
      chartDataset.borderColor = 'transparent'
      chartDataset.pointRadius = 0
      chartDataset.fill = false
      break

    default:
      chartDataset.fill = false
      chartDataset.pointRadius = 0
  }

  return chartDataset
}

/**
 * Convert hex color to rgba.
 *
 * @param hex The hex color string.
 * @param alpha The alpha value (0-1).
 * @returns RGBA color string.
 */
function hexToRgba(hex: string, alpha: number): string {
  // Handle named colors by returning a semi-transparent version
  if (!hex.startsWith('#')) {
    return hex
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Create a Chart.js chart from a view model.
 *
 * @param canvas The canvas element.
 * @param viewModel The graph view model.
 * @returns The Chart.js instance.
 */
function createChart(canvas: HTMLCanvasElement, viewModel: GraphViewModel): Chart {
  // Convert datasets to Chart.js format
  const datasets: ChartDataSets[] = viewModel.datasets.map(datasetToChartJs)

  // Customize the x-axis range
  const xMin = viewModel.xMin
  const xMax = viewModel.xMax

  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets
    },
    options: {
      // Use built-in responsive resizing support
      responsive: true,
      maintainAspectRatio: false,

      // Disable animation
      animation: { duration: 0 },
      hover: { animationDuration: 0 },
      responsiveAnimationDuration: 0,

      // Disable the built-in title and legend (we have our own)
      title: { display: false },
      legend: { display: false },

      // Default point configuration
      elements: {
        point: {
          radius: 0
        }
      },

      // Customize tooltip
      tooltips: {
        titleFontFamily: fontFamily,
        bodyFontFamily: fontFamily,
        mode: 'index',
        intersect: false
      },

      // Axis configurations
      scales: {
        xAxes: [
          {
            type: 'linear',
            position: 'bottom',
            gridLines: {
              color: gridColor
            },
            ticks: {
              maxTicksLimit: 6,
              maxRotation: 0,
              min: xMin,
              max: xMax,
              fontFamily,
              fontSize,
              fontColor
            }
          }
        ],
        yAxes: [
          {
            gridLines: {
              color: gridColor
            },
            ticks: {
              fontFamily,
              fontSize,
              fontColor
            }
          }
        ]
      }
    }
  })
}
