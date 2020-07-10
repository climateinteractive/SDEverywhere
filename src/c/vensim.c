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
Lookup* __new_lookup(size_t size, ...) {
	// Make a new Lookup with "size" number of pairs given in x, y order in a flattened list.
	Lookup* lookup = malloc(sizeof(Lookup));
	lookup->data = malloc(sizeof(double) * 2 * size);
	lookup->n = size;
	lookup->inverted_data = NULL;
	// Copy arguments into the lookup data.
	va_list args;
	va_start(args, size);
	for (size_t i = 0; i < 2 * size; i++) {
		*(lookup->data + i) = va_arg(args, double);
	}
	va_end(args);
	return lookup;
}
void __delete_lookup(Lookup* lookup) {
	if (lookup) {
		if (lookup->data) {
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
double __lookup(double* data, size_t n, double input, LookupMode mode) {
  // Interpolate the y value from an array of (x,y) pairs.
  // BUG The x values are assumed to be monotonically increasing.
  double* last_x = NULL;
  double* last_y = NULL;
	for (size_t i = 0; i < n; i++) {
		double* x = data + 2 * i;
		double* y = x + 1;
    if (feq(*x, input)) {
      return *y;
		}
    if (fgt(*x, input)) {
      if (last_x == NULL) {
        // The input is less than the first x, so return the low end of the range.
        return *y;
      }
			// We went past the input, so return a value depending on the lookup mode.
			if (mode == Interpolate) {
	      // Interpolate along the line from the last (x,y).
	      double dx = *x - *last_x;
	      double dy = *y - *last_y;
	      return *last_y + (dy/dx) * (input - *last_x);
			}
			else if (mode == Forward) {
				// Return the next value without interpolating.
				// If we are on the last lookup point, return the current y value, otherwise go to the next one.
				if (i < n - 1) {
					x += 2;
					y = x + 1;
				}
				return *y;
			}
			else if (mode == Backward) {
				// Return the previous value without interpolating.
				return *last_y;
			}
    }
    last_x = x;
    last_y = y;
  }
  // The input is greater than all the x values, so return the high end of the range.
	return *(data + 2 * (n - 1) + 1);
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
  double result = __lookup(lookup->inverted_data, lookup->n, y, Interpolate);
	return result;
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
    d[i].ind = i;
  }
  sort_order = direction > 0.0 ? 1 : -1;
  qsort(d, size, sizeof(dbl_ind), __compare_dbl_ind);
  for (size_t i = 0; i < size; i++) {
    result[i] = d[i].ind;
  }
  return result;
}
