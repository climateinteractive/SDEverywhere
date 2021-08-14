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
  for (double k = 0; fle(k, n); k++) {
    if (_PULSE(start + k * interval, width) && fle(_time, end)) {
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
	if (fgt(_time, start_time)) {
		if (flt(_time, end_time) || fgt(start_time, end_time)) {
			return slope * (_time - start_time);
		}
		else {
			return slope * (end_time - start_time);
		}
	}
	else {
		return 0.0;
	}
}
double _XIDZ(double a, double b, double x) {
	return fz(b) ? x : a / b;
}
double _ZIDZ(double a, double b) {
	if (fz(b)) {
		return 0.0;
	} else {
		return a / b;
	}
}

//
// Lookups
//
Lookup* __new_lookup(size_t size, bool copy, double *data) {
	// Make a new Lookup with "size" number of pairs given in x, y order in a flattened list.
	Lookup* lookup = malloc(sizeof(Lookup));
	lookup->n = size;
	lookup->inverted_data = NULL;
	lookup->data_is_owned = copy;
	if (copy) {
		// Copy array into the lookup data.
		lookup->data = malloc(sizeof(double) * 2 * size);
		for (size_t i = 0; i < 2 * size; i++) {
			memcpy(lookup->data, data, size * 2 * sizeof(double));
		}
	} else {
		// Store a pointer to the lookup data (assumed to be static or owned elsewhere).
		lookup->data = data;
	}
	lookup->last_input = DBL_MAX;
	lookup->last_hit_index = 0;
	return lookup;
}
void __delete_lookup(Lookup* lookup) {
	if (lookup) {
		if (lookup->data && lookup->data_is_owned) {
			free(lookup->data);
		}
		if (lookup->inverted_data) {
			free(lookup->inverted_data);
		}
		free(lookup);
	}
}
void __print_lookup(Lookup* lookup) {
	if (lookup) {
		for (size_t i = 0; i < lookup->n; i++) {
			printf("(%g, %g)\n", *(lookup->data + 2 * i), *(lookup->data + 2 * i + 1));
		}
	}
}

double __lookup(Lookup* lookup, double input, bool use_inverted_data, LookupMode mode) {
	// Interpolate the y value from an array of (x,y) pairs.
	// NOTE: The x values are assumed to be monotonically increasing.

	if (lookup == NULL) {
		return _NA_;
	}

	const double *data = use_inverted_data ? lookup->inverted_data : lookup->data;
	const size_t max = (lookup->n) * 2;

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

		if (fge(x, input)) {
			// We went past the input, or hit it exactly.
			if (use_cached_values) {
				lookup->last_input = input;
				lookup->last_hit_index = xi;
			}

			if (xi == 0 || feq(x, input)) {
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
double __get_data_between_times(double *data, size_t n, double input, LookupMode mode) {
  // Interpolate the y value from an array of (x,y) pairs.
  // NOTE: The x values are assumed to be monotonically increasing.
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
          fprintf(stderr, "WARNING: GET DATA BETWEEN TIMES was called with an input value (%f) that has a fractional part.\n", input);
          fprintf(stderr, "When mode is 0 (interpolate) and the input value is not a whole number, Vensim produces unexpected\n");
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
		lookup->inverted_data = malloc(sizeof(double) * 2 * lookup->n);
		double* pLookup = lookup->data;
		double* pInvert = lookup->inverted_data;
		for (size_t i = 0; i < lookup->n; i++) {
			*pInvert++ = *(pLookup+1);
			*pInvert++ = *pLookup;
			pLookup += 2;
		}
	}
	return __lookup(lookup, y, true, Interpolate);
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
  }
  else if (arg1->x > arg2->x) {
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
double normal(double x, double μ, double σ) {
  double base = 1.0 / (σ * sqrt(2.0 * M_PI));
  double exponent = -pow(x - μ, 2.0) / (2.0 * σ * σ);
  return base * exp(exponent);
}
double P(double x) {
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
  return 1 - normal(x, 0.0, 1.0) * y;
}
double cdfu(double x) {
  // Calculate the unit cumulative distribution function from x to +∞, often known as Q(x).
  return x >= 0.0 ? 1.0 - P(x) : P(-x);
}
double cdf(double x, double σ) { return cdfu(x / σ); }
// Access the doubly-subscripted priority profiles array by pointer.
enum { PTYPE, PPRIORITY, PWIDTH, PEXTRA };
double get_pp(double* pp, size_t iProfile, size_t iElement) {
  const int NUM_PP = PEXTRA - PTYPE + 1;
  return *(pp + iProfile * NUM_PP + iElement);
}
double* _ALLOCATE_AVAILABLE(size_t num_requesters, double* requested_quantities, double* priority_profiles,
    double resource_available, double* allocations) {
  // requested_quantities points to an array of length num_requesters
  // priority_profiles points to an array of num_requesters arrays of length 4
  // allocations points to an array of length num_requesters in which results are returned

  // The priority profiles give the mean and standard deviation of normal curves used to allocate
  // the available resource, with a higher mean indicating a higher priority. The search space for
  // allocations that match the available resource is the x axis with tails on both ends of the curves.
  const double normal_curve_tail = 5.0;
  // Limit the search to this number of steps.
  const size_t max_steps = 30;
  // Find the minimum and maximum means in the priority curves.
  double min_mean = DBL_MAX;
  double max_mean = DBL_MIN;
  for (size_t i = 0; i < num_requesters; i++) {
    min_mean = fmin(get_pp(priority_profiles, i, PPRIORITY), min_mean);
    max_mean = fmax(get_pp(priority_profiles, i, PPRIORITY), max_mean);
  }
  // Start the search in the midpoint of the means, with a big first jump.
  double total_allocations = 0.0;
  double x = (max_mean - min_mean) / 2.0;
  double delta = normal_curve_tail;
  size_t num_steps = 0;
  double last_delta_sign = 1.0;
  size_t num_jumps_in_same_direction = 0;
  do {
    // Calculate allocations for each requester.
    for (size_t i = 0; i < num_requesters; i++) {
      double mean = get_pp(priority_profiles, i, PPRIORITY);
      double sigma = get_pp(priority_profiles, i, PWIDTH);
      // The allocation is the area under the requester's normal curve from x out to +∞
      // scaled by the size of the request. We integrate over the right-hand side of the
      // normal curve so that higher means have higher priority, that is, are allocated more.
      // The unit cumulative distribution function integrates to one over all x,
      // so we simply multiply by a constant to scale the area under the curve.
      allocations[i] = requested_quantities[i] * cdf(x - mean, sigma);
    }
    // Sum the allocations for comparison with the available resource.
    total_allocations = 0.0;
    for (size_t i = 0; i < num_requesters; i++) {
      total_allocations += allocations[i];
    }
    if (++num_steps >= max_steps) {
      // TODO signal error
      break;
    }
    // Set up the next x value by computing a new delta that is usually half the size of the
    // previous delta, that is, do a binary search of the x axis. We may jump over the target
    // x value, so we may need to change direction.
    double delta_sign = total_allocations < resource_available ? -1.0 : 1.0;
    // Too many jumps in the same direction can result in the search converging on a point
    // that falls short of the target x value. Stop halving the delta when that happens until
    // we jump over the target again.
    num_jumps_in_same_direction = delta_sign == last_delta_sign ? num_jumps_in_same_direction + 1 : 0;
    last_delta_sign = delta_sign;
    delta = (delta_sign * fabs(delta)) / (num_jumps_in_same_direction < 3 ? 2.0 : 1.0);
    x += delta;
    // The search terminates when the total allocations are equal to the available resource
    // up to a very small epsilon difference.
  } while (fabs(total_allocations - resource_available) > _epsilon);
  // Return a pointer to the allocations array the caller passed with the results filled in.
  return allocations;
}
