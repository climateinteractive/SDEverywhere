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
#include <stdio.h>

#include "types.h"
#include "model.h"
#include "vensim.h"
#include "macros.h"

EXTERN sde_float _epsilon;

// Enable this to add print statements in initLevels and evalAux for debugging.
// #define PRDBG
#ifdef PRDBG
#define PRINIT(v) printf("initLevels: " #v " = %g\n", (v));
#define PRAUX(v, t) if (_time == t) { printf("evalAux: " #v " = %g\n", (v)); }
#else
#define PRINIT(v)
#define PRAUX(v, t)
#endif

// Each number in the output can take up to 13 characters plus a separator character.
#define OUTPUT_STRING_LEN 14

// Internal variables
EXTERN const int numOutputs;

// Standard simulation control parameters
EXTERN sde_float _time;
EXTERN sde_float _initial_time;
EXTERN sde_float _final_time;
EXTERN sde_float _time_step;
EXTERN sde_float _saveper;

// API (defined in model.c)
double getInitialTime(void);
double getFinalTime(void);
double getSaveper(void);
char* run_model(const char* inputs);
void runModelWithBuffers(double* inputs, double* outputs, int32_t* outputIndices);
void run(void);
void startOutput(void);
void outputVar(sde_float value);
void finish(void);

// Functions implemented by the generated model
void initConstants(void);
void initLevels(void);
void setInputs(const char* inputData);
void setInputsFromBuffer(double *inputData);
void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints);
void evalAux(void);
void evalLevels(void);
void storeOutputData(void);
void storeOutput(size_t varIndex, size_t* subIndices);
const char* getHeader(void);

#ifdef __cplusplus
}
#endif
