<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../_shared/button.svelte'
import Dialog from '../_shared/dialog.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The initial bundle name. */
  initialName: string
  /** Callback invoked when the "Save" button is clicked. */
  onSave?: (newName: string) => void
}

let { open = $bindable(false), initialName, onSave }: Props = $props()

let bundleName = $state(initialName)

function handleSave() {
  onSave?.(bundleName)
  open = false
}

function handleCancel() {
  open = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSave()
  }
}

// Reset bundle name when dialog opens with a new initial name
$effect(() => {
  if (open) {
    bundleName = initialName
  }
})
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Save Bundle Copy">
  <div class="bundle-copy-dialog-form">
    <label for="bundle-name-input" class="bundle-copy-dialog-label">Bundle name</label>
    <input
      id="bundle-name-input"
      type="text"
      bind:value={bundleName}
      class="bundle-copy-dialog-input"
      aria-label="Bundle name"
      onkeydown={handleKeydown}
    />
    <div class="bundle-copy-dialog-actions">
      <Button onClick={handleCancel}>Cancel</Button>
      <Button primary onClick={handleSave}>Save</Button>
    </div>
  </div>
</Dialog>

<!-- STYLE -->
<style lang="scss">
.bundle-copy-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bundle-copy-dialog-label {
  font-weight: 700;
  color: var(--text-color-primary);
}

.bundle-copy-dialog-input {
  flex: 1;
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: inherit;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.bundle-copy-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.5rem;
}
</style>
