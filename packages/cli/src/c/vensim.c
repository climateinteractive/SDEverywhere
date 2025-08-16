#include "sde.h"

extern double _time;
extern double _time_step;

double _epsilon = 1e-6;

//
// Vensim functions
// See the Vensim Reference Manual for descriptions of the functions.
// http://www.vensim.com/documentation/index.html?22300.htm
//
double _PULSE(double start, double width) {
  double time_plus = _time + _time_step / 2.0;
  if (width == 0.0) {
    width = _time_step;
  }
  return (time_plus > start && time_plus < start + width) ? 1.0 : 0.0;
}
double _PULSE_TRAIN(double start, double width, double interval, double end) {
  double n = floor((end - start) / interval);
  for (double k = 0; k <= n; k++) {
    if (_PULSE(start + k * interval, width) && _time <= end) {
      return 1.0;
    }
  }
  return 0.0;
}
double _RAMP(double slope, double start_time, double end_time) {
  // Return 0 until the start time is exceeded.
  // Interpolate from start time to end time.
  // Hold at the end time value.
  // Allow start time > end time.
  if (_time > start_time) {
    if (_time < end_time || start_time > end_time) {
      return slope * (_time - start_time);
    } else {
      return slope * (end_time - start_time);
    }
  } else {
    return 0.0;
  }
}
double _XIDZ(double a, double b, double x) { return fabs(b) < _epsilon ? x : a / b; }
double _ZIDZ(double a, double b) {
  if (fabs(b) < _epsilon) {
    return 0.0;
  } else {
    return a / b;
  }
}

//
// Lookups
//
Lookup* __new_lookup(size_t size, bool copy, double* data) {
  // Make a new Lookup with "size" number of pairs given in x, y order in a flattened list.
  Lookup* lookup = malloc(sizeof(Lookup));
  lookup->original_size = size;
  lookup->original_data_is_owned = copy;
  if (copy) {
    // Copy the given lookup data into an internally managed buffer.
    size_t data_length_in_bytes = size * 2 * sizeof(double);
    lookup->original_data = malloc(data_length_in_bytes);
    memcpy(lookup->original_data, data, data_length_in_bytes);
  } else {
    // Store a pointer to the lookup data (assumed to be static or owned elsewhere).
    lookup->original_data = data;
  }
  // Set the original data as "active".
  lookup->active_data = lookup->original_data;
  lookup->active_size = lookup->original_size;
  // Set `dynamic_data` to NULL initially; it will be allocated on demand if lookup
  // data is overridden at runtime using `__set_lookup`.
  lookup->dynamic_data = NULL;
  lookup->dynamic_data_length = 0;
  lookup->dynamic_size = 0;
  // Set `inverted_data` to NULL initially; it will be allocated on demand in case
  // of `LOOKUP INVERT` calls.
  lookup->inverted_data = NULL;
  // Set the cached "last" values to the initial values.
  lookup->last_input = DBL_MAX;
  lookup->last_hit_index = 0;
  return lookup;
}
void __set_lookup(Lookup* lookup, size_t size, double* data) {
  // Set new data for the given `Lookup`.  If `data` is NULL, the original data that was
  // supplied to the `__new_lookup` call will be restored as the "active" data.  Otherwise,
  // `data` will be copied to an internal data buffer, which will be the "active" data.
  // If `size` is greater than the size passed to previous calls, the internal data buffer
  // will be grown as needed.
  if (lookup == NULL) {
    return;
  }
  if (data != NULL) {
    // Allocate or grow the internal buffer as needed.
    size_t data_length_in_elems = size * 2;
    size_t data_length_in_bytes = data_length_in_elems * sizeof(double);
    if (data_length_in_elems > lookup->dynamic_data_length) {
      lookup->dynamic_data = malloc(data_length_in_bytes);
      lookup->dynamic_data_length = data_length_in_elems;
    }
    // Copy the given lookup data into the internally managed buffer.
    lookup->dynamic_size = size;
    if (data_length_in_bytes > 0) {
      memcpy(lookup->dynamic_data, data, data_length_in_bytes);
    }
    // Set the dynamic data as the "active" data.
    lookup->active_data = lookup->dynamic_data;
    lookup->active_size = lookup->dynamic_size;
  } else {
    // Restore the original data as the "active" data.
    lookup->active_data = lookup->original_data;
    lookup->active_size = lookup->original_size;
  }
  // Clear the cached inverted data, if needed.
  if (lookup->inverted_data) {
    free(lookup->inverted_data);
    lookup->inverted_data = NULL;
  }
  // Reset the cached "last" values to the initial values.
  lookup->last_input = DBL_MAX;
  lookup->last_hit_index = 0;
}
void __delete_lookup(Lookup* lookup) {
  if (lookup) {
    if (lookup->original_data && lookup->original_data_is_owned) {
      free(lookup->original_data);
    }
    if (lookup->dynamic_data) {
      free(lookup->dynamic_data);
    }
    if (lookup->inverted_data) {
      free(lookup->inverted_data);
    }
    free(lookup);
  }
}
void __print_lookup(Lookup* lookup) {
  if (lookup) {
    for (size_t i = 0; i < lookup->active_size; i++) {
      printf("(%g, %g)\n", *(lookup->active_data + 2 * i), *(lookup->active_data + 2 * i + 1));
    }
  }
}

