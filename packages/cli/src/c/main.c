#include "sde.h"

/**
 * Count the number of input pairs in the input string.
 */
static size_t countInputs(const char* inputData) {
  if (inputData == NULL || *inputData == '\0') {
    return 0;
  }

  // Make a copy since strtok modifies the string
  char* inputsCopy = (char*)malloc(strlen(inputData) + 1);
  strcpy(inputsCopy, inputData);

  size_t count = 0;
  char* token = strtok(inputsCopy, " ");
  while (token) {
    if (strchr(token, ':') != NULL) {
      count++;
    }
    token = strtok(NULL, " ");
  }
  free(inputsCopy);

  return count;
}

/**
 * Parse input data string in the format "varIndex:value varIndex:value ..."
 * and populate the inputValues and inputIndices arrays for sparse input setting.
 *
 * @param inputData The input string to parse.
 * @param inputValues The array to populate with input values.
 * @param inputIndices The array to populate with input indices (first element is count).
 */
static void parseInputs(const char* inputData, double* inputValues, int32_t* inputIndices) {
  if (inputData == NULL || *inputData == '\0') {
    return;
  }

  // Make a copy since strtok modifies the string
  char* inputsCopy = (char*)malloc(strlen(inputData) + 1);
  strcpy(inputsCopy, inputData);

  size_t i = 0;
  char* token = strtok(inputsCopy, " ");
  while (token) {
    char* p = strchr(token, ':');
    if (p) {
      *p = '\0';
      int modelVarIndex = atoi(token);
      double value = atof(p + 1);
      inputIndices[i + 1] = modelVarIndex;
      inputValues[i] = value;
      i++;
    }
    token = strtok(NULL, " ");
  }
  inputIndices[0] = (int32_t)i;
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

  // Parse input string and create sparse input arrays. Only allocate buffers if there
  // are inputs to parse; otherwise pass NULL to runModelWithBuffers so that the model
  // uses its default values from initConstants.
  double* inputValues = NULL;
  int32_t* inputIndices = NULL;
  size_t inputCount = countInputs(inputString);
  if (inputCount > 0) {
    inputValues = (double*)malloc(inputCount * sizeof(double));
    inputIndices = (int32_t*)malloc((inputCount + 1) * sizeof(int32_t));
    parseInputs(inputString, inputValues, inputIndices);
  }

  // Calculate the number of save points for the output buffer
  double initialTime = getInitialTime();
  double finalTime = getFinalTime();
  double saveper = getSaveper();
  size_t numSavePoints = (size_t)(round((finalTime - initialTime) / saveper)) + 1;

  // Allocate output buffer
  double* outputBuffer = (double*)malloc(numOutputs * numSavePoints * sizeof(double));

  // Run the model with the sparse input arrays and output buffer
  runModelWithBuffers(inputValues, inputIndices, outputBuffer, NULL);

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
  if (inputValues != NULL) {
    free(inputValues);
  }
  if (inputIndices != NULL) {
    free(inputIndices);
  }
  free(outputBuffer);
  finish();
}
