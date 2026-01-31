<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { SliderConfig } from './graphs-editor-vm.svelte'

interface Props {
  /** The slider configuration. */
  config: SliderConfig
  /** Callback when value changes. */
  onValueChange?: (value: number) => void
  /** Callback when the slider is removed. */
  onRemove?: () => void
}

let { config, onValueChange, onRemove }: Props = $props()

/**
 * Get display name for a variable.
 *
 * @param varId The variable reference ID.
 * @returns Display name.
 */
function getDisplayName(varId: string): string {
  let name = varId
  if (name.startsWith('_')) {
    name = name.slice(1)
  }
  return name.replace(/_/g, ' ')
}
</script>

<!-- TEMPLATE -->
<div class="slider-card">
  <div class="slider-card-header">
    <span class="slider-card-name">{getDisplayName(config.varId)}</span>
    <button class="slider-card-close" onclick={onRemove} title="Remove slider">×</button>
  </div>
  <div class="slider-card-control">
    <input
      type="range"
      min={config.min}
      max={config.max}
      step="1"
      value={config.value}
      oninput={(e) => onValueChange?.(Number(e.currentTarget.value))}
    />
    <span class="slider-card-value">{config.value}</span>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">

.slider-card {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
}

.slider-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.slider-card-name {
  font-size: 13px;
  font-weight: 500;
  color: #cccccc;
}

.slider-card-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 4px;
  color: #969696;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background-color: #f14c4c;
    color: #ffffff;
  }
}

.slider-card-control {
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='range'] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #3c3c3c;
    border-radius: 2px;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: #0078d4;
      border-radius: 50%;
      cursor: pointer;
      transition: background-color 0.15s;

      &:hover {
        background: #1a8fe3;
      }
    }

    &::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: #0078d4;
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }
  }
}

.slider-card-value {
  min-width: 50px;
  text-align: right;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  color: #4ec9b0;
}

</style>
