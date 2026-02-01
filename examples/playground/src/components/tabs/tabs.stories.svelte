<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import Tabs, { type Tab } from './tabs.svelte'

const sampleTabs: Tab[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'code', label: 'Generated Code' },
  { id: 'graphs', label: 'Graphs & Sliders' }
]

const tabsWithBadges: Tab[] = [
  { id: 'messages', label: 'Messages', badge: '3', badgeVariant: 'error' },
  { id: 'code', label: 'Generated Code' },
  { id: 'graphs', label: 'Graphs & Sliders', badge: '2', badgeVariant: 'warning' }
]

const { Story } = defineMeta({
  title: 'Components/Tabs',
  component: Tabs
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={600} height={300}>
    <Tabs tabs={args.tabs} selectedTab={args.selectedTab}>
      {#snippet children(tabId)}
        <div style="padding: 16px; color: #ccc;">
          Content for tab: <strong>{tabId}</strong>
        </div>
      {/snippet}
    </Tabs>
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    tabs: sampleTabs,
    selectedTab: 'messages'
  }}
  play={async ({ canvas }) => {
    // Verify tabs are visible
    const messagesTab = canvas.getByRole('tab', { name: 'Messages' })
    await expect(messagesTab).toBeInTheDocument()
    await expect(messagesTab).toHaveAttribute('aria-selected', 'true')

    const codeTab = canvas.getByRole('tab', { name: 'Generated Code' })
    await expect(codeTab).toBeInTheDocument()
    await expect(codeTab).toHaveAttribute('aria-selected', 'false')

    const graphsTab = canvas.getByRole('tab', { name: /Graphs & Sliders/i })
    await expect(graphsTab).toBeInTheDocument()

    // Verify content is displayed
    const content = canvas.getByText(/Content for tab: messages/i)
    await expect(content).toBeInTheDocument()
  }}
/>

<Story
  name="With Badges"
  {template}
  args={{
    tabs: tabsWithBadges,
    selectedTab: 'messages'
  }}
  play={async ({ canvas }) => {
    // Verify error badge is visible
    const errorBadge = canvas.getByText('3')
    await expect(errorBadge).toBeInTheDocument()

    // Verify warning badge is visible
    const warningBadge = canvas.getByText('2')
    await expect(warningBadge).toBeInTheDocument()
  }}
/>

<Story
  name="Tab Selection"
  {template}
  args={{
    tabs: sampleTabs,
    selectedTab: 'messages'
  }}
  play={async ({ canvas }) => {
    // Verify initial tab is selected
    const messagesTab = canvas.getByRole('tab', { name: 'Messages' })
    await expect(messagesTab).toHaveAttribute('aria-selected', 'true')

    // Click on the Generated Code tab
    const codeTab = canvas.getByRole('tab', { name: 'Generated Code' })
    await userEvent.click(codeTab)

    // Verify the code tab is now selected
    await expect(codeTab).toHaveAttribute('aria-selected', 'true')
    await expect(messagesTab).toHaveAttribute('aria-selected', 'false')

    // Verify content changed
    const content = canvas.getByText(/Content for tab: code/i)
    await expect(content).toBeInTheDocument()
  }}
/>

<Story
  name="Keyboard Navigation"
  {template}
  args={{
    tabs: sampleTabs,
    selectedTab: 'messages'
  }}
  play={async ({ canvas }) => {
    // Focus on the messages tab
    const messagesTab = canvas.getByRole('tab', { name: 'Messages' })
    messagesTab.focus()
    await expect(messagesTab).toHaveFocus()

    // Press Enter to select (should already be selected)
    await userEvent.keyboard('{Enter}')
    await expect(messagesTab).toHaveAttribute('aria-selected', 'true')

    // Click on a different tab and verify it works with Space key
    const graphsTab = canvas.getByRole('tab', { name: /Graphs & Sliders/i })
    graphsTab.focus()
    await userEvent.keyboard(' ')
    await expect(graphsTab).toHaveAttribute('aria-selected', 'true')
  }}
/>

<Story
  name="Second Tab Selected"
  {template}
  args={{
    tabs: sampleTabs,
    selectedTab: 'code'
  }}
  play={async ({ canvas }) => {
    // Verify second tab is selected
    const codeTab = canvas.getByRole('tab', { name: 'Generated Code' })
    await expect(codeTab).toHaveAttribute('aria-selected', 'true')

    const messagesTab = canvas.getByRole('tab', { name: 'Messages' })
    await expect(messagesTab).toHaveAttribute('aria-selected', 'false')

    // Verify content is for code tab
    const content = canvas.getByText(/Content for tab: code/i)
    await expect(content).toBeInTheDocument()
  }}
/>
