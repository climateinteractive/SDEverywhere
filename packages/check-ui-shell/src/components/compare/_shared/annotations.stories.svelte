<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<!--
  Stories for the annotation strings produced by `getAnnotationsForScenario`.  These
  are not a component per se — they're the HTML pills rendered alongside scenario rows
  in the summary view and detail header.  Each story builds a representative
  `ComparisonScenario` and renders the resulting annotation HTML so that we can
  visually review the wording, colors, and (for multi-input warnings) the truncated
  form plus `title=` tooltip.
-->

<script module lang="ts">
import { defineMeta } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor } from 'storybook/test'

import type { ComparisonScenario, ComparisonScenarioInput, InputVar, ScenarioSpec } from '@sdeverywhere/check-core'

import StoryDecorator from '../../_storybook/story-decorator.svelte'

import { inputAtPositionSpec, inputAtValueSpec, inputVar } from '../../../_mocks/mock-comparison-scenario'

import { getAnnotationsForScenario } from './annotations'

const bundleNameL = 'baseline'
const bundleNameR = 'current'

//
// FIXTURES
//

const ivA = inputVar('1', 'Input A')[1]
const ivB = inputVar('2', 'Input B')[1]
const ivC = inputVar('3', 'Input C')[1]

const allInputs: InputVar[] = [
  inputVar('a', 'Afforestation CDR start year')[1],
  inputVar('b', 'Biochar start year')[1],
  inputVar('c', 'Agricultural soil carbon start year')[1],
  inputVar('d', 'Start year of deforestation reduction')[1],
  inputVar('e', 'Start year for ag practice adoption')[1],
  inputVar('f', 'Other GHG emissions change start year')[1],
  inputVar('g', 'Start year for intensity improvement stationary')[1]
]

function scenario(inputs: ComparisonScenarioInput[], specL?: ScenarioSpec, specR?: ScenarioSpec): ComparisonScenario {
  return {
    kind: 'scenario',
    key: 'demo',
    id: 'demo',
    title: 'Demo scenario',
    settings: {
      kind: 'input-settings',
      inputs
    },
    specL,
    specR
  }
}

//
// SCENARIOS
//

// All inputs resolved cleanly — no annotations should be emitted.
const cleanScenario = scenario(
  [{ requestedName: 'Input A', stateL: { inputVar: ivA, value: 40 }, stateR: { inputVar: ivA, value: 40 } }],
  inputAtPositionSpec('uid', '_input_a', 'at-default'),
  inputAtPositionSpec('uid', '_input_a', 'at-default')
)

// Fatal error: input is unknown on both sides — scenario cannot run, render as red.
const unknownInputBothScenario = scenario([
  {
    requestedName: 'Input A',
    stateL: { error: { kind: 'unknown-input' } },
    stateR: { error: { kind: 'unknown-input' } }
  }
])

// Fatal error on one side only — scenario can still run on the other side, render as yellow.
const unknownInputRightScenario = scenario(
  [
    {
      requestedName: 'Input A',
      stateL: { inputVar: ivA, value: 40 },
      stateR: { error: { kind: 'unknown-input' } }
    }
  ],
  inputAtPositionSpec('uid', '_input_a', 'at-default'),
  undefined
)

// Fatal error: multiple unknown inputs on the left side — exercises the pluralization.
const unknownInputsLeftScenario = scenario(
  [
    { requestedName: 'Input A', stateL: { error: { kind: 'unknown-input' } }, stateR: { inputVar: ivA, value: 40 } },
    { requestedName: 'Input B', stateL: { error: { kind: 'unknown-input' } }, stateR: { inputVar: ivB, value: 40 } }
  ],
  undefined,
  inputAtPositionSpec('uid', '_input_a', 'at-default')
)

// Fatal error: setting group is missing on both sides.
const unknownSettingGroupScenario = scenario([
  {
    requestedName: 'sg1',
    stateL: { error: { kind: 'unknown-input-setting-group' } },
    stateR: { error: { kind: 'unknown-input-setting-group' } }
  }
])

// Non-fatal warning: value out of range on both sides; scenario still runs.
const oorBothScenario = scenario(
  [
    {
      requestedName: 'Input A',
      stateL: { inputVar: ivA, value: 666, warning: { kind: 'value-out-of-range' } },
      stateR: { inputVar: ivA, value: 666, warning: { kind: 'value-out-of-range' } }
    }
  ],
  inputAtValueSpec('uid', '_input_a', 666),
  inputAtValueSpec('uid', '_input_a', 666)
)

