#include "sde.h"

// ALLOCATE AVAILABLE distributes a resource among requesters using a priority
// profile for each requester. The priority profile specifies a complementary
// cumulative distribution function based on the normal distribution. The shape
// of the distribution is given by the priority (indicating the midpoint) and
// the width (spread). The search space for allocations that match the
// available resource is the x axis. A greater priority pushes the midpoint of
// the distribution to the right, resulting in more area under the curve at a
// given x and a larger allocation for that requester.

// Return true if the value is near zero.
static inline bool __isZero(double value) { return fabs(value) < _epsilon; }
// Compute the absolute difference when x or y is near zero, otherwise compute
// the relative difference, with y considered as the baseline.
static inline double __difference(double x, double y) {
  double diff = 0.0;
  if (__isZero(x) || __isZero(y)) {
    diff = fabs(x - y);
  } else {
    diff = fabs(1.0 - x / y);
  }
  return diff;
}
// Return true if the values are equal up to the tolerance.
static inline bool __isEqual(double x, double y) { return __difference(x, y) < _epsilon; }

// Normal distribution
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
#define ALLOCATIONS_BUFSIZE 80
// #define PRINT_ALLOCATIONS_DEBUG_INFO
double* _ALLOCATE_AVAILABLE(
    double* requested_quantities, double* priority_profiles, double available_resource, size_t num_requesters) {
  // requested_quantities points to an array of length num_requesters.
  // priority_profiles points to an array of num_requesters arrays of length 4.
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
  // Start the search in the midpoint of the means, with a big first jump scaled
  // to the spread of the means.
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
    fprintf(stderr,
        "x=%-+14g delta=%-+14g diff=%-14g%% total_allocations=%-+14g "
        "available_resource=%-+14g\n",
        x, delta, __difference(total_allocations, available_resource) * 100.0, total_allocations, available_resource);
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
    // The search terminates when the total allocations are equal to the
    // available resource up to the built-in tolerance.
  } while (!__isEqual(total_allocations, available_resource));
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
  fprintf(stderr, "converged with diff=%g%% in %zu steps\n",
      __difference(total_allocations, available_resource) * 100.0, num_steps);
  fprintf(stderr, "total_allocations=%f, available_resource=%f\n", total_allocations, available_resource);
  for (size_t i = 0; i < num_requesters; i++) {
    fprintf(stderr, "[%2zu] %f\n", i, allocations[i]);
  }
#endif
  // Return a pointer to the allocations array the caller passed with the results filled in.
  return allocations;
}

//
// Helper methods for allocate by priority
//
double __sum(double* arr, size_t n) {
  double total = 0.0;
  for (size_t i = 0; i < n; i++) {
    total += arr[i];
  }
  return total;
}

// 
// ALLOCATE BY PRIORITY
//
#define ALLOCATE_BY_PRIORITY_BUFSIZE 60
// #define PRINT_ALLOCATIONS_DEBUG_INFO