double __lookup(Lookup* lookup, double input, bool use_inverted_data, LookupMode mode) {
  // Interpolate the y value from an array of (x,y) pairs.
  // NOTE: The x values are assumed to be monotonically increasing.

  if (lookup == NULL || lookup->active_size == 0) {
    return _NA_;
  }

  const double* data = use_inverted_data ? lookup->inverted_data : lookup->active_data;
  const size_t max = (lookup->active_size) * 2;

  // Use the cached values for improved lookup performance, except in the case
  // of `LOOKUP INVERT` (since it may not be accurate if calls flip back and forth
  // between inverted and non-inverted data).
  bool use_cached_values = !use_inverted_data;
  size_t start_index;
  if (use_cached_values && input >= lookup->last_input) {
    start_index = lookup->last_hit_index;
  } else {
    start_index = 0;
  }

  for (size_t xi = start_index; xi < max; xi += 2) {
    double x = data[xi];

    if (x >= input) {
      // We went past the input, or hit it exactly.
      if (use_cached_values) {
        lookup->last_input = input;
        lookup->last_hit_index = xi;
      }

      if (xi == 0 || x == input) {
        // The input is less than the first x, or this x equals the input; return the
        // associated y without interpolation.
        return data[xi + 1];
      }

      // Calculate the y value depending on the lookup mode.
      switch (mode) {
        default:
        case Interpolate: {
          // Interpolate along the line from the last (x,y).
          double last_x = data[xi - 2];
          double last_y = data[xi - 1];
          double y = data[xi + 1];
          double dx = x - last_x;
          double dy = y - last_y;
          return last_y + ((dy / dx) * (input - last_x));
        }
        case Forward: {
          // Return the next y value without interpolating.
          return data[xi + 1];
        }
        case Backward:
          // Return the previous y value without interpolating.
          return data[xi - 1];
      }
    }
  }

  // The input is greater than all the x values, so return the high end of the range.
  if (use_cached_values) {
    lookup->last_input = input;
    lookup->last_hit_index = max;
  }
  return data[max - 1];
}

