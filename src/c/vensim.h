#pragma once

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  double* data;
  size_t n;
  double* inverted_data;
  bool data_is_owned;
} Lookup;
Lookup* __new_lookup(size_t size, bool copy, double* data);
void __delete_lookup(Lookup* lookup);
void __print_lookup(Lookup* lookup);

double bool_cond(double cond);

#define _NA_ (-DBL_MAX)

double _ABS(double x);
double _COS(double x);
double _EXP(double x);
double _GAME(double x);
double _IF_THEN_ELSE(double condition, double true_value, double false_value);
double _INTEG(double value, double rate);
double _INTEGER(double x);
double _LN(double x);
double _LOOKUP_BACKWARD(Lookup* lookup, double x);
double _LOOKUP_INVERT(Lookup* lookup, double y);
double _LOOKUP(Lookup* lookup, double input);
double _LOOKUP_FORWARD(Lookup* lookup, double x);
double _MAX(double a, double b);
double _MIN(double a, double b);
double _MODULO(double a, double b);
double _PULSE(double start, double width);
double _PULSE_TRAIN(double start, double width, double interval, double end);
double _RAMP(double slope, double start_time, double end_time);
double _SAMPLE_IF_TRUE(double currentValue, double condition, double input);
double _SIN(double x);
double _SQRT(double x);
double _STEP(double height, double step_time);
double _WITH_LOOKUP(double x, Lookup* lookup);
double _XIDZ(double a, double b, double x);
double _ZIDZ(double a, double b);

double* _VECTOR_SORT_ORDER(double* vector, size_t size, double direction);
#ifdef __cplusplus
}
#endif
