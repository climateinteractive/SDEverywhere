#include <stdio.h>
#include <glib.h>
#include "sde.h"

double _time;
double _time_step;
double _initial_time;
double _final_time;

void test_COS() {
  g_assert(_COS(0.0) == 1.0);
}
void test_IF_THEN_ELSE() {
  g_assert(_IF_THEN_ELSE(1, 2, 3) == 2.0);
  g_assert(_IF_THEN_ELSE(0, 2, 3) == 3.0);
}
void test_INTEG() {
}
void test_INTEGER() {
  g_assert(_INTEGER(1.9) == 1.0);
  g_assert(_INTEGER(-1.1) == -2.0);
}
void test_LOOKUP_INVERT() {
}
void test_LOOKUP() {
}
void test_LOOKUP_FORWARD() {
}
void test_LOOKUP_BACKWARD() {
}
void test_MAX() {
  g_assert(_MAX(0.0, 1.0) == 1.0);
  g_assert(_MAX(1.0, -1.0) == 1.0);
}
void test_MIN() {
  g_assert(_MIN(0.0, 1.0) == 0.0);
  g_assert(_MIN(1.0, -1.0) == -1.0);
}
void test_PULSE() {
  _time = 0;
  _time_step = 1;
  _final_time = 10;
  while (fle(_time, _final_time)) {
    double x = _PULSE(4, 2);
    if (fge(_time, 4) && flt(_time, 6)) {
      g_assert(feq(x, 1.0));
    }
    else {
      g_assert(fz(x));
    }
    _time += _time_step;
  }
}
void test_RAMP() {
  _time = 0;
  _time_step = 1;
  _final_time = 30;
  while (fle(_time, _final_time)) {
    double x = _RAMP(1, 10, 25);
    if (fgt(_time, 10) && flt(_time, 25)) {
      g_assert(fgt(x, 0.0));
      g_assert(flt(x, 15.0));
    }
    else if (fge(_time, 25)) {
      g_assert(feq(x, 15.0));
    }
    else {
      g_assert(fz(x));
    }
    _time += _time_step;
  }
}
void test_SAMPLE_IF_TRUE() {
}
void test_SIN() {
  g_assert(_SIN(0.0) == 0.0);
}
void test_SMOOTH() {
}
void test_SMOOTHI() {
}
void test_STEP() {
  _time = 0;
  _time_step = 1;
  _final_time = 10;
  while (fle(_time, _final_time)) {
    double x = _STEP(1, 5);
    if (flt(_time, 5.0)) {
      g_assert(fz(x));
    }
    else {
      g_assert(feq(x, 1.0));
    }
    _time += _time_step;
  }
}
void test_SUM() {
}
void test_SUM2() {
}
void test_WITH_LOOKUP() {
}
void test_XIDZ() {
  g_assert(_XIDZ(3, 4, 1) == 0.75);
  g_assert(_XIDZ(3, 0, 1) == 1.0);
}
void test_ZIDZ() {
  g_assert(_ZIDZ(3, 4) == 0.75);
  g_assert(_ZIDZ(3, 0) == 0.0);
}
void test_EXP() {
  g_assert(_EXP(0.0) == 1.0);
  g_assert(feq(_EXP(1.0), 2.71828));
}
void test_LN() {
  g_assert(_LN(1.0) == 0.0);
}
void test_SQRT() {
  g_assert(_SQRT(9.0) == 3.0);
}
void test_DELAY3() {
}
void test_SMOOTH3() {
}
void test_VECTOR_ELM_MAP() {
}
void test_VECTOR_SELECT() {
}
void test_VECTOR_SORT_ORDER() {
}

int main(int argc, char** argv) {
  g_test_init(&argc, &argv, NULL);

  g_test_add_func("/vensim/test_COS", test_COS);
  g_test_add_func("/vensim/test_EXP", test_EXP);
  g_test_add_func("/vensim/test_IF_THEN_ELSE", test_IF_THEN_ELSE);
  g_test_add_func("/vensim/test_INTEGER", test_INTEGER);
  g_test_add_func("/vensim/test_LN", test_LN);
  g_test_add_func("/vensim/test_MAX", test_MAX);
  g_test_add_func("/vensim/test_MIN", test_MIN);
  g_test_add_func("/vensim/test_SIN", test_SIN);
  g_test_add_func("/vensim/test_SQRT", test_SQRT);
  g_test_add_func("/vensim/test_XIDZ", test_XIDZ);
  g_test_add_func("/vensim/test_ZIDZ", test_ZIDZ);

  g_test_add_func("/vensim/test_STEP", test_STEP);
  g_test_add_func("/vensim/test_PULSE", test_PULSE);
  g_test_add_func("/vensim/test_RAMP", test_RAMP);

  // g_test_add_func("/vensim/test_SMOOTH", test_SMOOTH);
  // g_test_add_func("/vensim/test_SMOOTHI", test_SMOOTHI);
  // g_test_add_func("/vensim/test_SMOOTH3", test_SMOOTH3);
  // g_test_add_func("/vensim/test_DELAY3", test_DELAY3);

  // g_test_add_func("/vensim/test_VECTOR_ELM_MAP", test_VECTOR_ELM_MAP);
  // g_test_add_func("/vensim/test_VECTOR_SELECT", test_VECTOR_SELECT);
  // g_test_add_func("/vensim/test_VECTOR_SORT_ORDER", test_VECTOR_SORT_ORDER);

  // g_test_add_func("/vensim/test_INTEG", test_INTEG);
  // g_test_add_func("/vensim/test_LOOKUP_BACKWARD", test_LOOKUP_BACKWARD);
  // g_test_add_func("/vensim/test_LOOKUP_INVERT", test_LOOKUP_INVERT);
  // g_test_add_func("/vensim/test_LOOKUP", test_LOOKUP);
  // g_test_add_func("/vensim/test_LOOKUP_FORWARD", test_LOOKUP_FORWARD);
  // g_test_add_func("/vensim/test_LOOKUP_BACKWARD", test_LOOKUP_BACKWARD);
  // g_test_add_func("/vensim/test_SAMPLE_IF_TRUE", test_SAMPLE_IF_TRUE);
  // g_test_add_func("/vensim/test_SUM", test_SUM);
  // g_test_add_func("/vensim/test_SUM2", test_SUM2);
  // g_test_add_func("/vensim/test_WITH_LOOKUP", test_WITH_LOOKUP);

  return g_test_run();
}
