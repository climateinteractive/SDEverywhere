<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'

import { type TracePointViewModel, type TraceRowViewModel } from './trace-row-vm'

export let viewModel: TraceRowViewModel
export let selectedPointIndex: number | undefined = undefined

const dispatch = createEventDispatcher()

function onHover(pointViewModel: TracePointViewModel, event: MouseEvent): void {
  if (!pointViewModel.diffPoint) {
    return
  }

  dispatch('show-tooltip', {
    eventX: event.clientX,
    eventY: event.clientY,
    datasetKey: viewModel.datasetKey,
    varName: viewModel.varName,
    diffPoint: pointViewModel.diffPoint
  })
}

function onMouseLeave(): void {
  dispatch('hide-tooltip')
}
</script>

<!-- TEMPLATE -->
<div class="trace-row">
  <div class="trace-var-name-container">
    <div class="trace-var-name">{viewModel.varName}</div>
  </div>
  <div class="trace-points">
    {#each viewModel.points as point, pointIndex}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <div
        class="trace-point"
        class:empty={point.hasDiff === undefined}
        class:selected={selectedPointIndex === pointIndex}
        style="background-color: {point.color}"
        on:mouseover={event => onHover(point, event)}
        on:mouseleave={onMouseLeave}
      ></div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.trace-row {
  display: flex;
  flex-direction: row;
}

.trace-var-name-container {
  display: flex;
  flex-wrap: nowrap;
  font-size: 10px;
  color: #fff;
  width: 250px;
  max-width: 250px;
  margin-right: 10px;
}

.trace-var-name {
  display: flex;
  flex-wrap: nowrap;
  font-size: 10px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  z-index: 1000;
  &:hover {
    overflow: unset;
    background-color: #222;
  }
}

.trace-points {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}

.trace-point {
  width: 6px;
  height: 6px;
  &.empty {
    width: 4px;
    height: 4px;
    background-color: unset !important;
    border: solid 1px #aaa;
  }
  &.selected {
    border: solid 2px #4a9eff;
    box-sizing: border-box;
  }
}
</style>
