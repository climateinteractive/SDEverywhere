#include "sde.h"

int main(int argc, char** argv) {
  initConstants();
  if (argc > 1) {
    // Try to read input from a file named in the argument.
    char buf[1000];
    FILE* instream = fopen(argv[1], "r");
    if (instream && fgets(buf, sizeof buf, instream) != NULL) {
      fclose(instream);
      size_t len = strlen(buf);
      if (buf[len-1] == '\n') {
        buf[len-1] = '\0';
      }
      // fprintf(stderr, "%s\n", buf);
      setInputs(buf);
    } else {
      // TODO this will pass an incorrect filename as input - fix this
      // No file was found, so pass the argument directly as input.
      // This is the input path for the web app.
      setInputs(argv[1]);
    }
  }
  initLevels();
  run();
  finish();
}