// Non-fatal warning: value out of range on the right side only.
const oorRightScenario = scenario(
  [
    {
      requestedName: 'Input A',
      stateL: { inputVar: ivA, value: 90 },
      stateR: { inputVar: ivA, value: 500, warning: { kind: 'value-out-of-range' } }
    }
  ],
  inputAtValueSpec('uid', '_input_a', 90),
  inputAtValueSpec('uid', '_input_a', 500)
)

// Non-fatal warning: many inputs out of range on the right side — exercises the
// abbreviated "X and N others" rendering and the `title=` tooltip carrying the full list.
const oorManyRightScenario = scenario(
  allInputs.map(iv => ({
    requestedName: iv.varName,
    stateL: { inputVar: iv, value: 2030 },
    stateR: { inputVar: iv, value: 2020, warning: { kind: 'value-out-of-range' } }
  })),
  inputAtValueSpec('uid', '_x', 2030),
  inputAtValueSpec('uid', '_x', 2020)
)

// Settings differ between models (e.g. setting groups with different per-side values).
const settingsDifferScenario: ComparisonScenario = {
  kind: 'scenario',
  key: 'demo',
  id: 'demo',
  title: 'Demo scenario',
  settings: {
    kind: 'input-settings',
    inputs: [],
    settingsDiffer: true
  },
  specL: inputAtValueSpec('uid', '_input_a', 40),
  specR: inputAtValueSpec('uid', '_input_a', 60)
}

// Combined: many out-of-range warnings on the right side plus a "settings differ" warning,
// closely mirroring the en-roads-app1 NGFS scenarios that motivated the warning design.
const combinedWarningsScenario: ComparisonScenario = {
  ...oorManyRightScenario,
  settings: {
    ...oorManyRightScenario.settings,
    settingsDiffer: true
  } as typeof oorManyRightScenario.settings
}

// Combined: fatal error on the right side (red) plus a non-fatal warning on the left side
// (yellow) — exercises the precedence and color split.
const combinedErrorAndWarningScenario = scenario(
  [
    {
      requestedName: 'Input A',
      stateL: { inputVar: ivA, value: 500, warning: { kind: 'value-out-of-range' } },
      stateR: { error: { kind: 'unknown-input' } }
    },
    {
      requestedName: 'Input C',
      stateL: { inputVar: ivC, value: 40 },
      stateR: { inputVar: ivC, value: 40 }
    }
  ],
  inputAtValueSpec('uid', '_input_a', 500),
  undefined
)

interface AnnotationArgs {
  scenario: ComparisonScenario
}

const { Story } = defineMeta({
  title: 'Components/Annotations',
  component: StoryDecorator
})
</script>

<!--
  Each story renders the joined annotation HTML in a container styled to match the
  `.annotations` block in `comparison-summary-row.svelte` so the visual treatment
  here matches what users see in the report.
