<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { Snippet } from 'svelte'

import CloseButton from './close-button.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The title of the dialog. */
  title: string
  /** The content of the dialog. */
  children?: Snippet
}

let { open = $bindable(false), title, children }: Props = $props()

function closeDialog() {
  open = false
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeDialog()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDialog()
  }
}
</script>

<!-- TEMPLATE -->
{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="dialog-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 id="dialog-title" class="dialog-title">{title}</h2>
        <CloseButton onClick={closeDialog} />
      </div>
      <div class="dialog-body">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<!-- STYLE -->
<style lang="scss">
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--panel-border-radius);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--panel-border);
}

.dialog-title {
  margin-right: 1rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.dialog-body {
  padding: 1.5rem;
}
</style>
