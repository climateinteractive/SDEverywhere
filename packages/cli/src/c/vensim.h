#pragma once

#ifdef __cplusplus
extern "C" {
#endif

//
// Helpers
//
#define _NA_ (-DBL_MAX)
#define bool_cond(cond) ((double)(cond) != 0.0)

//
// Vensim functions
// See the Vensim Reference Manual for descriptions of the functions.
// https://www.vensim.com/documentation/22300.html
//
#define _ABS(x) fabs(x)
#define _ARCCOS(x) acos(x)
#define _ARCSIN(x) asin(x)
#define _ARCTAN(x) atan(x)
#define _COS(x) cos(x)
#define _EXP(x) exp(x)
#define _GAMMA_LN(x) lgamma(x)
#define _IF_THEN_ELSE(c, t, f) (bool_cond(c) ? (t) : (f))
#define _INTEG(value, rate) ((value) + (rate) * _time_step)
#define _INTEGER(x) trunc(x)
#define _LN(x) log(x)
#define _MAX(a, b) fmax(a, b)
#define _MIN(a, b) fmin(a, b)
#define _MODULO(a, b) fmod(a, b)
#define _POWER(a, b) pow(a, b)
#define _QUANTUM(a, b) ((b) <= 0 ? (a) : (b) * trunc((a) / (b)))
#define _SAMPLE_IF_TRUE(current, condition, input) (bool_cond(condition) ? (input) : (current))
#define _SIN(x) sin(x)
#define _SQRT(x) sqrt(x)
#define _STEP(height, step_time) (_time + _time_step / 2.0 > (step_time) ? (height) : 0.0)
#define _TAN(x) tan(x)


double* _ALLOCATE_AVAILABLE(double* requested_quantities, double* priority_profiles, double available_resource, size_t num_requesters);
double _PULSE(double start, double width);
double _PULSE_TRAIN(double start, double width, double interval, double end);
double _RAMP(double slope, double start_time, double end_time);
double* _VECTOR_SORT_ORDER(double* vector, size_t size, double direction);
double _XIDZ(double a, double b, double x);
double _ZIDZ(double a, double b);

//
// Lookups
//
typedef enum {
  Interpolate, Forward, Backward
} LookupMode;

typedef struct {
  // The pointer to the active data buffer.  This will be the same as either
  // `original_data` or `dynamic_data`, depending on whether the lookup data
  // is overridden at runtime using `__set_lookup`.
  double* active_data;
  // The size (i.e., number of pairs) of the active data.
  size_t active_size;

  // The pointer to the original data buffer.
  double* original_data;
  // The size (i.e., number of pairs) of the original data.
  size_t original_size;
  // Whether the `original_data` is owned by this `Lookup` instance.  If `true`,
  // the `original_data` buffer will be freed by `__delete_lookup`.
  bool original_data_is_owned;

  // The pointer to the dynamic data buffer.  This will be NULL initially,
  // and the buffer will be allocated (or grown) by `__set_lookup`.
  double* dynamic_data;
  // The size (i.e., number of pairs) of the dynamic data.
  size_t dynamic_size;
  // The number of elements in the dynamic data buffer.  The buffer will grow
  // as needed, so this can be greater than `2 * dynamic_size`.
  size_t dynamic_data_length;

  // The inverted version of the active data buffer.  This is allocated on demand
  // only in the case of `LOOKUP INVERT` function calls.
  double* inverted_data;

  // The input value for the last hit.  This is cached for performance so that we
  // can reduce the amount of linear searching in the common case where `LOOKUP`
  // input values are monotonically increasing.
  double last_input;
  // The index for the last hit (see `last_input`).
  size_t last_hit_index;
} Lookup;

Lookup* __new_lookup(size_t size, bool copy, double* data);
void __set_lookup(Lookup* lookup, size_t size, double* data);
void __delete_lookup(Lookup* lookup);
void __print_lookup(Lookup* lookup);

double __lookup(Lookup *lookup, double input, bool use_inverted_data, LookupMode mode);
#define _LOOKUP(lookup, x) __lookup(lookup, x, false, Interpolate)
#define _LOOKUP_FORWARD(lookup, x) __lookup(lookup, x, false, Forward)
#define _LOOKUP_BACKWARD(lookup, x) __lookup(lookup, x, false, Backward)
#define _WITH_LOOKUP(x, lookup) __lookup(lookup, x, false, Interpolate)
double _LOOKUP_INVERT(Lookup* lookup, double y);

double __get_data_between_times(Lookup* lookup, double input, LookupMode mode);
#define _GET_DATA_MODE_TO_LOOKUP_MODE(mode) ((mode) >= 1) ? Forward : (((mode) <= -1) ? Backward : Interpolate)
#define _GET_DATA_BETWEEN_TIMES(lookup, x, mode) __get_data_between_times(lookup, x, _GET_DATA_MODE_TO_LOOKUP_MODE(mode))

double _GAME(Lookup* lookup, double default_value);

//
// DELAY FIXED
//
typedef struct {
  double* data;
  size_t n;
  size_t data_index;
  double initial_value;
} FixedDelay;

double _DELAY_FIXED(double input, FixedDelay* fixed_delay);
FixedDelay* __new_fixed_delay(FixedDelay* fixed_delay, double delay_time, double initial_value);

//
// DEPRECIATE STRAIGHTLINE
//
typedef struct {
  double* data;
  size_t n;
  size_t data_index;
  double dtime;
  double initial_value;
} Depreciation;

double _DEPRECIATE_STRAIGHTLINE(double input, Depreciation* depreciation);
Depreciation* __new_depreciation(Depreciation* depreciation, double dtime, double initial_value);

#ifdef __cplusplus
}
#endif
