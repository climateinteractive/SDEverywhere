// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { WizardCardDescViewModel } from './wizard-card-desc-vm'
import type { WizardCardInputsViewModel } from './wizard-card-inputs-vm'
import type { WizardCardOutputsViewModel } from './wizard-card-outputs-vm'
import type { WizardCardPredicatesViewModel } from './wizard-card-predicates-vm'

export interface WizardCardsViewModel {
  desc: WizardCardDescViewModel
  outputs: WizardCardOutputsViewModel
  inputs: WizardCardInputsViewModel
  predicates: WizardCardPredicatesViewModel
}
