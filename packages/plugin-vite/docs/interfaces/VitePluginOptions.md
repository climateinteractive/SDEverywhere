[@sdeverywhere/plugin-vite](../index.md) / VitePluginOptions

# Interface: VitePluginOptions

## Properties

### name

 **name**: `string`

The name to include in log messages.

___

### config

 **config**: `InlineConfig`

The Vite config to use.

___

### apply

 `Optional` **apply**: `Object`

Specifies the behavior of the plugin for different `sde` build modes.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `development?` | ``"watch"`` \| ``"serve"`` \| ``"skip"`` \| ``"post-generate"`` \| ``"post-build"`` |
| `production?` | ``"skip"`` \| ``"post-generate"`` \| ``"post-build"`` |

**development?**: ``"watch"`` \| ``"serve"`` \| ``"skip"`` \| ``"post-generate"`` \| ``"post-build"``

The behavior of the plugin when sde is configured for development mode.

If left undefined, defaults to 'post-build'.

- `skip`: Don't run the plugin.
- `post-generate`: Run `vite build` in the `postGenerate` phase.
- `post-build`: Run `vite build` in the `postBuild` phase.
- `watch`: Run `vite build` in the `watch` callback (rebuilds the library when
  changes are detected in source files); useful for libraries.
- `serve`: Run `vite dev` (sets up local server and refreshes the app
  automatically when changes are detected); useful for applications.

-----

**production?**: ``"skip"`` \| ``"post-generate"`` \| ``"post-build"``

The behavior of the plugin when sde is configured for production mode.

If left undefined, defaults to 'post-build'.

- `skip`: Don't run the plugin.
- `post-generate`: Run `vite build` in the `postGenerate` phase.
- `post-build`: Run `vite build` in the `postBuild` phase.

-----
