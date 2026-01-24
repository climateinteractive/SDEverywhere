#include <time.h>

#include "sde.h"

// Define PERF_TEST to output run time information.
// #define PERF_TEST
#ifdef PERF_TEST
struct timespec startTime, finishTime;
#endif

// The special _time variable is not included in .mdl files.
double _time;

// Output data buffer and parameters used by `runModelWithBuffers`
double* outputBuffer = NULL;
int32_t* outputIndexBuffer = NULL;
size_t outputVarIndex = 0;
size_t numSavePoints = 0;
size_t savePointIndex = 0;

int step = 0;

void initControlParamsIfNeeded() {
  static bool controlParamsInitialized = false;
  if (controlParamsInitialized) {
    return;
  }

  // Some models may define the control parameters as variables that are
  // dependent on other values that are only known at runtime (after running
  // the initializers and/or one step of the model), so we need to perform
  // those steps once before the parameters are accessed
  // TODO: This approach doesn't work if one or more control parameters are
  // defined in terms of some value that is provided at runtime as an input
  initConstants();
  initLevels();
  _time = _initial_time;
  evalAux();
  controlParamsInitialized = true;
}

/**
 * Return the constant or computed value of `INITIAL TIME`.
 */
double getInitialTime() {
  initControlParamsIfNeeded();
  return _initial_time;
}

/**
 * Return the constant or computed value of `FINAL TIME`.
 */
double getFinalTime() {
  initControlParamsIfNeeded();
  return _final_time;
}

/**
 * Return the constant or computed value of `SAVEPER`.
 */
double getSaveper() {
  initControlParamsIfNeeded();
  return _saveper;
}

/**
 * Run the model, reading inputs from the given `inputs` buffer, and writing outputs
 * to the given `outputs` buffer.
 *
 * This is a simplified version of `runModelWithBuffers` that passes NULL for
 * all parameters other than `inputs` and `outputs`.
 *
 * After each step of the run, the `outputs` buffer will be updated with the output
 * variables.  The `outputs` buffer needs to be at least as large as:
 *   `number of output variables` * `number of save points`
 *
 * The outputs will be stored in the same order as the outputs are defined in the
 * spec file, with one "row" for each variable.  For example, the first value in
 * the buffer will be the output value at t0 for the first output variable,
 * followed by the output value for that variable at t1, and so on.  After the
 * value for tN (where tN is the last time in the range), the second variable
 * outputs will begin, and so on.
 *
 * @param inputs The buffer that contains the model input values.  If NULL,
 * no inputs will be set and the model will use the default values for all
 * constants as defined in the generated model.  If non-NULL, the buffer is
 * assumed to have one double value for each input variable in exactly the
 * same order that the variables are listed in the spec file.
 * @param outputs The required buffer that will receive the model output
 * values.  See above for details on the expected format.
 */
void runModel(double* inputs, double* outputs) {
  runModelWithBuffers(inputs, NULL, outputs, NULL);
}

/**
 * Run the model, reading inputs from the given `inputs` buffer, and writing outputs
 * to the given `outputs` buffer.
 *
 * If `inputIndices` is NULL, the `inputs` buffer is assumed to have one double value
 * for each input variable, in exactly the same order as the variables are listed in
 * the spec file.
 *
 * If `inputIndices` is non-NULL, it specifies which inputs are being set:
 *   - inputIndices[0] is the count of inputs being specified
 *   - inputIndices[1..N] are the indices of the inputs to set
 *   - inputs[0..N-1] are the corresponding values
 *
 * After each step of the run, the `outputs` buffer will be updated with the output
 * variables.  The `outputs` buffer needs to be at least as large as:
 *   `number of output variables` * `number of save points`
 *
 * If `outputIndices` is NULL, outputs will be stored in the same order as the outputs
 * are defined in the spec file, with one "row" for each variable.  For example, the
 * first value in the buffer will be the output value at t0 for the first output
 * variable, followed by the output value for that variable at t1, and so on.  After
 * the value for tN (where tN is the last time in the range), the second variable
 * outputs will begin, and so on.
 *
 * If `outputIndices` is non-NULL, it specifies which outputs are being stored:
 *   - outputIndices[0] is the count of output variables being stored
 *   - outputIndices[1..N] are the indices of the output variables to store (unlike
 *     `inputIndices`, these indices refer to the ones defined in the `{model}.json`
 *     listing file, NOT the list of output variables spec file)
 *   - outputs[0..N-1] are the corresponding values
 *
 * @param inputs The buffer that contains the model input values.  If NULL,
 * no inputs will be set and the model will use the default values for all
 * constants as defined in the generated model.  If non-NULL, the buffer is
 * assumed to have one double value for each input variable.  The number of
 * values provided depends on `inputIndices`; see above for details on the
 * expected format of these two parameters.
 * @param inputIndices The optional buffer that specifies which input values
 * from the `inputs` buffer are being set.  See above for details on the
 * expected format.
 * @param outputs The required buffer that will receive the model output
 * values.  See above for details on the expected format.
 * @param outputIndices The optional buffer that specifies which output values
 * will be stored in the `outputs` buffer.  See above for details on the
 * expected format.
 */