-->
{#snippet template(args: AnnotationArgs)}
  <StoryDecorator width={1000} height={120}>
    <div class="annotations-demo">
      <div class="scenario-label">{args.scenario.title ?? '(untitled)'}</div>
      <div class="annotations">
        {@html getAnnotationsForScenario(args.scenario, bundleNameL, bundleNameR).join(' ')}
      </div>
    </div>
  </StoryDecorator>
{/snippet}

<Story
  name="Clean Scenario (no annotations)"
  template={template as unknown as never}
  args={{ scenario: cleanScenario } as unknown as never}
  play={async ({ canvas }) => {
    // No annotation pills should be rendered for a cleanly resolved scenario.
    await expect(canvas.queryAllByText(/warning|invalid scenario|scenario not valid|settings differ/i)).toHaveLength(0)
  }}
/>

<Story
  name="Unknown Input on Both Sides (fatal)"
  template={template as unknown as never}
  args={{ scenario: unknownInputBothScenario } as unknown as never}
  play={async ({ canvas }) => {
    // Both-sides fatal renders as red "invalid scenario".
    await expect(canvas.getByText(/invalid scenario: unknown input 'Input A'/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Unknown Input on Right Side (one-side fatal)"
  template={template as unknown as never}
  args={{ scenario: unknownInputRightScenario } as unknown as never}
  play={async ({ canvas }) => {
    // One-side fatal renders as yellow "scenario not valid in {bundle}".
    await expect(canvas.getByText(/scenario not valid in/i)).toBeInTheDocument()
    await expect(canvas.getByText(/unknown input 'Input A'/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Unknown Inputs on Left Side (plural)"
  template={template as unknown as never}
  args={{ scenario: unknownInputsLeftScenario } as unknown as never}
  play={async ({ canvas }) => {
    // Verifies the plural noun is selected and inputs are listed.
    await expect(canvas.getByText(/unknown inputs 'Input A', 'Input B'/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Unknown Setting Group (fatal)"
  template={template as unknown as never}
  args={{ scenario: unknownSettingGroupScenario } as unknown as never}
  play={async ({ canvas }) => {
    await expect(canvas.getByText(/invalid scenario: unknown input setting group 'sg1'/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Value Out of Range on Both Sides (warning)"
  template={template as unknown as never}
  args={{ scenario: oorBothScenario } as unknown as never}
  play={async ({ canvas }) => {
    // Both-sides warning renders as yellow "warning: value out of range for 1 input".
    // The full input name lives in the tooltip, never inline.
    const pill = canvas.getByText(/^warning: value out of range for 1 input$/).closest('.annotation') as HTMLElement
    await expect(pill).not.toBeNull()
    await expect(pill.getAttribute('title')).toBe(`warning: value out of range for 'Input A'`)
    // It should NOT be rendered with the red "invalid scenario" prefix.
    await expect(canvas.queryByText(/invalid scenario/i)).not.toBeInTheDocument()
  }}
/>

<Story
  name="Value Out of Range on One Side (warning)"
  template={template as unknown as never}
  args={{ scenario: oorRightScenario } as unknown as never}
  play={async ({ canvas }) => {
    // One-side warning renders as yellow "warning for {bundle}: value out of range for 1 input".
    await expect(canvas.getByText(/warning for/i)).toBeInTheDocument()
    const pill = canvas.getByText(/value out of range for 1 input/).closest('.annotation') as HTMLElement
    await expect(pill).not.toBeNull()
    await expect(pill.getAttribute('title')).toBe(`warning for current: value out of range for 'Input A'`)
  }}
/>

<Story
  name="Many Out-of-Range Inputs (abbreviated with tooltip)"
  template={template as unknown as never}
  args={{ scenario: oorManyRightScenario } as unknown as never}
  play={async ({ canvas }) => {
    // The visible text uses the abbreviated "N inputs" form — no input names inline.
    const abbreviated = canvas.getByText(/value out of range for 7 inputs/)
    await expect(abbreviated).toBeInTheDocument()

    // The full list is carried on the annotation pill as a `title=` attribute so it
    // shows up as a native tooltip on hover.  Walk up to the annotation span and
    // verify the title contains every input name.
    const pill = abbreviated.closest('.annotation') as HTMLElement | null
    await expect(pill).not.toBeNull()
    const title = pill?.getAttribute('title') ?? ''
    await expect(title).toContain("'Afforestation CDR start year'")
    await expect(title).toContain("'Start year for intensity improvement stationary'")

    // Hover the pill so reviewers eyeballing the story see the tooltip wired up.
    if (pill) {
      await userEvent.hover(pill)
      await waitFor(() => expect(pill.getAttribute('title')).toContain('value out of range for'))
    }
  }}
/>

<Story
  name="Settings Differ Between Models"
  template={template as unknown as never}
  args={{ scenario: settingsDifferScenario } as unknown as never}
  play={async ({ canvas }) => {
    await expect(canvas.getByText(/input settings differ between the two models/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Combined: Out-of-Range Warning + Settings Differ"
  template={template as unknown as never}
  args={{ scenario: combinedWarningsScenario } as unknown as never}
  play={async ({ canvas }) => {
    // Two yellow pills should render: the abbreviated warning and the "settings differ" note.
    await expect(canvas.getByText(/value out of range for 7 inputs/)).toBeInTheDocument()
    await expect(canvas.getByText(/input settings differ between the two models/i)).toBeInTheDocument()
  }}
/>

<Story
  name="Combined: Error on Right + Warning on Left"
  template={template as unknown as never}
  args={{ scenario: combinedErrorAndWarningScenario } as unknown as never}
  play={async ({ canvas }) => {
    // The fatal error on the right is reported separately from the non-fatal warning on the left.
    await expect(canvas.getByText(/scenario not valid in/i)).toBeInTheDocument()
    await expect(canvas.getByText(/unknown input 'Input A'/i)).toBeInTheDocument()
    await expect(canvas.getByText(/warning for/i)).toBeInTheDocument()
    await expect(canvas.getByText(/value out of range for 1 input/)).toBeInTheDocument()
  }}
/>

<!-- STYLE -->
<style lang="scss">
.annotations-demo {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  flex-wrap: wrap;
  row-gap: 0.25rem;
  padding: 1rem;
  font-family: system-ui, sans-serif;
  color: #ddd;
  background-color: #2a2a2a;
}

.scenario-label {
  margin-right: 0.6rem;
  font-weight: 700;
  color: #fff;
}

.annotations {
  font-size: 0.9em;
  color: #aaa;

  :global(.annotation) {
    margin: 0 0.3rem;
    padding: 0.1rem 0.3rem;
    background-color: #1c1c1c;
    border: 0.5px solid #555;
    border-radius: 0.4rem;
  }
}
</style>
