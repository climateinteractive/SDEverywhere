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
// Each number in the output can take up to 13 characters plus a separator character.
const size_t outputStringLength = 14;

void run() {
  // Allocate the output buffer as a single block.
  // Add one character for a null terminator.
  if (outputData == NULL) {
    outputData = (char*)malloc(outputStringLength * numOutputs + 1);
  }
  #ifdef PERF_TEST
    clock_gettime(CLOCK_MONOTONIC, &startTime);
  #endif
  // Initialize time with the required INITIAL TIME control variable.
  _time = _initial_time;
  // Write a header for output data.
  writeHeader();
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

void startOutput() {
  outputIndex = 0;
}

void outputVar(double value) {
  int numChars = snprintf(outputData + outputIndex, outputStringLength+1, "%g\t", value);
  outputIndex += numChars;
}

void writeOutput(const char* text) {
  // Don't write output if we are doing a performance test, so we get calc time only.
  #ifndef PERF_TEST
  puts(text);
  #endif
}

void writeOutputData() {
  // Send output data in string format to the application environment.
  // The implementation of writeOutput depends on the environment in which the model is used.
  writeOutput(outputData);
}

void writeText(const char* text) {
  writeOutput(text);
}
