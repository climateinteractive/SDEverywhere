<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import './global.css'

import Tabs, { type Tab } from './components/tabs/tabs.svelte'
import GraphsEditor from './components/graphs-editor/graphs-editor.svelte'

import { AppViewModel } from './app-vm.svelte'

const appViewModel = new AppViewModel()

// Track source model changes and recompile (debounced)
let compileTimeout: ReturnType<typeof setTimeout> | undefined
let lastCompiledSource: string = appViewModel.sourceModel

$effect(() => {
  const source = appViewModel.sourceModel
  if (source !== lastCompiledSource) {
    // Debounce recompilation to avoid too many compiles while typing
    clearTimeout(compileTimeout)
    compileTimeout = setTimeout(() => {
      lastCompiledSource = source
      appViewModel.compileModel(source)
    }, 500)
  }
})

// Tab state
let selectedTab = $state('messages')

// Define tabs with dynamic badges for messages
const tabs = $derived.by((): Tab[] => {
  const errorCount = appViewModel.messages.filter(m => m.type === 'error').length
  const warningCount = appViewModel.messages.filter(m => m.type === 'warning').length

  let messageBadge: string | undefined
  let badgeVariant: 'default' | 'error' | 'warning' | undefined

  if (errorCount > 0) {
    messageBadge = String(errorCount)
    badgeVariant = 'error'
  } else if (warningCount > 0) {
    messageBadge = String(warningCount)
    badgeVariant = 'warning'
  }

  return [
    { id: 'messages', label: 'Messages', badge: messageBadge, badgeVariant },
    { id: 'code', label: 'Generated Code' },
    { id: 'graphs', label: 'Graphs & Sliders' }
  ]
})
</script>

<!-- TEMPLATE -->
<div class="app-root">
  <!-- Header Bar -->
  <header class="app-header">
    <div class="app-header-title">
      <span class="app-header-logo">SDE</span>
      <span class="app-header-name">SDEverywhere Playground</span>
    </div>
    <div class="app-header-status">
      {#if appViewModel.isCompiling}
        <span class="app-status-compiling">Compiling...</span>
      {:else if appViewModel.generatedModelInfo}
        <span class="app-status-ready">Ready</span>
      {/if}
    </div>
  </header>

  <!-- Main Content -->
  <div class="app-container">
    <!-- Left Panel: Source Editor -->
    <div class="app-editor-panel">
      <div class="app-panel-header">Source Model</div>
      <textarea
        class="app-editor"
        bind:value={appViewModel.sourceModel}
        spellcheck="false"
        placeholder="Paste your Vensim (.mdl) or Stella (.stmx) model here..."
      ></textarea>
    </div>

    <!-- Right Panel: Tabbed Output -->
    <div class="app-output-panel">
      <Tabs {tabs} bind:selectedTab>
        {#snippet children(tabId)}
          {#if tabId === 'messages'}
            <div class="app-messages">
              {#if appViewModel.isCompiling}
                <div class="app-message app-message-info">Compiling...</div>
              {:else if appViewModel.messages.length === 0}
                <div class="app-message app-message-info">No messages</div>
              {:else}
                {#each appViewModel.messages as message}
                  <div class="app-message app-message-{message.type}">
                    <span class="app-message-icon">
                      {#if message.type === 'error'}✖{:else if message.type === 'warning'}⚠{:else}ℹ{/if}
                    </span>
                    <span class="app-message-text">{message.message}</span>
                  </div>
                {/each}
              {/if}
            </div>
          {:else if tabId === 'code'}
            <div class="app-code-container">
              {#if appViewModel.generatedModelInfo}
                <pre class="app-code">{appViewModel.generatedModelInfo.jsCode || ''}</pre>
              {:else}
                <div class="app-code-placeholder">No generated code yet</div>
              {/if}
            </div>
          {:else if tabId === 'graphs'}
            <GraphsEditor
              modelInfo={appViewModel.generatedModelInfo}
              runner={appViewModel.generatedModel?.runner}
              outputs={appViewModel.generatedModel?.outputs}
            />
          {/if}
        {/snippet}
      </Tabs>
    </div>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">

.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

// Header
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  background-color: #1e1e1e;
  border-bottom: 1px solid #3c3c3c;
}

.app-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-header-logo {
  padding: 4px 8px;
  background: linear-gradient(135deg, #0078d4, #00b4d8);
  border-radius: 4px;
  font-weight: 700;
  font-size: 12px;
  color: white;
}

.app-header-name {
  font-size: 14px;
  font-weight: 500;
  color: #cccccc;
}

.app-header-status {
  font-size: 12px;
}

.app-status-compiling {
  color: #cca700;
}

.app-status-ready {
  color: #4ec9b0;
}

// Main container
.app-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

.app-editor-panel {
  display: flex;
  flex-direction: column;
  width: 400px;
  min-width: 300px;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.app-panel-header {
  padding: 10px 16px;
  background-color: #252526;
  border-bottom: 1px solid #3c3c3c;
  color: #cccccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
}

.app-editor {
  flex: 1;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border: none;
  padding: 12px;
  resize: none;
  outline: none;

  &::placeholder {
    color: #6e6e6e;
  }
}

.app-output-panel {
  flex: 1;
  min-width: 400px;
  overflow: hidden;
}

// Messages tab
.app-messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
}

.app-message-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.app-message-text {
  flex: 1;
  word-break: break-word;
}

.app-message-error {
  background-color: rgba(241, 76, 76, 0.15);
  color: #f48771;
}

.app-message-warning {
  background-color: rgba(204, 167, 0, 0.15);
  color: #cca700;
}

.app-message-info {
  background-color: rgba(75, 156, 211, 0.15);
  color: #4b9cd3;
}

// Code tab
.app-code-container {
  height: 100%;
  overflow: auto;
}

.app-code {
  margin: 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.app-code-placeholder {
  color: #6e6e6e;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
}

</style>
