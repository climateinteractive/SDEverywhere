#include "sde.h"

// ALLOCATE AVAILABLE distributes a resource among requesters using a priority
// profile for each requester. The curve type specifies a complementary
// cumulative distribution function. The shape of the distribution is given by
// the priority (indicating the midpoint) and the width (spread). The search
// space for allocations that match the available resource is the x axis. A
// greater priority pushes the midpoint of the distribution to the right,
// resulting in more area under the curve at a given x and a larger allocation
// for that requester.

// FIND MARKET PRICE balances supply and demand by finding a price that
// results in total allocations that are as close as possible to total supply.
// The price can then be applied in DEMAND AT PRICE and SUPPLY AT PRICE to
// determine individual allocations. Note that the priority curve for demand
// increases allocations with decreasing price, while the priority curve for
// supply increases allocations with increasing price. This is modeled with
// a complementary cumulative distribution function for demand and a
// cumulative distribution function for supply.

// The number of agents receiving allocations is limited by this buffer size.
#define ALLOCATIONS_BUFSIZE 80
// Define this to print debug info during the allocation process.
// #define PRINT_ALLOCATIONS_DEBUG_INFO

// Return true if the value is near zero up to the epsilon tolerance.
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
// Clamp x to the interval [0,1].
static inline double __clamp01(double x) {
  if (x < 0.0) return 0.0;
  if (x > 1.0) return 1.0;
  return x;
}
// Priority profiles are arrays of 4 elements.
enum { PTYPE, PPRIORITY, PWIDTH, PEXTRA };
// Priority curve types in profiles specify a cumulative distribution function.
enum { PTYPE_FIXED, PTYPE_RECTANGULAR, PTYPE_TRIANGULAR, PTYPE_NORMAL, PTYPE_EXPONENTIAL };
// Access the doubly-subscripted priority profiles array by pointer.
static inline double __get_pp(double* pp, size_t iProfile, size_t iElement) {
  const int NUM_PP = PEXTRA - PTYPE + 1;
  return *(pp + iProfile * NUM_PP + iElement);
}

// Normal distribution
static double __cdf_unit_normal(double x) {
  // Ref: Zelen & Severo (1964) in Handbook Of Mathematical Functions,
  // Abramowitz and Stegun, 26.2.17
  double p = 0.2316419;
  double b[5] = {0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429};
  double t = 1.0 / (1.0 + p * x);
  double y = 0.0;
  double k = t;
  for (size_t i = 0; i < 5; i++) {
    y += b[i] * k;
    k *= t;
  }
  static const double base = 0.39894228040143267794;  // 1/sqrt(2*pi)
  return 1.0 - (base * exp(-(x * x) / 2.0)) * y;
}
static double __cdf_normal(double x, double mu, double sigma) {
  if (x < mu) {
    return 1.0 - __cdf_unit_normal(-(x - mu) / sigma);
  } else {
    return __cdf_unit_normal((x - mu) / sigma);
  }
}
static double __cdf_normal_Q(double x, double mu, double sigma) { return 1.0 - __cdf_normal(x, mu, sigma); }
// Rectangular CDF on [0,1] ramping over [a,b]
static double __cdf_rectangular(double x, double priority, double width) {
  double a = priority - width / 2.0;
  double b = priority + width / 2.0;
  if (b <= a) return (x <= 0.0) ? 0.0 : 1.0;
  if (x <= a) return 0.0;
  if (x >= b) return 1.0;
  return __clamp01((x - a) / (b - a));
}
static double __cdf_rectangular_Q(double x, double priority, double width) {
  return 1.0 - __cdf_rectangular(x, priority, width);
}
// Triangular CDF extending from a to b
static double __cdf_triangular(double x, double priority, double width) {
  double a = priority - width / 2.0;
  double b = priority + width / 2.0;
  double xLeft = fmin(a, b);
  double xRight = fmax(a, b);
  double mode = (xLeft + xRight) / 2.0;
  if (x <= xLeft) return 0.0;
  if (x >= xRight) return 1.0;
  double c1 = (xRight - xLeft) * (mode - xLeft);
  double c2 = (xRight - xLeft) * (xRight - mode);
  if (x <= mode) return __clamp01(((x - xLeft) * (x - xLeft)) / c1);
  return __clamp01(1.0 - ((xRight - x) * (xRight - x)) / c2);
}
static double __cdf_triangular_Q(double x, double priority, double width) {
  return 1.0 - __cdf_triangular(x, priority, width);
}
// Exponential CDF using the Laplace distribution
static double __cdf_exponential(double x, double mu, double b) {
  if (x < mu) {
    return 0.5 * exp((x - mu) / b);
  } else {
    return 1.0 - 0.5 * exp(-(x - mu) / b);
  }
}
static double __cdf_exponential_Q(double x, double mu, double b) { return 1.0 - __cdf_exponential(x, mu, b); }

