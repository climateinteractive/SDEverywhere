#pragma once

#ifdef __cplusplus
extern "C" {
#endif

const char* run_model(const char* inputs);
double roundToSignificantFigures(double num, int n);
double print6(double num);

#ifdef __cplusplus
}
#endif
