#pragma once

#ifndef EXTERN
#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN extern
#endif
#endif

#ifdef __cplusplus
extern "C" {
#endif

#include <math.h>
#include <stdlib.h>
#include <stdarg.h>
#include <stdbool.h>
#include <float.h>
#include <string.h>
#include <ctype.h>

#ifdef TARGET_ASM
#include <emscripten.h>
#else
#include <stdio.h>
#define EMSCRIPTEN_KEEPALIVE
#endif

#include "model.h"
#include "vensim.h"
#include "macros.h"
#include "fcmp.h"

// Float point comparisons
extern double _epsilon;
#define fz(x) (fcmp(x, 0.0, _epsilon) == 0)
#define feq(x1,x2) (fcmp(x1, x2, _epsilon) == 0)
#define flt(x1,x2) (fcmp(x1, x2, _epsilon) == -1)
#define fle(x1,x2) (fcmp(x1, x2, _epsilon) <= 0)
#define fgt(x1,x2) (fcmp(x1, x2, _epsilon) == 1)
#define fge(x1,x2) (fcmp(x1, x2, _epsilon) >= 0)

// Internal variables
EXTERN const int numOutputs;

// Standard simulation control parameters
EXTERN double _time;
EXTERN double _initial_time;
EXTERN double _final_time;
EXTERN double _time_step;
EXTERN double _saveper;

// API
void EMSCRIPTEN_KEEPALIVE init();
void EMSCRIPTEN_KEEPALIVE setInputs(const char* json);
void EMSCRIPTEN_KEEPALIVE run();
void EMSCRIPTEN_KEEPALIVE finish();

// Evaluation
void evalAux();
void evalLevels();

// Helpers
void storeOutputData();
void writeHeader();
void startOutput();
void outputVar(double value);
void writeOutputData();
void writeText(const char* text);

#ifdef __cplusplus
}
#endif
