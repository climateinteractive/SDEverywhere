<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fireEvent, userEvent, waitFor } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import Dialog from './dialog.svelte'

const { Story } = defineMeta({
  title: 'Components/Dialog',
  component: Dialog
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={800} height={600}>
    <Dialog open={args.open} title={args.title}>
      <p>This is the default dialog content.</p>
      <p>You can put any content here.</p>
    </Dialog>
  </StoryDecorator>
{/snippet}

{#snippet templateWithCustomContent(args: Args<typeof Story> & { customContent: string })}
  <StoryDecorator width={800} height={600}>
    <Dialog open={args.open} title={args.title}>
      {@html args.customContent}
    </Dialog>
  </StoryDecorator>
{/snippet}

<Story
  name="Open"
  {template}
  args={{
    open: true,
    title: 'Dialog Title'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is visible
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Verify title is displayed
    const title = canvas.getByText('Dialog Title')
    await expect(title).toBeInTheDocument()

    // Verify content is displayed
    const content = canvas.getByText(/default dialog content/i)
    await expect(content).toBeInTheDocument()

    // Verify close button is present
    const closeButton = canvas.getByLabelText('Close')
    await expect(closeButton).toBeInTheDocument()
  }}
></Story>

<Story
  name="Closed"
  {template}
  args={{
    open: false,
    title: 'Dialog Title'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is not visible
    const dialog = canvas.queryByRole('dialog')
    await expect(dialog).not.toBeInTheDocument()
  }}
></Story>

<Story
  name="With Custom Content"
  template={templateWithCustomContent as unknown as typeof template}
  args={{
    open: true,
    title: 'Custom Content Dialog',
    customContent: `
      <div style="padding: 1rem;">
        <h3>Custom Heading</h3>
        <p>This dialog has custom HTML content.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </div>
    `
  } as unknown as Args<typeof Story>}
  play={async ({ canvas }) => {
    // Verify custom content is displayed
    const heading = canvas.getByText('Custom Heading')
    await expect(heading).toBeInTheDocument()

    // Verify list items are present
    const item1 = canvas.getByText('Item 1')
    await expect(item1).toBeInTheDocument()
  }}
></Story>

<Story
  name="Close with X Button"
  {template}
  args={{
    open: true,
    title: 'Closeable Dialog'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is open
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Click the close button
    const closeButton = canvas.getByLabelText('Close')
    await userEvent.click(closeButton)

    // Verify dialog is closed
    await waitFor(() => expect(canvas.queryByRole('dialog')).not.toBeInTheDocument())
  }}
></Story>

<Story
  name="Close with Backdrop Click"
  {template}
  args={{
    open: true,
    title: 'Closeable Dialog'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is open
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Click on the backdrop (the dialog itself, not its content)
    await userEvent.click(dialog)

    // Verify dialog is closed
    await waitFor(() => expect(canvas.queryByRole('dialog')).not.toBeInTheDocument())
  }}
></Story>

<Story
  name="Close with Escape Key"
  {template}
  args={{
    open: true,
    title: 'Closeable Dialog'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is open
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Press Escape key
    fireEvent.keyDown(dialog, { key: 'Escape' })

    // Verify dialog is closed
    await waitFor(() => expect(canvas.queryByRole('dialog')).not.toBeInTheDocument())
  }}
></Story>

<Story
  name="Long Title"
  {template}
  args={{
    open: true,
    title: 'This is a Very Long Dialog Title That Should Still Display Properly Without Breaking the Layout'
  }}
  play={async ({ canvas }) => {
    // Verify dialog is visible with long title
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    const title = canvas.getByText(/Very Long Dialog Title/i)
    await expect(title).toBeInTheDocument()
  }}
></Story>

<Story
  name="Long Content"
  template={templateWithCustomContent as unknown as typeof template}
  args={{
    open: true,
    title: 'Dialog with Long Content',
    customContent: `
      <div style="padding: 1rem;">
        <p>This dialog contains a lot of content to test scrolling behavior.</p>
        ${Array.from({ length: 20 }, (_, i) => `<p>Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`).join('')}
      </div>
    `
  } as unknown as Args<typeof Story>}
  play={async ({ canvas }) => {
    // Verify dialog is visible
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Verify some content is visible
    const firstParagraph = canvas.getByText(/Paragraph 1:/i)
    await expect(firstParagraph).toBeInTheDocument()
  }}
></Story>
