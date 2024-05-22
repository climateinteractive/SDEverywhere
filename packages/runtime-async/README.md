# @sdeverywhere/runtime-async

This package provides an implementation of the `ModelRunner` interface (from the `@sdeverywhere/runtime` package) that uses a Web Worker (in the browser) or a worker thread (in a Node.js app) to run the model asynchronously off the main JavaScript thread.

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/runtime-async` package will be added to your project automatically, in which case you can skip the next section and jump straight to the ["Usage"](#usage) section below.

## Install

```sh
# npm
npm install @sdeverywhere/runtime-async

# pnpm
pnpm add @sdeverywhere/runtime-async

# yarn
yarn add @sdeverywhere/runtime-async
```

## Usage

_NOTE:_ If you followed the "Quick Start" instructions and/or used the
`@sdeverywhere/create` package to generate your project, the initialization
steps listed below are already implemented for you in the generated `core` package,
and you can work directly with a `ModelRunner` and/or `ModelScheduler` instance.

### 1. Initialize your generated model in a Web Worker

In your app project, define a separate JavaScript file, called
`worker.js` for example, that initializes the generated model in the
context of the Web Worker:

```js
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'
import loadGeneratedModel from './sde-prep/generated-model.js'

exposeModelWorker(loadGeneratedModel)
```

### 2. Spawn the worker

In your web app, call the `spawnAsyncModelRunner` function, which will
spawn the Web Worker and initialize the `ModelRunner` that communicates
with the worker:

```js
import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async/runner'

async function initApp() {
  // ...
  const runner = await spawnAsyncModelRunner({ path: './worker.js' })
  // ...
}
```

## Documentation

API documentation is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