// This function is similar to `__lookup` in concept, but Vensim produces results for
// the GET DATA BETWEEN TIMES function that differ in unexpected ways from normal lookup
// behavior, so we implement it as a separate function here.
double __get_data_between_times(Lookup* lookup, double input, LookupMode mode) {
  // Interpolate the y value from an array of (x,y) pairs.
  // NOTE: The x values are assumed to be monotonically increasing.

  if (lookup == NULL || lookup->active_size == 0) {
    return _NA_;
  }

  const double* data = lookup->active_data;
  const size_t n = lookup->active_size;
  const size_t max = n * 2;

  switch (mode) {
    case Forward: {
      // Vensim appears to round non-integral input values down to a whole number
      // when mode is 1 (look forward), so we will do the same
      input = floor(input);

      for (size_t xi = 0; xi < max; xi += 2) {
        double x = data[xi];
        if (x >= input) {
          return data[xi + 1];
        }
      }

      return data[max - 1];
    }

    case Backward: {
      // Vensim appears to round non-integral input values down to a whole number
      // when mode is -1 (hold backward), so we will do the same
      input = floor(input);

      for (size_t xi = 2; xi < max; xi += 2) {
        double x = data[xi];
        if (x >= input) {
          return data[xi - 1];
        }
      }

      if (max >= 4) {
        return data[max - 3];
      } else {
        return data[1];
      }
    }

    case Interpolate:
    default: {
      // NOTE: This function produces results that match Vensim output for GET DATA BETWEEN TIMES with a
      // mode of 0 (interpolate), but only when the input values are integral (whole numbers).  If the
      // input value is fractional, Vensim produces bizarre/unexpected interpolated values.
      // TODO: For now we print a warning, but ideally we would match the Vensim results exactly.
      static bool warned = false;
      if (input - floor(input) > 0) {
        if (!warned) {
          fprintf(stderr,
              "WARNING: GET DATA BETWEEN TIMES was called with an input value (%f) that has a fractional part.\n",
              input);
          fprintf(stderr,
              "When mode is 0 (interpolate) and the input value is not a whole number, Vensim produces unexpected\n");
          fprintf(stderr, "results that may differ from those produced by SDEverywhere.\n");
          warned = true;
        }
      }

      for (size_t xi = 2; xi < max; xi += 2) {
        double x = data[xi];
        if (x >= input) {
          double last_x = data[xi - 2];
          double last_y = data[xi - 1];
          double y = data[xi + 1];
          double dx = x - last_x;
          double dy = y - last_y;
          return last_y + ((dy / dx) * (input - last_x));
        }
      }

      return data[max - 1];
    }
  }
}

double _LOOKUP_INVERT(Lookup* lookup, double y) {
  if (lookup->inverted_data == NULL) {
    // Invert the matrix and cache it.
    lookup->inverted_data = malloc(sizeof(double) * 2 * lookup->active_size);
    double* pLookup = lookup->active_data;
    double* pInvert = lookup->inverted_data;
    for (size_t i = 0; i < lookup->active_size; i++) {
      *pInvert++ = *(pLookup + 1);
      *pInvert++ = *pLookup;
      pLookup += 2;
    }
  }
  return __lookup(lookup, y, true, Interpolate);
}

double _GAME(Lookup* lookup, double default_value) {
  if (lookup == NULL || lookup->active_size == 0) {
    // The lookup is NULL or empty, so return the default value
    return default_value;
  }

  double x0 = lookup->active_data[0];
  if (_time < x0) {
    // The current time is earlier than the first data point, so return the
    // default value
    return default_value;
  }

  // For all other cases, we can use `__lookup` with `Backward` mode
  return __lookup(lookup, _time, false, Backward);
}

typedef struct {
  double x;
  int ind;
} dbl_ind;

#define DBL_IND_BUFSIZE 16

int sort_order = 1;

int __compare_dbl_ind(const void* a, const void* b) {
  dbl_ind* arg1 = (dbl_ind*)a;
  dbl_ind* arg2 = (dbl_ind*)b;
  int result = 0;
  if (arg1->x < arg2->x) {
    result = -1;
  } else if (arg1->x > arg2->x) {
    result = 1;
  }
  return sort_order * result;
}
double* _VECTOR_SORT_ORDER(double* vector, size_t size, double direction) {
  static dbl_ind d[DBL_IND_BUFSIZE];
  static double result[DBL_IND_BUFSIZE];
  if (size > DBL_IND_BUFSIZE) {
    // TODO signal error
    return NULL;
  }
  for (size_t i = 0; i < size; i++) {
    d[i].x = vector[i];
    d[i].ind = (int)i;
  }
  sort_order = direction > 0.0 ? 1 : -1;
  qsort(d, size, sizeof(dbl_ind), __compare_dbl_ind);
  for (size_t i = 0; i < size; i++) {
    result[i] = d[i].ind;
  }
  return result;
}

