#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#include "types.h"

//
// Helpers
//
#define _NA_ (-DBL_MAX)
#define bool_cond(cond) ((sde_float)(cond) != 0.0)

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


sde_float* _ALLOCATE_AVAILABLE(sde_float* requested_quantities, sde_float* priority_profiles, sde_float available_resource, size_t num_requesters);
sde_float _PULSE(sde_float start, sde_float width);
sde_float _PULSE_TRAIN(sde_float start, sde_float width, sde_float interval, sde_float end);
sde_float _RAMP(sde_float slope, sde_float start_time, sde_float end_time);
sde_float* _VECTOR_SORT_ORDER(sde_float* vector, size_t size, sde_float direction);
sde_float _XIDZ(sde_float a, sde_float b, sde_float x);
sde_float _ZIDZ(sde_float a, sde_float b);

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
  sde_float* active_data;
  // The size (i.e., number of pairs) of the active data.
  size_t active_size;

  // The pointer to the original data buffer.
  sde_float* original_data;
  // The size (i.e., number of pairs) of the original data.
  size_t original_size;
  // Whether the `original_data` is owned by this `Lookup` instance.  If `true`,
  // the `original_data` buffer will be freed by `__delete_lookup`.
  bool original_data_is_owned;

  // The pointer to the dynamic data buffer.  This will be NULL initially,
  // and the buffer will be allocated (or grown) by `__set_lookup`.
  sde_float* dynamic_data;
  // The size (i.e., number of pairs) of the dynamic data.
  size_t dynamic_size;
  // The number of elements in the dynamic data buffer.  The buffer will grow
  // as needed, so this can be greater than `2 * dynamic_size`.
  size_t dynamic_data_length;

  // The inverted version of the active data buffer.  This is allocated on demand
  // only in the case of `LOOKUP INVERT` function calls.
  sde_float* inverted_data;

  // The input value for the last hit.  This is cached for performance so that we
  // can reduce the amount of linear searching in the common case where `LOOKUP`
  // input values are monotonically increasing.
  sde_float last_input;
  // The index for the last hit (see `last_input`).
  size_t last_hit_index;
} Lookup;

Lookup* __new_lookup_by_reference(size_t size, sde_float* data);
Lookup* __new_lookup_by_copy(size_t size, double* data);
void __set_lookup(Lookup* lookup, size_t size, double* data);
void __delete_lookup(Lookup* lookup);
void __print_lookup(Lookup* lookup);

sde_float __lookup(Lookup *lookup, sde_float input, bool use_inverted_data, LookupMode mode);
#define _LOOKUP(lookup, x) __lookup(lookup, x, false, Interpolate)
#define _LOOKUP_FORWARD(lookup, x) __lookup(lookup, x, false, Forward)
#define _LOOKUP_BACKWARD(lookup, x) __lookup(lookup, x, false, Backward)
#define _WITH_LOOKUP(x, lookup) __lookup(lookup, x, false, Interpolate)
sde_float _LOOKUP_INVERT(Lookup* lookup, sde_float y);

sde_float __get_data_between_times(Lookup* lookup, sde_float input, LookupMode mode);
#define _GET_DATA_MODE_TO_LOOKUP_MODE(mode) ((mode) >= 1) ? Forward : (((mode) <= -1) ? Backward : Interpolate)
#define _GET_DATA_BETWEEN_TIMES(lookup, x, mode) __get_data_between_times(lookup, x, _GET_DATA_MODE_TO_LOOKUP_MODE(mode))

sde_float _GAME(Lookup* lookup, sde_float default_value);

//
// DELAY FIXED
//
typedef struct {
  sde_float* data;
  size_t n;
  size_t data_index;
  sde_float initial_value;
} FixedDelay;

sde_float _DELAY_FIXED(sde_float input, FixedDelay* fixed_delay);
FixedDelay* __new_fixed_delay(FixedDelay* fixed_delay, sde_float delay_time, sde_float initial_value);

//
// DEPRECIATE STRAIGHTLINE
//
typedef struct {
  sde_float* data;
  size_t n;
  size_t data_index;
  sde_float dtime;
  sde_float initial_value;
} Depreciation;

sde_float _DEPRECIATE_STRAIGHTLINE(sde_float input, Depreciation* depreciation);
Depreciation* __new_depreciation(Depreciation* depreciation, sde_float dtime, sde_float initial_value);

#ifdef __cplusplus
}
#endif
