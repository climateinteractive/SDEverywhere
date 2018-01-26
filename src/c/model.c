#include "sde.h"
#include <time.h>

// Define PERF_TEST to output run time information.
// #define PERF_TEST
#ifdef PERF_TEST
  struct timespec startTime, finishTime;
#endif

// The special _time variable is not included in .mdl files.
double _time;
// Output data buffer
char* outputData;
size_t outputIndex = 0;

const char* run_model(const char* inputs) {
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

void run() {
  #ifdef PERF_TEST
    clock_gettime(CLOCK_MONOTONIC, &startTime);
  #endif
  // Initialize time with the required INITIAL TIME control variable.
  _time = _initial_time;
  // Set up a run loop using a fixed number of time steps.
  int step = 0;
  int lastStep = (int)(round((_final_time - _initial_time) / _time_step));
  while (step <= lastStep) {
    evalAux();
    if (fmod(_time, _saveper) < 1e-6) {
      storeOutputData();
    }
    if (step == lastStep) break;
    // Propagate levels for the next time step.
    evalLevels();
    _time += _time_step;
    step++;
  }
}

void outputVar(double value) {
  // Allocate an output buffer for all output steps as a single block.
  // Add one character for a null terminator.
  if (outputData == NULL) {
    int numOutputSteps = (int)(round((_final_time - _initial_time) / _saveper)) + 1;
    size_t size = numOutputSteps * (OUTPUT_STRING_LEN * numOutputs) + 1;
    outputData = (char*)malloc(size);
  }
  int numChars = snprintf(outputData + outputIndex, OUTPUT_STRING_LEN+1, "%g\t", value);
  outputIndex += numChars;
}

void finish() {
  #ifdef PERF_TEST
    clock_gettime(CLOCK_MONOTONIC, &finishTime);
    double runtime = 1000.0 * finishTime.tv_sec + 1e-6 * finishTime.tv_nsec -
      (1000.0 * startTime.tv_sec + 1e-6 * startTime.tv_nsec);
    fprintf(stderr, "calculation runtime = %.0f ms\n", runtime);
  #endif
  if (outputData != NULL) {
    free(outputData);
  }
}
