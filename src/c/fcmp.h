/*
 fcmp
 Copyright (c) 1998-2000 Theodore C. Belding
 University of Michigan Center for the Study of Complex Systems
 <mailto:Ted.Belding@umich.edu>
 <http://www-personal.umich.edu/~streak/>		

 This file is part of the fcmp distribution. fcmp is free software;
 you can redistribute and modify it under the terms of the GNU Library
 General Public License (LGPL), version 2 or later.  This software
 comes with absolutely no warranty. See the file COPYING for details
 and terms of copying.

 File: fcmp.h 

 Description:
 
 Knuth's floating point comparison operators, from:
 Knuth, D. E. (1998). The Art of Computer Programming.
 Volume 2: Seminumerical Algorithms. 3rd ed. Addison-Wesley.
 Section 4.2.2, p. 233. ISBN 0-201-89684-2.

 Input parameters:
 x1, x2: numbers to be compared
 epsilon: determines tolerance

 epsilon should be carefully chosen based on the machine's precision,
 the observed magnitude of error, the desired precision, and the
 magnitude of the numbers to be compared. See the fcmp README file for
 more information.

 This routine may be used for both single-precision (float) and
 double-precision (double) floating-point numbers.
 
 Returns:
 -1 if x1 < x2
  0 if x1 == x2
  1 if x1 > x2
*/

#ifndef fcmp_h
#define fcmp_h

#ifdef __cplusplus
extern "C" {
#endif

int fcmp(double x1, double x2, double epsilon);

#ifdef __cplusplus
}
#endif

#endif

