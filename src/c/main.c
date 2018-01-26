#include "sde.h"

int main(int argc, char** argv) {
  // TODO make the input buffer size dynamic
  char* inputs[1000];
  // Try to read input from a file named in the argument.
  if (argc > 1) {
    FILE* instream = fopen(argv[1], "r");
    if (instream && fgets(inputs, sizeof inputs, instream) != NULL) {
      fclose(instream);
      size_t len = strlen(inputs);
      if (inputs[len-1] == '\n') {
        inputs[len-1] = '\0';
      }
    }
  }
  else {
    *inputs = '\0';
  }
  // Run the model and get output for all time steps.
  const char* outputs = run_model(inputs);
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
  finish();
}