//
// ALLOCATE AVAILABLE
//
// Mathematical functions for calculating the normal pdf and cdf at a point x
double __pdf_normal(double x, double mu, double sigma) {
  double base = 1.0 / (sigma * sqrt(2.0 * M_PI));
  double exponent = -pow(x - mu, 2.0) / (2.0 * sigma * sigma);
  return base * exp(exponent);
}
double __cdf_unit_normal_P(double x) {
  // Zelen & Severo (1964) in Handbook Of Mathematical Functions, Abramowitz and Stegun, 26.2.17
  double p = 0.2316419;
  double b[5] = {0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429};
  double t = 1.0 / (1.0 + p * x);
  double y = 0.0;
  double k = t;
  for (size_t i = 0; i < 5; i++) {
    y += b[i] * k;
    k *= t;
  }
  return 1.0 - __pdf_normal(x, 0.0, 1.0) * y;
}
double __cdf_unit_normal_Q(double x) {
  // Calculate the unit cumulative distribution function from x to +∞, often known as Q(x).
  return x >= 0.0 ? 1.0 - __cdf_unit_normal_P(x) : __cdf_unit_normal_P(-x);
}
double __cdf_normal_Q(double x, double sigma) { return __cdf_unit_normal_Q(x / sigma); }
// Access the doubly-subscripted priority profiles array by pointer.
enum { PTYPE, PPRIORITY, PWIDTH, PEXTRA };
double __get_pp(double* pp, size_t iProfile, size_t iElement) {
  const int NUM_PP = PEXTRA - PTYPE + 1;
  return *(pp + iProfile * NUM_PP + iElement);
}
#define ALLOCATIONS_BUFSIZE 60
// #define PRINT_ALLOCATIONS_DEBUG_INFO
double* _ALLOCATE_AVAILABLE(
    double* requested_quantities, double* priority_profiles, double available_resource, size_t num_requesters) {
  // requested_quantities points to an array of length num_requesters.
  // priority_profiles points to an array of num_requesters arrays of length 4.
  // The priority profiles give the mean and standard deviation of normal curves used to allocate
  // the available resource, with a higher mean indicating a higher priority. The search space for
  // allocations that match the available resource is the x axis with tails on both ends of the curves.
  static double allocations[ALLOCATIONS_BUFSIZE];
  if (num_requesters > ALLOCATIONS_BUFSIZE) {
    fprintf(stderr, "_ALLOCATE_AVAILABLE num_requesters exceeds internal maximum size of %d\n", ALLOCATIONS_BUFSIZE);
    return NULL;
  }
  // Limit the search to this number of steps.
  const size_t max_steps = 100;
  // If the available resource is more than the total requests, clamp to the total requests so we don't overallocate.
  double total_requests = 0.0;
  for (size_t i = 0; i < num_requesters; i++) {
    total_requests += requested_quantities[i];
  }
  available_resource = fmin(available_resource, total_requests);
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
  fprintf(stderr, "\n_ALLOCATE_AVAILABLE time=%g num_requesters=%zu, available_resource=%f, total_requests=%f\n", _time,
      num_requesters, available_resource, total_requests);
  for (size_t i = 0; i < num_requesters; i++) {
    fprintf(stderr, "[%2zu] requested_quantities=%17f  mean=%8g  sigma=%8g\n", i, requested_quantities[i],
        __get_pp(priority_profiles, i, PPRIORITY), __get_pp(priority_profiles, i, PWIDTH));
  }
#endif
  // Find the minimum and maximum means in the priority curves.
  double min_mean = DBL_MAX;
  double max_mean = DBL_MIN;
  for (size_t i = 0; i < num_requesters; i++) {
    min_mean = fmin(__get_pp(priority_profiles, i, PPRIORITY), min_mean);
    max_mean = fmax(__get_pp(priority_profiles, i, PPRIORITY), max_mean);
  }
  // Start the search in the midpoint of the means, with a big first jump scaled to the spread of the means.
  double total_allocations = 0.0;
  double x = (max_mean + min_mean) / 2.0;
  double delta = (max_mean - min_mean) / 2.0;
  size_t num_steps = 0;
  double last_delta_sign = 1.0;
  size_t num_jumps_in_same_direction = 0;
  do {
    // Calculate allocations for each requester.
    for (size_t i = 0; i < num_requesters; i++) {
      if (requested_quantities[i] > 0.0) {
        double mean = __get_pp(priority_profiles, i, PPRIORITY);
        double sigma = __get_pp(priority_profiles, i, PWIDTH);
        // The allocation is the area under the requester's normal curve from x out to +∞
        // scaled by the size of the request. We integrate over the right-hand side of the
        // normal curve so that higher means have higher priority, that is, are allocated more.
        // The unit cumulative distribution function integrates to one over all x,
        // so we simply multiply by a constant to scale the area under the curve.
        allocations[i] = requested_quantities[i] * __cdf_normal_Q(x - mean, sigma);
      } else {
        allocations[i] = 0.0;
      }
    }
    // Sum the allocations for comparison with the available resource.
    total_allocations = 0.0;
    for (size_t i = 0; i < num_requesters; i++) {
      total_allocations += allocations[i];
    }
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
    fprintf(stderr, "x=%-+14g delta=%-+14g Δ=%-+14g total_allocations=%-+14g available_resource=%-+14g\n", x, delta,
        fabs(total_allocations - available_resource), total_allocations, available_resource);
#endif
    if (++num_steps >= max_steps) {
      fprintf(stderr,
          "_ALLOCATE_AVAILABLE failed to converge at time=%g with total_allocations=%18f, available_resource=%18f\n",
          _time, total_allocations, available_resource);
      break;
    }
    // Set up the next x value by computing a new delta that is usually half the size of the
    // previous delta, that is, do a binary search of the x axis. We may jump over the target
    // x value, so we may need to change direction.
    double delta_sign = total_allocations < available_resource ? -1.0 : 1.0;
    // Too many jumps in the same direction can result in the search converging on a point
    // that falls short of the target x value. Stop halving the delta when that happens until
    // we jump over the target again.
    num_jumps_in_same_direction = delta_sign == last_delta_sign ? num_jumps_in_same_direction + 1 : 0;
    last_delta_sign = delta_sign;
    delta = (delta_sign * fabs(delta)) / (num_jumps_in_same_direction < 3 ? 2.0 : 1.0);
    x += delta;
    // The search terminates when the total allocations are equal to the available resource
    // up to a very small epsilon difference.
  } while (fabs(total_allocations - available_resource) > _epsilon);
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
  fprintf(stderr, "converged with Δ=%g in %zu steps\n", fabs(total_allocations - available_resource), num_steps);
  fprintf(stderr, "total_allocations=%f, available_resource=%f\n", total_allocations, available_resource);
  for (size_t i = 0; i < num_requesters; i++) {
    fprintf(stderr, "[%2zu] %f\n", i, allocations[i]);
  }
#endif
  // Return a pointer to the allocations array the caller passed with the results filled in.
  return allocations;
}

