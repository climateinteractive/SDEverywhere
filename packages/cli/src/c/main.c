#include "sde.h"

int main(int argc, char** argv) {
  // TODO make the input buffer size dynamic
  char inputs[500000];
  // When true, output data without newlines or a header, suitable for embedding reference data.
  bool raw_output = false;
  // When true, suppress data output when using PR* macros.
  bool suppress_data_output = false;
  // Try to read input from a file named in the argument.
  if (argc > 1) {
    FILE* instream = fopen(argv[1], "r");
    if (instream && fgets(inputs, sizeof inputs, instream) != NULL) {
      fclose(instream);
      size_t len = strlen(inputs);
      if (inputs[len - 1] == '\n') {
        inputs[len - 1] = '\0';
      }
    }
    if (argc > 2) {
      // Set option flags.
      if (strcmp(argv[2], "--raw") == 0) {
        raw_output = true;
      }
    }
  } else {
    *inputs = '\0';
  }
  // Run the model and get output for all time steps.
  char* outputs = run_model(inputs);
  if (!suppress_data_output) {
    if (raw_output) {
      // Write raw output data directly.
      fputs(outputs, stdout);
    } else {
      // Write a header for output data.
      printf("%s\n", getHeader());
      // Write tab-delimited output data, one line per output time step.
      if (outputs != NULL) {
        char* p = outputs;
        while (*p) {
          char* line = p;
          for (size_t i = 0; i < numOutputs; i++) {
            if (i > 0) {
              p++;
            }
            while (*p && *p != '\t') {
              p++;
            }
          }
          *p++ = '\0';
          printf("%s\n", line);
        }
      }
    }
  }
  finish();
}
