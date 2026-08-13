[@sdeverywhere/plugin-wasm](../index.md) / defaultEmccArgs

# Function: defaultEmccArgs()

> **defaultEmccArgs**(): `string`[]

Return the default set of arguments that the plugin passes to `emcc`, which are tuned
for (and known to work with) Emscripten versions 2.0.34 and 3.1.46, among others.

This can be used to customize the arguments without having to repeat the full default
set, for example:
```js
  wasmPlugin({
    emccArgs: [...defaultEmccArgs(), '-sASSERTIONS=1']
  })
```

## Returns

`string`[]

A new array containing the default `emcc` arguments.
