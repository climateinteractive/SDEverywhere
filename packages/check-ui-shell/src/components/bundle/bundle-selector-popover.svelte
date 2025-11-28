<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<!-- SCRIPT -->
<script lang="ts">
import CloseButton from '../_shared/close-button.svelte'

import type { BundleManager } from './bundle-manager.svelte'
import type { BundleSpec } from './bundle-spec'

import BundleSelector from './bundle-selector.svelte'

interface Props {
  bundleManager: BundleManager
  onSelect?: (bundle: BundleSpec) => void
  onClose?: () => void
}

let { bundleManager, onSelect, onClose }: Props = $props()
</script>

<!-- TEMPLATE -->
<div class="bundle-selector-popover">
  <div class="bundle-selector-popover-header">
    <div class="bundle-selector-popover-header-title">Select Bundle</div>
    <CloseButton onClick={() => onClose?.()} />
  </div>
  <BundleSelector {bundleManager} {onSelect} />
</div>

<!-- STYLE -->
<style lang="scss">
.bundle-selector-popover {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background-color: var(--panel-bg);
  color: var(--text-color-primary);
}

.bundle-selector-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--panel-header-bg);
  border-bottom: 1px solid var(--panel-border);
}

.bundle-selector-popover-header-title {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>