// Return the fraction of the quantity allocated at x for the given priority profile.
static double __allocate_by_priority(int ptype, double x, double priority, double width, bool is_demand) {
  switch (ptype) {
    case PTYPE_RECTANGULAR:
      return is_demand ? __cdf_rectangular_Q(x, priority, width) : __cdf_rectangular(x, priority, width);
    case PTYPE_TRIANGULAR:
      return is_demand ? __cdf_triangular_Q(x, priority, width) : __cdf_triangular(x, priority, width);
    case PTYPE_NORMAL:
      return is_demand ? __cdf_normal_Q(x, priority, width) : __cdf_normal(x, priority, width);
    case PTYPE_EXPONENTIAL:
      return is_demand ? __cdf_exponential_Q(x, priority, width) : __cdf_exponential(x, priority, width);
    default:
      fprintf(stderr, "Error: unknown priority type %d\n", ptype);
      return 0.0;
  }
}
// Compute allocations at the given price for either demanders or suppliers.
// The is_demand flag is true when allocating demand (using the complementary CDF).
// Set it false when allocating supply (using the CDF).
static double* __allocations_at_price(double* quantities, double* profiles, double price, size_t n, bool is_demand) {
  static double allocations[ALLOCATIONS_BUFSIZE];
  if (n > ALLOCATIONS_BUFSIZE) {
    fprintf(stderr, "Error: the number of allocation agents exceeds the maximum size of %d\n", ALLOCATIONS_BUFSIZE);
    return allocations;
  }
  int ptype = (int)__get_pp(profiles, 0, PTYPE);
  if (ptype == PTYPE_FIXED) {
    // For the fixed priority type, simply echo the quantities as allocations.
    for (size_t i = 0; i < n; i++) {
      allocations[i] = quantities[i];
    }
  } else {
    for (size_t i = 0; i < n; i++) {
      if (quantities[i] > 0.0) {
        ptype = (int)__get_pp(profiles, i, PTYPE);
        double priority = __get_pp(profiles, i, PPRIORITY);
        double width = __get_pp(profiles, i, PWIDTH);
        double fraction = __allocate_by_priority(ptype, price, priority, width, is_demand);
        allocations[i] = quantities[i] * fraction;
      } else {
        allocations[i] = 0.0;
      }
    }
  }
  return allocations;
}

