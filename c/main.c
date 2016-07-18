#include "sde.h"

#ifndef TARGET_ASM
int main(int argc, char** argv) {
  init();
  // TODO parse JSON input and set input values directly
  if (argc > 1) {
    setInputs(argv[1]);
  }
  run();
  finish();
}
#endif
