#include "sde.h"

/**
 * Parse input data string in the format "varIndex:value varIndex:value ..."
 * and populate the input buffer.
 *
 * @param inputData The input string to parse.
 * @param inputBuffer The buffer to populate with parsed values.
 */
static void parseInputs(const char* inputData, double* inputBuffer) {
  if (inputData == NULL || *inputData == '\0') {
    return;
  }
  // Make a copy since strtok modifies the string
  char* inputs = (char*)inputData;
  char* inputsCopy = (char*)malloc(strlen(inputs) + 1);
  strcpy(inputsCopy, inputs);

  char* token = strtok(inputsCopy, " ");
  while (token) {
    char* p = strchr(token, ':');
    if (p) {
      *p = '\0';
      int modelVarIndex = atoi(token);
      double value = atof(p + 1);
      inputBuffer[modelVarIndex] = value;
    }
    token = strtok(NULL, " ");
  }
  free(inputsCopy);
}

int main(int argc, char** argv) {
  // TODO make the input buffer size dynamic
  char inputString[500000];
  // When true, output data without newlines or a header, suitable for embedding reference data.
  bool raw_output = false;
  // When true, suppress data output when using PR* macros.
  bool suppress_data_output = false;
  // Try to read input from a file named in the argument.
  if (argc > 1) {
    FILE* instream = fopen(argv[1], "r");
    if (instream && fgets(inputString, sizeof inputString, instream) != NULL) {
      fclose(instream);
      size_t len = strlen(inputString);
      if (inputString[len - 1] == '\n') {
        inputString[len - 1] = '\0';
      }
    }
    if (argc > 2) {
      // Set option flags.
      if (strcmp(argv[2], "--raw") == 0) {
        raw_output = true;
      }
    }
  } else {
    *inputString = '\0';
  }

  // Allocate input buffer and parse string inputs into it.
  // Only allocate a buffer if there are inputs to parse; otherwise pass NULL
  // to runModel so that the model uses its default values from initConstants.
  double* inputBuffer = NULL;
  if (numInputs > 0 && *inputString != '\0') {
    inputBuffer = (double*)calloc(numInputs, sizeof(double));
    parseInputs(inputString, inputBuffer);
  }

  // Calculate the number of save points for the output buffer
  double initialTime = getInitialTime();
  double finalTime = getFinalTime();
  double saveper = getSaveper();
  size_t numSavePoints = (size_t)(round((finalTime - initialTime) / saveper)) + 1;

  // Allocate output buffer
  double* outputBuffer = (double*)malloc(numOutputs * numSavePoints * sizeof(double));

  // Run the model with the input and output buffers
  runModel(inputBuffer, outputBuffer);

  if (!suppress_data_output) {
    if (raw_output) {
      // Write raw output data directly (tab-separated, no newlines)
      for (size_t t = 0; t < numSavePoints; t++) {
        for (size_t v = 0; v < numOutputs; v++) {
          // Output buffer is organized by variable (each variable has numSavePoints values)
          double value = outputBuffer[v * numSavePoints + t];
          printf("%g\t", value);
        }
      }
    } else {
      // Write a header for output data.
      printf("%s\n", getHeader());
      // Write tab-delimited output data, one line per output time step.
      for (size_t t = 0; t < numSavePoints; t++) {
        for (size_t v = 0; v < numOutputs; v++) {
          // Output buffer is organized by variable (each variable has numSavePoints values)
          double value = outputBuffer[v * numSavePoints + t];
          if (v > 0) {
            printf("\t");
          }
          printf("%g", value);
        }
        printf("\n");
      }
    }
  }

  // Clean up
  if (inputBuffer != NULL) {
    free(inputBuffer);
  }
  free(outputBuffer);
  finish();
}