// Allocate the available resource to the requesters using their priority profiles.
double* _ALLOCATE_AVAILABLE(
    double* requested_quantities, double* priority_profiles, double available_resource, size_t num_requesters) {
  // requested_quantities points to an array of length num_requesters.
  // priority_profiles points to an array of num_requesters arrays of length 4.
  static double allocations[ALLOCATIONS_BUFSIZE];
  if (num_requesters > ALLOCATIONS_BUFSIZE) {
    fprintf(
        stderr, "Error: _ALLOCATE_AVAILABLE num_requesters exceeds internal maximum size of %d\n", ALLOCATIONS_BUFSIZE);
    memset(allocations, 0, sizeof(allocations));
    return allocations;
  }
  if (available_resource <= 0.0) {
    memset(allocations, 0, sizeof(allocations));
    return allocations;
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
    fprintf(stderr, "[%2zu] requested_quantities=%17f  priority=%8g  width=%8g\n", i, requested_quantities[i],
        __get_pp(priority_profiles, i, PPRIORITY), __get_pp(priority_profiles, i, PWIDTH));
  }
#endif
  // Find the minimum and maximum means in the priority curves.
  double min_mean = DBL_MAX;
  double max_mean = -DBL_MAX;
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
        int ptype = (int)__get_pp(priority_profiles, i, PTYPE);
        if (ptype == PTYPE_FIXED || __isEqual(min_mean, max_mean)) {
          // The fixed priority type allocates proportionally to each request.
          // This is also the fallback allocation when all priorities are equal.
          if (total_requests > available_resource) {
            allocations[i] = (requested_quantities[i] / total_requests) * available_resource;
          } else {
            allocations[i] = requested_quantities[i];
          }
        } else {
          // Calculate the allocation using the specified priority curve.
          double priority = __get_pp(priority_profiles, i, PPRIORITY);
          double width = __get_pp(priority_profiles, i, PWIDTH);
          double fraction = __allocate_by_priority(ptype, x, priority, width, true);
          allocations[i] = requested_quantities[i] * fraction;
        }
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
// Find a market price that balances supply and demand.
double _FIND_MARKET_PRICE(double* demand_quantities, double* demand_profiles, double* supply_quantities,
    double* supply_profiles, size_t num_demanders, size_t num_suppliers) {
  // We assume that all demanders and suppliers use the same ptype.
  static double demand_allocations[ALLOCATIONS_BUFSIZE];
  static double supply_allocations[ALLOCATIONS_BUFSIZE];
  if (num_demanders > ALLOCATIONS_BUFSIZE) {
    fprintf(
        stderr, "Error: _FIND_MARKET_PRICE num_demanders exceeds internal maximum size of %d\n", ALLOCATIONS_BUFSIZE);
    return 0.0;
  }
  if (num_suppliers > ALLOCATIONS_BUFSIZE) {
    fprintf(stderr, "_FIND_MARKET_PRICE num_suppliers exceeds internal maximum size of %d\n", ALLOCATIONS_BUFSIZE);
    return 0.0;
  }
  double total_demand_allocations = 0.0;
  double total_supply_allocations = 0.0;
  // Set up the price search.
  const size_t max_steps = 100;
  double price = 0.0;
  double min_price = DBL_MAX;
  double max_price = DBL_MIN;
  for (size_t i = 0; i < num_demanders; i++) {
    min_price = fmin(__get_pp(demand_profiles, i, PPRIORITY), min_price);
    max_price = fmax(__get_pp(demand_profiles, i, PPRIORITY), max_price);
  }
  for (size_t i = 0; i < num_suppliers; i++) {
    min_price = fmin(__get_pp(supply_profiles, i, PPRIORITY), min_price);
    max_price = fmax(__get_pp(supply_profiles, i, PPRIORITY), max_price);
  }
  double x = (max_price + min_price) / 2.0;
  double delta = (max_price - min_price) / 2.0;
  size_t num_steps = 0;
  double last_delta_sign = 1.0;
  size_t num_jumps_in_same_direction = 0;
  // When a ptype is fixed, we need to set total allocations.
  int demand_ptype = (int)__get_pp(demand_profiles, 0, PTYPE);
  int supply_ptype = (int)__get_pp(supply_profiles, 0, PTYPE);
  if (demand_ptype == PTYPE_FIXED || supply_ptype == PTYPE_FIXED) {
    double total_demand = 0.0;
    for (size_t i = 0; i < num_demanders; i++) {
      total_demand += demand_quantities[i];
    }
    double total_supply = 0.0;
    for (size_t i = 0; i < num_suppliers; i++) {
      total_supply += supply_quantities[i];
    }
    // Clamp total allocations so we don't overallocate.
    if (demand_ptype == PTYPE_FIXED) {
      total_demand_allocations = fmin(total_demand, total_supply);
    }
    if (supply_ptype == PTYPE_FIXED) {
      total_supply_allocations = fmin(total_supply, total_demand);
    }
  }
  // Search for a price that matches demand with supply.
  do {
    if (demand_ptype != PTYPE_FIXED) {
      // Allocate demand at the current price.
      total_demand_allocations = 0.0;
      for (size_t i = 0; i < num_demanders; i++) {
        if (demand_quantities[i] > 0.0) {
          double priority = __get_pp(demand_profiles, i, PPRIORITY);
          double width = __get_pp(demand_profiles, i, PWIDTH);
          double fraction = __allocate_by_priority(demand_ptype, x, priority, width, true);
          demand_allocations[i] = demand_quantities[i] * fraction;
          total_demand_allocations += demand_allocations[i];
        } else {
          demand_allocations[i] = 0.0;
        }
      }
    }
    if (supply_ptype != PTYPE_FIXED) {
      // Allocate supply at the current price.
      total_supply_allocations = 0.0;
      for (size_t i = 0; i < num_suppliers; i++) {
        if (supply_quantities[i] > 0.0) {
          double priority = __get_pp(supply_profiles, i, PPRIORITY);
          double width = __get_pp(supply_profiles, i, PWIDTH);
          double fraction = __allocate_by_priority(supply_ptype, x, priority, width, false);
          supply_allocations[i] = supply_quantities[i] * fraction;
          total_supply_allocations += supply_allocations[i];
        } else {
          supply_allocations[i] = 0.0;
        }
      }
    }
    if (++num_steps >= max_steps) {
      fprintf(stderr,
          "_FIND_MARKET_PRICE failed to converge at time=%g with total_demand_allocations=%18f, "
          "total_supply_allocations=%18f\n",
          _time, total_demand_allocations, total_supply_allocations);
      break;
    }
    double delta_sign = total_demand_allocations < total_supply_allocations ? -1.0 : 1.0;
    num_jumps_in_same_direction = delta_sign == last_delta_sign ? num_jumps_in_same_direction + 1 : 0;
    last_delta_sign = delta_sign;
    delta = (delta_sign * fabs(delta)) / (num_jumps_in_same_direction < 3 ? 2.0 : 1.0);
    price = x;
    x += delta;
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
    fprintf(stderr,
        "price=%-+14g delta=%-+14g diff%%=%-14g total_demand_allocations=%-+14g "
        "total_supply_allocations=%-+14g\n",
        price, delta, __difference(total_demand_allocations, total_supply_allocations) * 100.0,
        total_demand_allocations, total_supply_allocations);
#endif
  } while (__difference(total_demand_allocations, total_supply_allocations) >= 2e-7);
#ifdef PRINT_ALLOCATIONS_DEBUG_INFO
  fprintf(stderr, "converged with diff%%=%g at time %g in %zu steps\n",
      __difference(total_demand_allocations, total_supply_allocations) * 100.0, _time, num_steps);
  fprintf(stderr, "total_demand_allocations=%f, total_supply_allocations=%f\n", total_demand_allocations,
      total_supply_allocations);
#endif
  return price;
}
// Allocate the total demand among demanders at the given price according to their demand profiles.
double* _DEMAND_AT_PRICE(double* demand_quantities, double* demand_profiles, double price, size_t num_demanders) {
  return __allocations_at_price(demand_quantities, demand_profiles, price, num_demanders, true);
}
// Allocate the total supply among suppliers at the given price according to their supply profiles.
double* _SUPPLY_AT_PRICE(double* supply_quantities, double* supply_profiles, double price, size_t num_suppliers) {
  return __allocations_at_price(supply_quantities, supply_profiles, price, num_suppliers, false);
}
