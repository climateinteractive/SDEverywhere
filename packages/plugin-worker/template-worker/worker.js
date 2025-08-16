// Copyright (c) 2022 Climate Interactive / New Venture Fund

// NOTE: This import *must* specify "worker" at the end (instead of the general
// "index" import), otherwise Vite will pull in more code than necessary and it will
// generate a worker that won't run correctly in Node or the browser.
import { exposeModelWorker } from '@sdeverywhere/runtime-async/worker'

import loadGeneratedModel from '@_generatedModelFile_'

exposeModelWorker(loadGeneratedModel)
