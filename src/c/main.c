#include "sde.h"

int main(int argc, char** argv) {
  initConstants();
  // TODO parse JSON input and set input values directly
  if (argc > 1) {
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
    }
  }
  initLevels();
  run();
  finish();
}