void runModelWithBuffers(double* inputs, int32_t* inputIndices, double* outputs, int32_t* outputIndices) {
  outputBuffer = outputs;
  outputIndexBuffer = outputIndices;
  initConstants();
  if (inputs != NULL) {
    setInputs(inputs, inputIndices);
  }
  initLevels();
  run();
  outputBuffer = NULL;
  outputIndexBuffer = NULL;
}

void run() {
#ifdef PERF_TEST
  clock_gettime(CLOCK_MONOTONIC, &startTime);
#endif

  // Restart fresh output for all steps in this run.
  savePointIndex = 0;

  // Initialize time with the required INITIAL TIME control variable.
  _time = _initial_time;

  // Set up a run loop using a fixed number of time steps.
  int lastStep = (int)(round((_final_time - _initial_time) / _time_step));
  step = 0;
  while (step <= lastStep) {
    evalAux();
    if (fmod(_time, _saveper) < 1e-6) {
      // Note that many Vensim models set `SAVEPER = TIME STEP`, in which case SDE
      // treats `SAVEPER` as an aux rather than a constant.  Therefore, we need to
      // initialize `numSavePoints` here, after the first `evalAux` call, to be
      // certain that `_saveper` has been initialized before it is used.
      if (numSavePoints == 0) {
        numSavePoints = (size_t)(round((_final_time - _initial_time) / _saveper)) + 1;
      }
      outputVarIndex = 0;
      if (outputIndexBuffer != NULL) {
        // Store the outputs as specified in the current output index buffer
        size_t indexBufferOffset = 0;
        size_t outputCount = (size_t)outputIndexBuffer[indexBufferOffset++];
        for (size_t i = 0; i < outputCount; i++) {
          size_t varIndex = (size_t)outputIndexBuffer[indexBufferOffset++];
          size_t subCount = (size_t)outputIndexBuffer[indexBufferOffset++];
          size_t* subIndices;
          if (subCount > 0) {
            subIndices = (size_t*)(outputIndexBuffer + indexBufferOffset);
          } else {
            subIndices = NULL;
          }
          indexBufferOffset += subCount;
          storeOutput(varIndex, subIndices);
        }
      } else {
        // Store the normal outputs
        storeOutputData();
      }
      savePointIndex++;
    }
    if (step == lastStep) break;
    // Propagate levels for the next time step.
    evalLevels();
    _time += _time_step;
    step++;
  }
}

void outputVar(double value) {
  // Write each value into the preallocated buffer; each variable has a "row" that
  // contains `numSavePoints` values, one value for each save point
  double* outputPtr = outputBuffer + (outputVarIndex * numSavePoints) + savePointIndex;
  *outputPtr = value;
  outputVarIndex++;
}

void finish() {
#ifdef PERF_TEST
  clock_gettime(CLOCK_MONOTONIC, &finishTime);
  double runtime =
      1000.0 * finishTime.tv_sec + 1e-6 * finishTime.tv_nsec - (1000.0 * startTime.tv_sec + 1e-6 * startTime.tv_nsec);
  fprintf(stderr, "calculation runtime = %.0f ms\n", runtime);
#endif
}
