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
        { $ref: '#/$defs/graph_group_array_item' },
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
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        },
        with: {
          type: 'string'
        },
        at: {
          $ref: '#/$defs/scenario_position'
        }
      },
      required: ['with', 'at']
    },

    scenario_with_input_at_value: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        },
        with: {
          type: 'string'
        },
        at: {
          type: 'number'
        }
      },
      required: ['with', 'at']
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
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        },
        with: {
          $ref: '#/$defs/scenario_input_setting_array'
        }
      },
      required: ['with']
    },

    scenario_with_inputs_in_preset_at_position: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
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
      required: ['with_inputs', 'at']
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
        id: {
          type: 'string'
        },
        title: {
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
      required: ['title', 'scenarios']
    },

    scenario_group_scenarios_array_item: {
      oneOf: [{ $ref: '#/$defs/scenario_array_item' }, { $ref: '#/$defs/scenario_ref_array_item' }]
    },

    scenario_ref_id: {
      type: 'string'
    },

    scenario_ref_object: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        }
      },
      required: ['id']
    },

    scenario_ref: {
      oneOf: [{ $ref: '#/$defs/scenario_ref_id' }, { $ref: '#/$defs/scenario_ref_object' }]
    },

    scenario_ref_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenario_ref: {
          $ref: '#/$defs/scenario_ref'
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
    // GRAPHS
    //

    graphs_preset: {
      type: 'string',
      enum: ['all']
    },

    graphs_array: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    },

    graph_group_ref: {
      type: 'object',
      additionalProperties: false,
      properties: {
        graph_group_ref: {
          type: 'string'
        }
      },
      required: ['graph_group_ref']
    },

    //
    // GRAPH GROUPS
    //

    graph_group_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        graph_group: {
          $ref: '#/$defs/graph_group'
        }
      },
      required: ['graph_group']
    },

    graph_group: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        graphs: {
          $ref: '#/$defs/graphs_array'
        }
      },
      required: ['id', 'graphs']
    },

    //
    // VIEWS
    //

    view: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        },
        scenario_ref: {
          type: 'string'
        },
        graphs: {
          $ref: '#/$defs/view_graphs'
        },
        graph_order: {
          $ref: '#/$defs/view_graph_order'
        }
      },
      required: ['scenario_ref', 'graphs']
    },

    view_graphs: {
      oneOf: [{ $ref: '#/$defs/graphs_preset' }, { $ref: '#/$defs/graphs_array' }, { $ref: '#/$defs/graph_group_ref' }]
    },

    view_graph_order: {
      type: 'string',
      enum: ['default', 'group-by-diffs']
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
      oneOf: [
        { $ref: '#/$defs/view_group_with_views_array' },
        { $ref: '#/$defs/view_group_shorthand_with_scenarios_array' }
      ]
    },

    view_group_with_views_array: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: {
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
      required: ['title', 'views']
    },

    view_group_views_array_item: {
      type: 'object',
      additionalProperties: false,
      properties: {
        view: {
          $ref: '#/$defs/view'
        }
      }
    },

    view_group_shorthand_with_scenarios_array: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: {
          type: 'string'
        },
        scenarios: {
          type: 'array',
          items: {
            $ref: '#/$defs/view_group_scenarios_array_item'
          },
          minItems: 1
        },
        graphs: {
          $ref: '#/$defs/view_graphs'
        }
      },
      required: ['title', 'scenarios', 'graphs']
    },

    view_group_scenarios_array_item: {
      oneOf: [{ $ref: '#/$defs/scenario_ref_array_item' }, { $ref: '#/$defs/scenario_group_ref' }]
    }
  }
}
