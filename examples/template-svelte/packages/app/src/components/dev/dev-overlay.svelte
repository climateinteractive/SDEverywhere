<!-- SCRIPT -->
<script lang='ts'>
import messagesHtml from '@prep/messages.html?raw'
</script>

<!-- TEMPLATE -->
{#if messagesHtml}
  <div class="overlay-container allow-selection">
    <div class="overlay-text">{ @html messagesHtml }</div>
  </div>
{/if}

<!-- STYLE -->
<style lang='sass'>
.overlay-container
  position: fixed
  display: flex
  flex-direction: column
  flex: 1
  bottom: 0
  right: 0
  z-index: 9999
  margin-right: 1rem
  margin-bottom: 1rem
  max-width: 80%
  max-height: 80%
  overflow-y: auto
  padding: 1rem
  border-radius: .5rem
  background-color: #333
  color: #fff
  font-family: monospace
  font-size: .8em
  box-shadow: 0 3px 6px rgba(0,0,0,.8)

.overlay-container :global(.overlay-error)
  color: crimson
</style>
