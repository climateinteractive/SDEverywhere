// Copyright (c) 2022 Climate Interactive / New Venture Fund

export default {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Model Comparison Test',
  type: 'array',
  description: 'A group of model comparison scenarios and views.',
  items: {
    $ref: '#/$defs/top_level_array_item'
  },

  $defs: {
    //
    // TOP-LEVEL
    //

    top_level_array_item: {
      oneOf: [
        { $ref: '#/$defs/scenario_array_item' },
        { $ref: '#/$defs/scenario_group_array_item' },
        { $ref: '#/$defs/view_group_array_item' }
      ]
    },

    //
    // SCENARIOS
    //

    scenario_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenario: {
          $ref: '#/$defs/scenario'
        }
      },
      required: ['scenario']
    },

    scenario: {
      oneOf: [
        { $ref: '#/$defs/scenario_with_input_at_position' },
        { $ref: '#/$defs/scenario_with_input_at_value' },
        { $ref: '#/$defs/scenario_with_multiple_input_settings' },
        { $ref: '#/$defs/scenario_with_inputs_in_preset_at_position' },
        // { $ref: '#/$defs/scenario_with_inputs_in_group_at_position' }
        { $ref: '#/$defs/scenario_preset' }
        // { $ref: '#/$defs/scenario_expand_for_each_input_in_group' }
      ]
    },

    scenario_position: {
      type: 'string',
      enum: ['min', 'max', 'default']
    },

    scenario_with_input_at_position: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        with: {
          type: 'string'
        },
        at: {
          $ref: '#/$defs/scenario_position'
        }
      },
      required: ['name', 'with', 'at']
    },

    scenario_with_input_at_value: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        with: {
          type: 'string'
        },
        at: {
          type: 'number'
        }
      },
      required: ['name', 'with', 'at']
    },

    scenario_input_at_position: {
      type: 'object',
      additionalProperties: false,
      properties: {
        input: {
          type: 'string'
        },
        at: {
          $ref: '#/$defs/scenario_position'
        }
      },
      required: ['input', 'at']
    },

    scenario_input_at_value: {
      type: 'object',
      additionalProperties: false,
      properties: {
        input: {
          type: 'string'
        },
        at: {
          type: 'number'
        }
      },
      required: ['input', 'at']
    },

    scenario_input_setting: {
      oneOf: [{ $ref: '#/$defs/scenario_input_at_position' }, { $ref: '#/$defs/scenario_input_at_value' }]
    },

    scenario_input_setting_array: {
      type: 'array',
      items: {
        $ref: '#/$defs/scenario_input_setting'
      },
      minItems: 1
    },

    scenario_with_multiple_input_settings: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        with: {
          $ref: '#/$defs/scenario_input_setting_array'
        }
      },
      required: ['name', 'with']
    },

    scenario_with_inputs_in_preset_at_position: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        with_inputs: {
          type: 'string',
          enum: ['all']
        },
        at: {
          $ref: '#/$defs/scenario_position'
        }
      },
      required: ['name', 'with_inputs', 'at']
    },

    scenario_preset: {
      type: 'object',
      additionalProperties: false,
      properties: {
        preset: {
          type: 'string',
          enum: ['matrix']
        }
      },
      required: ['preset']
    },

    //
    // SCENARIO GROUPS
    //

    scenario_group_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenario_group: {
          $ref: '#/$defs/scenario_group'
        }
      },
      required: ['scenario_group']
    },

    scenario_group: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        scenarios: {
          type: 'array',
          items: {
            $ref: '#/$defs/scenario_group_scenarios_array_item'
          },
          minItems: 1
        }
      },
      required: ['name', 'scenarios']
    },

    scenario_group_scenarios_array_item: {
      oneOf: [{ $ref: '#/$defs/scenario_array_item' }, { $ref: '#/$defs/scenario_ref' }]
    },

    scenario_ref: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenario_ref: {
          type: 'string'
        }
      },
      required: ['scenario_ref']
    },

    scenario_group_ref: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenario_group_ref: {
          type: 'string'
        }
      },
      required: ['scenario_group_ref']
    },

    //
    // VIEWS
    //

    view: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        scenarios: {
          type: 'array',
          items: {
            $ref: '#/$defs/view_scenarios_array_item'
          },
          minItems: 1
        },
        graphs: {
          $ref: '#/$defs/view_graphs'
        }
      },
      required: ['name', 'scenarios', 'graphs']
    },

    view_scenarios_array_item: {
      oneOf: [{ $ref: '#/$defs/scenario_ref' }, { $ref: '#/$defs/scenario_group_ref' }]
    },

    view_graphs: {
      oneOf: [{ $ref: '#/$defs/view_graphs_preset' }, { $ref: '#/$defs/view_graphs_array' }]
    },

    view_graphs_preset: {
      type: 'string',
      enum: ['all']
    },

    view_graphs_array: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    },

    //
    // VIEW GROUPS
    //

    view_group_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        view_group: {
          $ref: '#/$defs/view_group'
        }
      },
      required: ['view_group']
    },

    view_group: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string'
        },
        views: {
          type: 'array',
          items: {
            $ref: '#/$defs/view_group_views_array_item'
          },
          minItems: 1
        }
      },
      required: ['name', 'views']
    },

    view_group_views_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        view: {
          $ref: '#/$defs/view'
        }
      }
    }
  }
}
