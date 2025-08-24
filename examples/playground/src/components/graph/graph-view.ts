import type { ChartDataSets } from 'chart.js'
import { Chart } from 'chart.js'

import type { GraphViewModel, PlotStyle, Point } from './graph-vm'

const gridColor = '#444'
const fontFamily = 'sans-serif'
const fontSize = 14
const fontColor = '#777'

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

function createChart(canvas: HTMLCanvasElement, viewModel: GraphViewModel): Chart {
  const datasets: ChartDataSets[] = []

  function addPlot(points: Point[], color: string, style?: PlotStyle): void {
    const normalWidth = 3
    let borderWidth = normalWidth
    if (style) {
      // Use thin reference lines
      borderWidth = 1
    }

    let borderDash: number[]
    // let fill: string | boolean = false
    switch (style) {
      case 'wide':
        borderWidth = normalWidth * 2
        break
      case 'dashed':
        borderDash = [8, 2]
        break
      // case 'fill-to-next':
      //   fill = '+1'
      //   break
      // case 'fill-above':
      //   fill = 'end'
      //   break
      // case 'fill-below':
      //   fill = 'start'
      //   break
      default:
        break
    }

    // let backgroundColor = undefined
    // if (fill !== false) {
    //   // Make the fill less translucent when there is only a single point
    //   const opacity = points.length > 1 ? 0.1 : 0.3
    //   backgroundColor = `rgba(0, 128, 0, ${opacity})`
    // }

    let pointRadius = 0
    let pointBackgroundColor = undefined
    if (points.length === 1 && style !== 'dashed') {
      pointRadius = 5
      pointBackgroundColor = color
    }

    datasets.push({
      data: points,
      borderColor: color,
      borderWidth,
      borderDash,
      // backgroundColor,
      // fill,
      pointRadius,
      pointBackgroundColor,
      pointBorderWidth: 0,
      pointBorderColor: 'transparent',
      lineTension: 0
    })
  }

  // Add the plots
  addPlot(viewModel.points, 'deepskyblue')
  // for (const refPlot of viewModel.refPlots) {
  //   addPlot(refPlot.points, 'green', refPlot.style || 'normal')
  // }

  // Customize the x-axis range
  const xMin = viewModel.xMin
  const xMax = viewModel.xMax
  // XXX: Omit the 1990 label to avoid overlap issues
  const omitFirstTick = xMin === 1990

  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets
    },
    options: {
      // Use built-in responsive resizing support.  Note that for this to work
      // correctly, the canvas parent must be a container with a fixed size
      // (in `vw` or `px` units) and `position: relative`.  For more information:
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

      // Customize tooltip font
      tooltips: {
        titleFontFamily: fontFamily,
        bodyFontFamily: fontFamily
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
              fontColor,
              callback: (value, index) => (omitFirstTick && index === 0 ? '' : value)
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
