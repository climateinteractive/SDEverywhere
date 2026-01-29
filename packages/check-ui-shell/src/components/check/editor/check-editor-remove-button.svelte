<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
interface Props {
  /** The accessible label for the button (e.g., "Remove scenario", "Remove input"). */
  ariaLabel: string
  /** The click handler for the button. */
  onclick: () => void
}

let { ariaLabel, onclick }: Props = $props()

/**
 * Handle the button click, stopping propagation to prevent parent handlers from firing.
 *
 * @param e The mouse event.
 */
function handleClick(e: MouseEvent) {
  e.stopPropagation()
  onclick()
}
</script>

<!-- TEMPLATE -->
<button class="check-editor-remove-btn" onclick={handleClick} aria-label={ariaLabel}>
  ✕
</button>

<!-- STYLE -->
<style lang="scss">
.check-editor-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}
</style>