//
// DELAY FIXED
//
FixedDelay* __new_fixed_delay(FixedDelay* fixed_delay, double delay_time, double initial_value) {
  // Construct a FixedDelay struct with a ring buffer for the delay line.
  // We don't know the size until runtime, so it must be dynamically allocated.
  // The delay time is quantized to an integral number of time steps.
  // The FixedDelay should be constructed at init time to latch the delay time and initial value.
  // Allocate memory on the first call only. Pass the same pointer back in on subsequent runs.
  size_t n = (size_t)ceil(delay_time / _time_step);
  size_t bufsize = n * sizeof(double);
  if (fixed_delay == NULL) {
    // Create the FixedDelay object and allocate its data buffer.
    fixed_delay = malloc(sizeof(FixedDelay));
    fixed_delay->data = malloc(bufsize);
  } else if (fixed_delay->n != n) {
    // The delay time has changed since a previous run. Reallocate the data buffer.
    free(fixed_delay->data);
    fixed_delay->data = malloc(bufsize);
  }
  // Reset state at the start of each run.
  fixed_delay->n = n;
  fixed_delay->data_index = 0;
  fixed_delay->initial_value = initial_value;
  return fixed_delay;
}
double _DELAY_FIXED(double input, FixedDelay* fixed_delay) {
  // Cache input values in a ring buffer for the number of time steps equal to the delay time.
  // Return the init value until the time reaches the delay time.
  double result;
  // Require the buffer size to be positive to protect from buffer overflows.
  if (fixed_delay->n > 0) {
    fixed_delay->data[fixed_delay->data_index] = input;
    // Because DELAY FIXED is a level, get the value one time step ahead in the buffer.
    fixed_delay->data_index = (fixed_delay->data_index + 1) % fixed_delay->n;
    // Start pulling from the ring buffer when the next time step will reach the delay time.
    if (_time < _initial_time + (fixed_delay->n - 1) * _time_step - 1e-6) {
      result = fixed_delay->initial_value;
    } else {
      result = fixed_delay->data[fixed_delay->data_index];
    }
  } else {
    // For a zero delay, take the value directly from the input.
    result = input;
  }
  return result;
}