double* _ALLOCATE_BY_PRIORITY(
  double* request_quantities, double* priority_values, double size, double width, double supply, size_t num_requesters) {

  // request points to an array of length num_requesters.
  // priority points to an array of length num_requesters.
  // size is the number of elements across which allocation is being made.
  // width specifies how big a gap in priority is required to have the allocation go first to 
  //    higher priority with only leftovers going to lower priority. 
  // supply is the total supply available to fulfill all requests.

  // Allocate by priority allocates supply to requesters based on order of priority. The way in 
  // which the rationing works is determined by the relative priorities and the width parameter.

  static double allocations[ALLOCATE_BY_PRIORITY_BUFSIZE];
  if (num_requesters > ALLOCATE_BY_PRIORITY_BUFSIZE) {
    fprintf(stderr, "_ALLOCATE_BY_PRIORITY num_requesters exceeds internal maximum size of %d\n", ALLOCATE_BY_PRIORITY_BUFSIZE);
    return NULL;
  }

  // Validate request values (must be non-negative)
  for (size_t i = 0; i < num_requesters; i++) {
    if (request_quantities[i] < -_epsilon) {
      fprintf(stderr,
          "_ALLOCATE_BY_PRIORITY encountered negative request value at index %zu: %f\n",
          i, request_quantities[i]);
      return NULL;
    }
  }

  // Validate width (must not be negative)
  if (width < -_epsilon) {
    fprintf(stderr,
        "_ALLOCATE_BY_PRIORITY encountered invalid width value: %f\n"
        "Width must not be negative.\n",
        width);
    return NULL;
  }

  // Validate supply (must not be negative)
  if (supply < -_epsilon) {
    fprintf(stderr,
        "_ALLOCATE_BY_PRIORITY encountered invalid supply value: %f\n"
        "Supply must not be negative.\n",
        supply);
    return NULL;
  }

  // If supply > sum(request), return request
  if (supply > __sum(request_quantities, num_requesters)) {
    return request_quantities;
  }

  // If supply = 0, all targets get allocated 0
  if(fabs(supply) < _epsilon) {
    return allocations;
  }

  static double out_return[ALLOCATE_BY_PRIORITY_BUFSIZE];

  // Remove request 0 targets and order by priority
  bool is_0[ALLOCATE_BY_PRIORITY_BUFSIZE];
  size_t idx[ALLOCATE_BY_PRIORITY_BUFSIZE];
  size_t m = 0;

  for (size_t i = 0; i < num_requesters; i++) {
    is_0[i] = request_quantities[i] == 0.0;
    if (!is_0[i]) {
      idx[m++] = i;
    }
  }

  // Sort indices in `idx` by descending `priority_values` (highest priority first)
  for (size_t i = 0; i < m; i++) {
    for (size_t j = i + 1; j < m; j++) {
      if (priority_values[idx[j]] > priority_values[idx[i]]) {
        size_t tmp = idx[i];
        idx[i] = idx[j];
        idx[j] = tmp;
      }
    }
  }

  // Populate local arrays with request and priority values reordered according to idx
  double request[ALLOCATE_BY_PRIORITY_BUFSIZE];
  double priority[ALLOCATE_BY_PRIORITY_BUFSIZE];

  for (size_t i = 0; i < m; i++) {
    request[i] = (double)request_quantities[idx[i]];
    priority[i] = priority_values[idx[i]];
  }

  // Create the outputs array
  for (size_t i = 0; i < num_requesters; i++) {
    out_return[i] = 0.0;
  }

  double out[ALLOCATE_BY_PRIORITY_BUFSIZE] = {0.0};

  // Compute the distances between target supply and next target start
  double distances[ALLOCATE_BY_PRIORITY_BUFSIZE];

  for (size_t i = 0; i < m; i++) {
    distances[i] = NAN;
  }

  // Last target will have NaN as distances as there are no more targets after
  for (size_t i = 0; i + 1 < m; i++) {
    double d = -(priority[i + 1] - priority[i]) / width;
    if (d > 1.0) d = 1.0;
    distances[i] = d * request[i];
  }

  // Index of the current activated target
  bool active[ALLOCATE_BY_PRIORITY_BUFSIZE] = {false};
  active[0] = true;

  // Index of the last activated target
  size_t c_i = 0;

  // Continue allocating until supply is exhausted
  while (supply > _epsilon) {
    // Check if there are any active targets left
    bool any_active = false;
    for (size_t i = 0; i < m; i++) {
      if (active[i]) {
        any_active = true;
        break;
      }
    }
    if (!any_active) {
      break;
    }

    // Compute proportional allocation weights ("slopes") for active targets
    double slopes[ALLOCATE_BY_PRIORITY_BUFSIZE];
    double slope_sum = 0.0;

    for (size_t i = 0; i < m; i++) {
      if (active[i]) {
        slopes[i] = request[i]; // weight based on requested amount
        slope_sum += slopes[i];
      } else {
        slopes[i] = 0.0;
      }
    }

    // Normalize slopes so total allocation proportion sums to 1
    for (size_t i = 0; i < m; i++) {
      slopes[i] /= slope_sum;
    }

    // Compute how much supply much be given to any target reach its request
    double dx_next_top = NAN;

    for (size_t i = 0; i < m; i++) {
      if (active[i]) {
        double val = (request[i] - out[i]) / slopes[i];
        if (isnan(dx_next_top) || val < dx_next_top) {
          dx_next_top = val;
        }
      }
    }

    // Compute how much supply is needed to activate the next target
    // (last target will return nan)
    double dx_next_start = (distances[c_i] - out[c_i]) / slopes[c_i];

    // Determine next allocation step size:
    // smallest of (next completion, next activation, remaining supply)
    double dx = dx_next_top;

    if (!isnan(dx_next_start) && dx_next_start < dx) {
      dx = dx_next_start;
    }
    if (supply < dx) {
      dx = supply;
    }

    // Distribute this increment of supply across active targets
    for (size_t i = 0; i < m; i++) {
      out[i] += slopes[i] * dx;
    }

    // If we reached the threshold to activate the next target
    if (fabs(dx - dx_next_start) <= (1e-10 * fabs(dx_next_start) + 1e-16)) {
      // A new target will start in the next loop
      c_i++;

      // Active the next targetif its request is different than 0
      if (c_i < m) active[c_i] = true;
    }

    // If any targets have reached their requested amount, deactivate them
    if (dx == dx_next_top) {
      for (size_t i = 0; i < m; i++) {
        if (fabs(out[i] - request[i]) <= 1e-12) {
          active[i] = false;
        }
      }
    }

    // Reduce remaining supply
    supply -= dx;
  }

  // Return the distributed supply in the original order
  // adding to it again the request 0 if the where removed
  for (size_t i = 0; i < m; i++) {
    out_return[idx[i]] = out[i];
  }

  return out_return;
}
