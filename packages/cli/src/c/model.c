#include <time.h>

#include "sde.h"

// Define PERF_TEST to output run time information.
// #define PERF_TEST
#ifdef PERF_TEST
struct timespec startTime, finishTime;
#endif

// The special _time variable is not included in .mdl files.
double _time;

// Output data buffer used by `run_model`
char* outputData = NULL;
size_t outputIndex = 0;

// Output data buffer used by `runModelWithBuffers`
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

char* run_model(const char* inputs) {
  // run_model does everything necessary to run the model with the given inputs.
  // It may be called multiple times. Call finish() after all runs are complete.
  // Initialize the state to default values in the model at the start of each run.
  initConstants();
  // Set inputs for this run that override default values.
  // fprintf(stderr, "run_model inputs = %s\n", inputs);
  setInputs(inputs);
  initLevels();
  run();
  return outputData;
}

/**
 * Run the model, reading inputs from the given `inputs` buffer, and writing outputs
 * to the given `outputs` buffer.
 *
 * This function performs the same steps as the original `run_model` function,
 * except that it uses the provided pre-allocated buffers.
 *
 * The `inputs` buffer is assumed to have one double value for each input variable;
 * they must be in exactly the same order as the variables are listed in the spec file.
 *
 * After each step of the run, the `outputs` buffer will be updated with the output
 * variables.  The buffer needs to be at least as large as:
 *   `number of output variables` * `number of save points`
 * where `number of save points` is typically one point for each year inclusive of
 * the start and end times.
 *
 * The outputs will be stored in the same order as the outputs are defined in the
 * spec file, with one "row" for each variable.  For example, the first value in
 * the buffer will be the output value at t0 for the first output variable, followed
 * by the output value for that variable at t1, and so on.  After the value for tN
 * (where tN is the last time in the range), the second variable outputs will begin,
 * and so on.
 */
void runModelWithBuffers(double* inputs, double* outputs, int32_t* outputIndices) {
  outputBuffer = outputs;
  outputIndexBuffer = outputIndices;
  initConstants();
  setInputsFromBuffer(inputs);
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
  outputIndex = 0;

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
  if (outputBuffer != NULL) {
    // Write each value into the preallocated buffer; each variable has a "row" that
    // contains `numSavePoints` values, one value for each save point
    double* outputPtr = outputBuffer + (outputVarIndex * numSavePoints) + savePointIndex;
    *outputPtr = value;
    outputVarIndex++;
  } else {
    // Allocate an output buffer for all output steps as a single block.
    // Add one character for a null terminator.
    if (outputData == NULL) {
      int numOutputSteps = (int)(round((_final_time - _initial_time) / _saveper)) + 1;
      size_t size = numOutputSteps * (OUTPUT_STRING_LEN * numOutputs) + 1;
      // fprintf(stderr, "output data size = %zu\n", size);
      outputData = (char*)malloc(size);
    }
    // Format the value as a string in the output data buffer.
    int numChars = snprintf(outputData + outputIndex, OUTPUT_STRING_LEN + 1, "%g\t", value);
    outputIndex += numChars;
  }
}

void finish() {
#ifdef PERF_TEST
  clock_gettime(CLOCK_MONOTONIC, &finishTime);
  double runtime =
      1000.0 * finishTime.tv_sec + 1e-6 * finishTime.tv_nsec - (1000.0 * startTime.tv_sec + 1e-6 * startTime.tv_nsec);
  fprintf(stderr, "calculation runtime = %.0f ms\n", runtime);
#endif
  if (outputData != NULL) {
    free(outputData);
  }
}