//
// DEPRECIATE STRAIGHTLINE
//
Depreciation* __new_depreciation(Depreciation* depreciation, double dtime, double initial_value) {
  // Construct a Depreciation struct with a ring buffer for the time steps in the depreciation time.
  // We don't know the size until runtime, so it must be dynamically allocated.
  // The depreciation time is quantized to an integral number of time steps.
  // The Depreciation should be constructed at init time to latch the depreciation time and initial value.
  // Allocate memory on the first call only. Pass the same pointer back in on subsequent runs.
  size_t n = (size_t)ceil(dtime / _time_step);
  size_t bufsize = n * sizeof(double);
  if (depreciation == NULL) {
    // Create the Depreciation object and allocate its data buffer.
    depreciation = malloc(sizeof(Depreciation));
    depreciation->data = malloc(bufsize);
  } else if (depreciation->n != n) {
    // The depreciation time has changed since a previous run. Reallocate the data buffer.
    free(depreciation->data);
    depreciation->data = malloc(bufsize);
  }
  // Reset state at the start of each run.
  memset(depreciation->data, 0, bufsize);
  depreciation->n = n;
  depreciation->data_index = 0;
  depreciation->dtime = dtime;
  depreciation->initial_value = initial_value;
  return depreciation;
}
double _DEPRECIATE_STRAIGHTLINE(double input, Depreciation* depreciation) {
  // Distribute the input at this time step over the depreciation time in a ring buffer.
  // Return the depreciation amout at the current time.
  double result;
  // Require the buffer size to be positive to protect from buffer overflows.
  if (depreciation->n > 0) {
    // Distribute input from the stream over the depreciation time.
    double distribution = input / depreciation->dtime;
    for (size_t i = 0; i < depreciation->n; i++) {
      size_t pos = (depreciation->data_index + i) % depreciation->n;
      depreciation->data[pos] += distribution;
    }
    result = depreciation->data[depreciation->data_index];
    // Move to the next time step by pushing zero and shifting.
    depreciation->data[depreciation->data_index] = 0;
    depreciation->data_index = (depreciation->data_index + 1) % depreciation->n;
  } else {
    // For a zero deprecitation time, take the value directly from the input.
    result = input;
  }
  return result;
}
