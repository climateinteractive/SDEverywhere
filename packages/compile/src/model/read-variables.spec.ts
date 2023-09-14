// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { canonicalName, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'
import { default as VariableImpl } from './variable'

import { parseVensimModel, sampleModelDir, type Variable } from './_tests/test-support'

/**
 * This is a shorthand for the following steps to read variables:
 *   - parseVensimModel
 *   - readSubscriptRanges
 *   - resolveSubscriptRanges
 *   - readVariables
 */
function readSubscriptsAndVariables(modelName: string): Variable[] {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseVensimModel(modelName)
  const modelDir = sampleModelDir(modelName)
  Model.read(parsedModel, /*spec=*/ {}, /*extData=*/ undefined, /*directData=*/ undefined, modelDir, {
    stopAfterReadVariables: true
  })

  // XXX: Strip out the ANTLR eqnCtx to avoid vitest hang when comparing
  return Model.variables.map(v => {
    delete v.eqnCtx
    return v
  })
}

function v(lhs: string, formula: string, overrides?: Partial<Variable>): Variable {
  const variable = new VariableImpl(undefined)
  // XXX: Strip out the ANTLR eqnCtx to avoid vitest hang when comparing
  delete variable.eqnCtx
  variable.modelLHS = lhs
  variable.modelFormula = formula
  variable.varName = canonicalName(lhs.split('[')[0])
  variable.varType = 'aux'
  variable.hasInitValue = false
  variable.includeInOutput = true
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      const r = variable as Record<string, any>
      r[key] = value
    }
  }
  return variable as Variable
}

describe('readVariables', () => {
  it('should work for Vensim "active_initial" model', () => {
    const vars = readSubscriptsAndVariables('active_initial')
    expect(vars).toEqual([
      v('Capacity', 'INTEG(Capacity Adjustment Rate,Target Capacity)'),
      v('Capacity Adjustment Rate', '(Target Capacity-Capacity)/Capacity Adjustment Time'),
      v('Capacity Adjustment Time', '10'),
      v('Capacity Utilization', 'Production/Capacity'),
      v('FINAL TIME', '100'),
      v('Initial Target Capacity', '100'),
      v('INITIAL TIME', '0'),
      v('Production', '100+STEP(100,10)'),
      v('SAVEPER', 'TIME STEP'),
      v('Target Capacity', 'ACTIVE INITIAL(Capacity*Utilization Adjustment,Initial Target Capacity)'),
      v('TIME STEP', '1'),
      v('Utilization Adjustment', 'Capacity Utilization^Utilization Sensitivity'),
      v('Utilization Sensitivity', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "allocate" model', () => {
    const vars = readSubscriptsAndVariables('allocate')
    expect(vars).toEqual([
      v('demand[region]', '3,2,4', { subscripts: ['_boston'], separationDims: ['_region'] }),
      v('demand[region]', '3,2,4', { subscripts: ['_dayton'], separationDims: ['_region'] }),
      v('demand[region]', '3,2,4', { subscripts: ['_fresno'], separationDims: ['_region'] }),
      v('extra', '1'),
      v('Final Supply', '10'),
      v('FINAL TIME', '12'),
      v('Initial Supply', '0'),
      v('INITIAL TIME', '0'),
      v('integer supply', '0'),
      v('integer type', '0'),
      v('priority type', '3'),
      v('priority vector[region,pextra]', 'extra', { subscripts: ['_region', '_pextra'] }),
      v('priority vector[region,ppriority]', 'priority[region]', { subscripts: ['_region', '_ppriority'] }),
      v('priority vector[region,ptype]', 'priority type+integer type', { subscripts: ['_region', '_ptype'] }),
      v('priority vector[region,pwidth]', 'priority width', { subscripts: ['_region', '_pwidth'] }),
      v('priority width', '1'),
      v('priority[region]', '1,2,3', { subscripts: ['_boston'], separationDims: ['_region'] }),
      v('priority[region]', '1,2,3', { subscripts: ['_dayton'], separationDims: ['_region'] }),
      v('priority[region]', '1,2,3', { subscripts: ['_fresno'], separationDims: ['_region'] }),
      v('SAVEPER', 'TIME STEP'),
      v(
        'shipments[region]',
        'ALLOCATE AVAILABLE(demand[region],priority vector[region,ptype],total supply available)',
        { subscripts: ['_region'] }
      ),
      v('TIME STEP', '0.125'),
      v('total demand', 'SUM(demand[region!])'),
      v('total shipments', 'SUM(shipments[region!])'),
      v(
        'total supply available',
        'IF THEN ELSE(integer supply,INTEGER(Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME)),Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME))'
      ),
      v('Time', '')
    ])
  })

  it('should work for Vensim "arrays_varname" model', () => {
    const s = (a: number, d: number) => {
      return v('s[DimA,DimD]', '11,12,13,14;21,22,23,24;31,32,33,34;', {
        subscripts: [`_a${a}`, `_d${d}`],
        separationDims: ['_dima', '_dimd']
      })
    }

    const sc = (c: number, cprime: number) => {
      return v("sc[DimC,DimC']", '11,12,13;21,22,23;31,32,33;', {
        subscripts: [`_c${c}`, `_c${cprime}`],
        separationDims: ['_dimc', '_dimc_']
      })
    }

    const y = (d: number, a: number) => {
      return v('y[DimD,DimA]', '11,12,13;21,22,23;31,32,33;41,42,43;', {
        subscripts: [`_a${a}`, `_d${d}`],
        separationDims: ['_dima', '_dimd']
      })
    }

    const zC1 = (a: number, b: number) => {
      return v(`z[C1,DimA,DimB]`, '110,111,112;120,121,122;130,131,132;', {
        subscripts: [`_a${a}`, `_b${b}`, '_c1'],
        separationDims: ['_dima', '_dimb']
      })
    }

    const zC2 = (a: number, b: number) => {
      return v(`z[C2,DimA,DimB]`, '210,211,212;220,221,222;230,231,232;', {
        subscripts: [`_a${a}`, `_b${b}`, '_c2'],
        separationDims: ['_dima', '_dimb']
      })
    }

    const vars = readSubscriptsAndVariables('arrays_varname')
    expect(vars).toEqual([
      v('a[DimA]', 'inputA[DimA]*10', { subscripts: ['_dima'] }),
      v('b[DimA]', '42', { subscripts: ['_dima'] }),
      v('c[DimA]', 'inputA[DimA]+a[DimA]', { subscripts: ['_dima'] }),
      v('d[A1]', 'inputA[A1]*10', { subscripts: ['_a1'] }),
      v('e[DimB]', 'inputA[DimA]*10', { subscripts: ['_dimb'] }),
      v('f[DimA,DimB]', 'inputAB[DimA,DimB]*a[DimA]', { subscripts: ['_dima', '_dimb'] }),
      v('FINAL TIME', '1'),
      v('g[DimB]', 'INTEG(a[DimA],e[DimB])', { subscripts: ['_dimb'] }),
      v('h', 'SUM(a[DimA!])+1'),
      v('INITIAL TIME', '0'),
      v('inputA[DimA]', '-1,+2,3', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('inputA[DimA]', '-1,+2,3', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('inputA[DimA]', '-1,+2,3', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('inputAB[A1,B1]', '11', { subscripts: ['_a1', '_b1'] }),
      v('inputAB[A1,B2]', '12', { subscripts: ['_a1', '_b2'] }),
      v('inputAB[A1,B3]', '13', { subscripts: ['_a1', '_b3'] }),
      v('inputAB[A2,B1]', '14', { subscripts: ['_a2', '_b1'] }),
      v('inputAB[A2,B2]', '15', { subscripts: ['_a2', '_b2'] }),
      v('inputAB[A2,B3]', '16', { subscripts: ['_a2', '_b3'] }),
      v('inputAB[A3,B1]', '17', { subscripts: ['_a3', '_b1'] }),
      v('inputAB[A3,B2]', '18', { subscripts: ['_a3', '_b2'] }),
      v('inputAB[A3,B3]', '19', { subscripts: ['_a3', '_b3'] }),
      v('ndim4[DimA,DimB,DimC,DimD]', '4', { subscripts: ['_dima', '_dimb', '_dimc', '_dimd'] }),
      v('o[DimB]', 'SUM(inputAB[DimA!,DimB])', { subscripts: ['_dimb'] }),
      v('p[DimA]', 'SUM(inputAB[DimA,DimB!])', { subscripts: ['_dima'] }),
      v('r[DimA,DimB]', 'inputAB[DimA,DimB]*g[DimB]', { subscripts: ['_dima', '_dimb'] }),
      v('s1d[DimA]', '1', { subscripts: ['_dima'] }),
      v('s1i[A1]', '1', { subscripts: ['_a1'] }),
      v('s2dd[DimA,DimB]', '1', { subscripts: ['_dima', '_dimb'] }),
      v('s2di[DimA,B1]', '1', { subscripts: ['_dima', '_b1'] }),
      v('s2id[A1,DimB]', '1', { subscripts: ['_a1', '_dimb'] }),
      v('s2ii[A1,B1]', '1', { subscripts: ['_a1', '_b1'] }),
      v('s3ddd[DimA,DimB,DimC]', '1', { subscripts: ['_dima', '_dimb', '_dimc'] }),
      v('s3ddi[DimA,DimB,C1]', '1', { subscripts: ['_dima', '_dimb', '_c1'] }),
      v('s3did[DimA,B1,DimC]', '1', { subscripts: ['_dima', '_b1', '_dimc'] }),
      v('s3dii[DimA,B1,C1]', '1', { subscripts: ['_dima', '_b1', '_c1'] }),
      v('s3idd[A1,DimB,DimC]', '1', { subscripts: ['_a1', '_dimb', '_dimc'] }),
      v('s3idi[A1,DimB,C1]', '1', { subscripts: ['_a1', '_dimb', '_c1'] }),
      v('s3iid[A1,B1,DimC]', '1', { subscripts: ['_a1', '_b1', '_dimc'] }),
      v('s3iii[A1,B1,C1]', '1', { subscripts: ['_a1', '_b1', '_c1'] }),
      s(1, 1),
      s(1, 2),
      s(1, 3),
      s(1, 4),
      s(2, 1),
      s(2, 2),
      s(2, 3),
      s(2, 4),
      s(3, 1),
      s(3, 2),
      s(3, 3),
      s(3, 4),
      v('SAVEPER', 'TIME STEP'),
      sc(1, 1),
      sc(1, 2),
      sc(1, 3),
      sc(2, 1),
      sc(2, 2),
      sc(2, 3),
      sc(3, 1),
      sc(3, 2),
      sc(3, 3),
      v('t[SubA]', '1', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('t[SubA]', '1', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('TIME STEP', '1'),
      v('u[SubA]', '1,2', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('u[SubA]', '1,2', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('v[DimA,B1]', '1,2,3', { subscripts: ['_a1', '_b1'], separationDims: ['_dima'] }),
      v('v[DimA,B1]', '1,2,3', { subscripts: ['_a2', '_b1'], separationDims: ['_dima'] }),
      v('v[DimA,B1]', '1,2,3', { subscripts: ['_a3', '_b1'], separationDims: ['_dima'] }),
      v('w[A1,DimB]', '1,2,3', { subscripts: ['_a1', '_b1'], separationDims: ['_dimb'] }),
      v('w[A1,DimB]', '1,2,3', { subscripts: ['_a1', '_b2'], separationDims: ['_dimb'] }),
      v('w[A1,DimB]', '1,2,3', { subscripts: ['_a1', '_b3'], separationDims: ['_dimb'] }),
      v('x[DimX]', '1,2,3', { subscripts: ['_a2'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3', { subscripts: ['_a3'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3', { subscripts: ['_a1'], separationDims: ['_dimx'] }),
      y(1, 1),
      y(2, 1),
      y(3, 1),
      y(4, 1),
      y(1, 2),
      y(2, 2),
      y(3, 2),
      y(4, 2),
      y(1, 3),
      y(2, 3),
      y(3, 3),
      y(4, 3),
      zC1(1, 1),
      zC1(1, 2),
      zC1(1, 3),
      zC1(2, 1),
      zC1(2, 2),
      zC1(2, 3),
      zC1(3, 1),
      zC1(3, 2),
      zC1(3, 3),
      zC2(1, 1),
      zC2(1, 2),
      zC2(1, 3),
      zC2(2, 1),
      zC2(2, 2),
      zC2(2, 3),
      zC2(3, 1),
      zC2(3, 2),
      zC2(3, 3),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delay" model', () => {
    const vars = readSubscriptsAndVariables('delay')
    expect(vars).toEqual([
      v('d1', 'DELAY1(input,delay)'),
      v('d10', 'k*DELAY3(input,delay)'),
      v('d11[DimA]', 'k*DELAY3(input,delay a[DimA])', { subscripts: ['_dima'] }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        subscripts: ['_a2'],
        separationDims: ['_suba']
      }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        subscripts: ['_a3'],
        separationDims: ['_suba']
      }),
      v('d2[DimA]', 'DELAY1I(input a[DimA],delay,init 1)', { subscripts: ['_dima'] }),
      v('d3[DimA]', 'DELAY1I(input,delay a[DimA],init 1)', { subscripts: ['_dima'] }),
      v('d4[DimA]', 'DELAY1I(input,delay,init a[DimA])', { subscripts: ['_dima'] }),
      v('d5[DimA]', 'DELAY1I(input a[DimA],delay a[DimA],init a[DimA])', { subscripts: ['_dima'] }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('d7', 'DELAY3(input,delay)'),
      v('d8[DimA]', 'DELAY3(input,delay a[DimA])', { subscripts: ['_dima'] }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('delay', '5'),
      v('delay 2', '5'),
      v('delay a[DimA]', '1,2,3', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('delay a[DimA]', '1,2,3', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('delay a[DimA]', '1,2,3', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('FINAL TIME', '10'),
      v('init 1', '0'),
      v('init 2[SubA]', '0', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('init 2[SubA]', '0', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('init a[DimA]', '0', { subscripts: ['_dima'] }),
      v('INITIAL TIME', '0'),
      v('input', 'STEP(10,0)-STEP(10,4)'),
      v('input 2[SubA]', '20,30', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('input 2[SubA]', '20,30', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('input a[DimA]', '10,20,30', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('input a[DimA]', '10,20,30', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('input a[DimA]', '10,20,30', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('k', '42'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delayfixed" model', () => {
    const vars = readSubscriptsAndVariables('delayfixed')
    expect(vars).toEqual([
      v('a', 'DELAY FIXED(input[A1]+1,a delay time,0)'),
      v('a delay time', '0'),
      v('b', 'DELAY FIXED(input[A1]+1,b delay time,0)'),
      v('b delay time', '1'),
      v('FINAL TIME', '50'),
      v('INITIAL TIME', '0'),
      v('input[A1]', '10*TIME', { subscripts: ['_a1'] }),
      v('input[A2]', '20*TIME', { subscripts: ['_a2'] }),
      v('input[A3]', '30*TIME', { subscripts: ['_a3'] }),
      v('output[DimA]', 'DELAY FIXED(input[DimA],1,0)', { subscripts: ['_dima'] }),
      v('receiving', 'DELAY FIXED(shipping,shipping time,shipping)'),
      v('reference shipping rate', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('shipments in transit', 'INTEG(shipping-receiving,shipping*shipping time)'),
      v('shipping', 'STEP(reference shipping rate,10)-STEP(reference shipping rate,20)'),
      v('shipping time', '20'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delayfixed2" model', () => {
    const vars = readSubscriptsAndVariables('delayfixed2')
    expect(vars).toEqual([
      v('FINAL TIME', '20'),
      v('INITIAL TIME', '10'),
      v('input1', '10*TIME+10'),
      v('input2', '10*TIME+10'),
      v('output1', 'DELAY FIXED(input1,1,0)'),
      v('output2', 'DELAY FIXED(input2,5,0)'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "depreciate" model', () => {
    const vars = readSubscriptsAndVariables('depreciate')
    expect(vars).toEqual([
      v('Capacity Cost', '1e+06'),
      v('Depreciated Amount', 'DEPRECIATE STRAIGHTLINE(str,dtime,1,0)'),
      v('dtime', '20'),
      v('FINAL TIME', '2050'),
      v('INITIAL TIME', '2020'),
      v('New Capacity', 'IF THEN ELSE(Time=2022,1000,IF THEN ELSE(Time=2026,2500,0))'),
      v('SAVEPER', 'TIME STEP'),
      v('str', 'Capacity Cost*New Capacity'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directconst" model', () => {
    const vars = readSubscriptsAndVariables('directconst')
    expect(vars).toEqual([
      v('a', "GET DIRECT CONSTANTS('data/a.csv',',','B2')"),
      v('b[DimB]', "GET DIRECT CONSTANTS('data/b.csv',',','B2*')", { subscripts: ['_dimb'] }),
      v('c[DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", { subscripts: ['_dimb', '_dimc'] }),
      v('d[D1,DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", { subscripts: ['_dimb', '_dimc', '_d1'] }),
      v('e[DimC,DimB]', "GET DIRECT CONSTANTS('data/c.csv',',','B2*')", { subscripts: ['_dimb', '_dimc'] }),
      v('f[DimC,DimA]:EXCEPT:[DimC,SubA]', '0', { subscripts: ['_a1', '_dimc'], separationDims: ['_dima'] }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        subscripts: ['_a2', '_dimc'],
        separationDims: ['_suba']
      }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        subscripts: ['_a3', '_dimc'],
        separationDims: ['_suba']
      }),
      v('FINAL TIME', '1'),
      v('g[From DimC,To DimC]', "GET DIRECT CONSTANTS('data/g.csv',',','B2')", {
        subscripts: ['_from_dimc', '_to_dimc']
      }),
      v('h', "GET DIRECT CONSTANTS('data/h.csv',',','B5')"),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directdata" model', () => {
    const vars = readSubscriptsAndVariables('directdata')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT DATA('?data','A Data','A','B2')", { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('a[DimA]', "GET DIRECT DATA('?data','A Data','A','B2')", { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('b[DimA]', 'a[DimA]*10', { subscripts: ['_dima'] }),
      v('c', "GET DIRECT DATA('?data','C Data','A','B2')"),
      v('d', 'c*10'),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('f[DimA]', 'e[DimA]*10', { subscripts: ['_dima'] }),
      v('FINAL TIME', '2050'),
      v('g', "GET DIRECT DATA('g_data.csv',',','A','B2')"),
      v('h', 'g*10'),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        subscripts: ['_a1', '_b1'],
        separationDims: ['_dimb']
      }),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        subscripts: ['_a1', '_b2'],
        separationDims: ['_dimb']
      }),
      v('INITIAL TIME', '1990'),
      v('j[A1,DimB]', 'i[A1,DimB]', { subscripts: ['_a1', '_dimb'] }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        subscripts: ['_a1', '_b1'],
        separationDims: ['_dimb']
      }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        subscripts: ['_a1', '_b2'],
        separationDims: ['_dimb']
      }),
      v('k[A2,DimB]', '0', { subscripts: ['_a2', '_dimb'] }),
      v('l[DimA,DimB]', 'k[DimA,DimB]', { subscripts: ['_dima', '_dimb'] }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", { subscripts: ['_m1'], separationDims: ['_dimm'] }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", { subscripts: ['_m2'], separationDims: ['_dimm'] }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", { subscripts: ['_m3'], separationDims: ['_dimm'] }),
      v('n', 'm[M2]'),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", { subscripts: ['_m1'], separationDims: ['_dimm'] }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", { subscripts: ['_m2'], separationDims: ['_dimm'] }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", { subscripts: ['_m3'], separationDims: ['_dimm'] }),
      v('p', 'o[M2]'),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", { subscripts: ['_m2'], separationDims: ['_subm'] }),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", { subscripts: ['_m3'], separationDims: ['_subm'] }),
      v('r', 'q[M3]'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directlookups" model', () => {
    const vars = readSubscriptsAndVariables('directlookups')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','E2')", {
        subscripts: ['_a1'],
        separationDims: ['_dima']
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','E2')", {
        subscripts: ['_a2'],
        separationDims: ['_dima']
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','E2')", {
        subscripts: ['_a3'],
        separationDims: ['_dima']
      }),
      v('b[DimA]', 'a[DimA](Time)', { subscripts: ['_dima'] }),
      v('FINAL TIME', '2050'),
      v('INITIAL TIME', '2020'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directsubs" model', () => {
    const vars = readSubscriptsAndVariables('directsubs')
    expect(vars).toEqual([
      v('a[DimA]', '10,20,30', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('a[DimA]', '10,20,30', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('a[DimA]', '10,20,30', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b1'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b2'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b3'], separationDims: ['_dimb'] }),
      v('c[DimC]', 'a[DimA]+1', { subscripts: ['_dimc'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "elmcount" model', () => {
    const vars = readSubscriptsAndVariables('elmcount')
    expect(vars).toEqual([
      v('a', 'ELMCOUNT(DimA)'),
      v('b[DimA]', '10*ELMCOUNT(DimA)+a', { subscripts: ['_dima'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "except" model', () => {
    const vars = readSubscriptsAndVariables('except')
    expect(vars).toEqual([
      v('a[DimA]', '1', { subscripts: ['_dima'] }),
      v('b[SubA]', '2', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('b[SubA]', '2', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('c[DimA,DimC]', '3', { subscripts: ['_dima', '_dimc'] }),
      v('d[SubA,C1]', '4', { subscripts: ['_a2', '_c1'], separationDims: ['_suba'] }),
      v('d[SubA,C1]', '4', { subscripts: ['_a3', '_c1'], separationDims: ['_suba'] }),
      v('e[DimA,SubC]', '5', { subscripts: ['_dima', '_c2'], separationDims: ['_subc'] }),
      v('e[DimA,SubC]', '5', { subscripts: ['_dima', '_c3'], separationDims: ['_subc'] }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e1', '_f1', '_g1'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e1', '_f1', '_g2'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e1', '_f2', '_g1'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e1', '_f2', '_g2'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e2', '_f1', '_g1'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e2', '_f1', '_g2'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        subscripts: ['_e2', '_f2', '_g1'],
        separationDims: ['_dime', '_dimf', '_dimg']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f1', '_g1', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f1', '_g1', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f1', '_g2', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f1', '_g2', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f2', '_g1', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f2', '_g1', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f2', '_g2', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e1', '_f2', '_g2', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f1', '_g1', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f1', '_g1', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f1', '_g2', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f1', '_g2', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f2', '_g1', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f2', '_g1', '_h2'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        subscripts: ['_e2', '_f2', '_g2', '_h1'],
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh']
      }),
      v('f[A1,C1]', '6', { subscripts: ['_a1', '_c1'] }),
      v('FINAL TIME', '1'),
      v('g[DimA]:EXCEPT:[A1]', '7', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('g[DimA]:EXCEPT:[A1]', '7', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('h[DimA]:EXCEPT:[SubA]', '8', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('INITIAL TIME', '0'),
      v('input', '0'),
      v('j[DimD]', '10,20', { subscripts: ['_d1'], separationDims: ['_dimd'] }),
      v('j[DimD]', '10,20', { subscripts: ['_d2'], separationDims: ['_dimd'] }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('o[SubA]:EXCEPT:[SubA2]', '9', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a1', '_c2'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a1', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a2', '_c1'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a2', '_c2'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a2', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a3', '_c1'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a3', '_c2'], separationDims: ['_dima', '_dimc'] }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', { subscripts: ['_a3', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a1', '_c1'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a1', '_c2'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a1', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a2', '_c1'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a2', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a3', '_c1'], separationDims: ['_dima', '_dimc'] }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', { subscripts: ['_a3', '_c3'], separationDims: ['_dima', '_dimc'] }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', { subscripts: ['_dima', '_c2'], separationDims: ['_dimc'] }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', { subscripts: ['_dima', '_c3'], separationDims: ['_dimc'] }),
      v('s[A3]', '13', { subscripts: ['_a3'] }),
      v('s[SubA]:EXCEPT:[A3]', '14', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('SAVEPER', '1'),
      v('t[SubA,SubC]', '15', { subscripts: ['_a2', '_c2'], separationDims: ['_suba', '_subc'] }),
      v('t[SubA,SubC]', '15', { subscripts: ['_a2', '_c3'], separationDims: ['_suba', '_subc'] }),
      v('t[SubA,SubC]', '15', { subscripts: ['_a3', '_c2'], separationDims: ['_suba', '_subc'] }),
      v('t[SubA,SubC]', '15', { subscripts: ['_a3', '_c3'], separationDims: ['_suba', '_subc'] }),
      v('TIME STEP', '1'),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('w[DimA]:EXCEPT:[SubA]', 'a[DimA]', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('x[DimA]:EXCEPT:[SubA]', 'c[DimA,C1]', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        subscripts: ['_a2', '_c2'],
        separationDims: ['_suba', '_subc']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        subscripts: ['_a2', '_c3'],
        separationDims: ['_suba', '_subc']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        subscripts: ['_a3', '_c2'],
        separationDims: ['_suba', '_subc']
      }),
      v('z ref a', '25'),
      v('z ref b', '5'),
      v('z total', 'SUM(z[SubA!])'),
      v('z[DimA]:EXCEPT:[SubA]', '10', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('z[SubA]', 'z ref a*z ref b', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('z[SubA]', 'z ref a*z ref b', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('Time', '')
    ])
  })

  // it('should work for Vensim "except2" model', () => {
  //   const vars = readSubscriptsAndVariables('except2')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "extdata" model', () => {
    const vars = readSubscriptsAndVariables('extdata')
    expect(vars).toEqual([
      v('A Totals', 'SUM(A Values[DimA!])'),
      v('A Values[DimA]', '', { subscripts: ['_dima'] }),
      v('B Selection[DimB]', 'IF THEN ELSE(DimB=Chosen B,1,0)', { subscripts: ['_dimb'] }),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])'),
      v('BC Values[DimB,DimC]', '', { subscripts: ['_dimb', '_dimc'] }),
      v('C Selection[DimC]', 'IF THEN ELSE(DimC=Chosen C,1,0)', { subscripts: ['_dimc'] }),
      v('Chosen B', '3'),
      v('Chosen C', '1'),
      v('Chosen E', '2'),
      v('D Totals', 'SUM(D Values[DimD!])'),
      v('D Values[DimD]', '', { subscripts: ['_dimd'] }),
      v('E Selection[DimE]', 'IF THEN ELSE(DimE=Chosen E,1,0)', { subscripts: ['_dime'] }),
      v('E Values[E1]', '', { subscripts: ['_e1'] }),
      v('E Values[E2]', '', { subscripts: ['_e2'] }),
      v('E1 Values', 'E Values[E1]'),
      v('E2 Values', 'E Values[E2]'),
      v('EBC Values[DimE,DimB,DimC]', '', { subscripts: ['_dimb', '_dimc', '_dime'] }),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('Simple 1', '', { varType: 'data' }),
      v('Simple 2', '', { varType: 'data' }),
      v('Simple Totals', 'Simple 1+Simple 2'),
      v('TIME STEP', '1'),
      v('Total EBC', 'VECTOR SELECT(E Selection[DimE!],Total EBC for Selected BC[DimE!],0,VSSUM,VSERRATLEASTONE)'),
      v(
        'Total EBC for Selected BC[DimE]',
        'VECTOR SELECT(B Selection[DimB!],Total EBC for Selected C[DimE,DimB!],0,VSSUM,VSERRATLEASTONE)',
        { subscripts: ['_dime'] }
      ),
      v(
        'Total EBC for Selected C[DimE,DimB]',
        'VECTOR SELECT(C Selection[DimC!],EBC Values[DimE,DimB,DimC!],0,VSSUM,VSERRATLEASTONE)',
        { subscripts: ['_dimb', '_dime'] }
      ),
      v('VSERRATLEASTONE', '1'),
      v('VSSUM', '0'),
      v('Time', '')
    ])
  })

  // it('should work for Vensim "flatten" model', () => {
  //   const vars = readSubscriptsAndVariables('flatten')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  // it('should work for Vensim "getdata" model', () => {
  //   const vars = readSubscriptsAndVariables('getdata')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "index" model', () => {
    const vars = readSubscriptsAndVariables('index')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimA]+10', { subscripts: ['_dima'] }),
      v('b[A1]', '1', { subscripts: ['_a1'] }),
      v('b[A2]', '2', { subscripts: ['_a2'] }),
      v('b[A3]', '3', { subscripts: ['_a3'] }),
      v('c[DimA]', 'b[A1]+1', { subscripts: ['_dima'] }),
      v('d[DimA]', 'b[A1]+b[DimA]', { subscripts: ['_dima'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "initial" model', () => {
    const vars = readSubscriptsAndVariables('initial')
    expect(vars).toEqual([
      v('amplitude', '2'),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('INITIAL x', 'INITIAL(x)'),
      v('Period', '20'),
      v('relative x', 'x/INITIAL x'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('x', 'amplitude*COS(6.28*Time/Period)'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "interleaved" model', () => {
    const vars = readSubscriptsAndVariables('interleaved')
    expect(vars).toEqual([
      v('a[A1]', 'x', { subscripts: ['_a1'] }),
      v('a[A2]', 'y', { subscripts: ['_a2'] }),
      v('b[DimA]', 'a[DimA]', { subscripts: ['_dima'] }),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('x', '1'),
      v('y', 'a[A1]'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "longeqns" model', () => {
    const vars = readSubscriptsAndVariables('longeqns')
    expect(vars).toEqual([
      v('EqnA[DimX,DimY]', '1', { subscripts: ['_dimx', '_dimy'] }),
      v('EqnB[DimX,DimW]', '1', { subscripts: ['_dimw', '_dimx'] }),
      v(
        'EqnC[DimX,DimY,DimZ]',
        'EqnA[DimX,DimY]*(-SUM(EqnB[DimX,DimW\n!])-(SUM(EqnB[DimX,DimW!])-SUM(EqnB[DimX,DimW\n!]))*EqnA[DimX,DimY])',
        { subscripts: ['_dimx', '_dimy', '_dimz'] }
      ),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('Result', 'EqnC[X1,Y1,Z1]'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "lookup" model', () => {
    const vars = readSubscriptsAndVariables('lookup')
    expect(vars).toEqual([
      v('a', ''),
      v('b', 'a(i)'),
      v('c[A1]', '', { subscripts: ['_a1'] }),
      v('c[A2]', '', { subscripts: ['_a2'] }),
      v('c[A3]', '', { subscripts: ['_a3'] }),
      v('d', 'WITH LOOKUP(i,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))'),
      v('e[DimA]', 'c[DimA](i)', { subscripts: ['_dima'] }),
      v('f', 'c[A1](i)'),
      v('FINAL TIME', '10'),
      v('g', ''),
      v('g at 0 backward', 'LOOKUP BACKWARD(g,0)'),
      v('g at 0 forward', 'LOOKUP FORWARD(g,0)'),
      v('g at 0pt5 backward', 'LOOKUP BACKWARD(g,0.5)'),
      v('g at 0pt5 forward', 'LOOKUP FORWARD(g,0.5)'),
      v('g at 1pt0 backward', 'LOOKUP BACKWARD(g,1.0)'),
      v('g at 1pt0 forward', 'LOOKUP FORWARD(g,1.0)'),
      v('g at 1pt5 backward', 'LOOKUP BACKWARD(g,1.5)'),
      v('g at 1pt5 forward', 'LOOKUP FORWARD(g,1.5)'),
      v('g at 2pt0 backward', 'LOOKUP BACKWARD(g,2.0)'),
      v('g at 2pt0 forward', 'LOOKUP FORWARD(g,2.0)'),
      v('g at 2pt5 backward', 'LOOKUP BACKWARD(g,2.5)'),
      v('g at 2pt5 forward', 'LOOKUP FORWARD(g,2.5)'),
      v('g at minus 1 backward', 'LOOKUP BACKWARD(g,-1)'),
      v('g at minus 1 forward', 'LOOKUP FORWARD(g,-1)'),
      v('i', 'Time/10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('withlookup at 0', 'WITH LOOKUP(0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 0pt5', 'WITH LOOKUP(0.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 1pt0', 'WITH LOOKUP(1.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 1pt5', 'WITH LOOKUP(1.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 2pt0', 'WITH LOOKUP(2.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 2pt5', 'WITH LOOKUP(2.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at minus 1', 'WITH LOOKUP(-1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "mapping" model', () => {
    const vars = readSubscriptsAndVariables('mapping')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimB]*10', { subscripts: ['_dima'] }),
      v('b[DimB]', '1,2', { subscripts: ['_b1'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2', { subscripts: ['_b2'], separationDims: ['_dimb'] }),
      v('c[DimC]', '1,2,3', { subscripts: ['_c1'], separationDims: ['_dimc'] }),
      v('c[DimC]', '1,2,3', { subscripts: ['_c2'], separationDims: ['_dimc'] }),
      v('c[DimC]', '1,2,3', { subscripts: ['_c3'], separationDims: ['_dimc'] }),
      v('d[DimD]', 'c[DimC]*10', { subscripts: ['_dimd'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "multimap" model', () => {
    const vars = readSubscriptsAndVariables('multimap')
    expect(vars).toEqual([
      v('a[DimA]', '1,2,3', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('a[DimA]', '1,2,3', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('a[DimA]', '1,2,3', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('b[DimB]', 'a[DimA]', { subscripts: ['_dimb'] }),
      v('c[DimC]', 'a[DimA]', { subscripts: ['_dimc'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', '1'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "npv" model', () => {
    const vars = readSubscriptsAndVariables('npv')
    expect(vars).toEqual([
      v('discount rate', 'interest rate/12/100'),
      v('factor', '1'),
      v('FINAL TIME', '100'),
      v('init val', '0'),
      v('INITIAL TIME', '0'),
      v('interest rate', '10'),
      v('investment', '100'),
      v('NPV vs initial time', 'NPV(stream,discount rate,init val,factor)'),
      v('revenue', '3'),
      v('SAVEPER', 'TIME STEP'),
      v('start time', '12'),
      v('stream', '-investment/TIME STEP*PULSE(start time,TIME STEP)+STEP(revenue,start time)'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "power" model', () => {
    const vars = readSubscriptsAndVariables('power')
    expect(vars).toEqual([
      v('a', 'POWER(base,2)'),
      v('b', 'POWER(base,0.5)'),
      v('base', '2'),
      v('c', 'POWER(base,1.5)'),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  // it('should work for Vensim "preprocess" model', () => {
  //   const vars = readSubscriptsAndVariables('preprocess')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "prune" model', () => {
    const vars = readSubscriptsAndVariables('prune')
    expect(vars).toEqual([
      v('A Totals', 'SUM(A Values[DimA!])'),
      v('A Values[DimA]', '', { subscripts: ['_dima'] }),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])'),
      v('BC Values[DimB,DimC]', '', { subscripts: ['_dimb', '_dimc'] }),
      v('Constant Partial 1', '1'),
      v('Constant Partial 2', '2'),
      v('D Totals', 'SUM(D Values[DimD!])'),
      v('D Values[DimD]', '', { subscripts: ['_dimd'] }),
      v('E Values[E1]', '', { subscripts: ['_e1'] }),
      v('E Values[E2]', '', { subscripts: ['_e2'] }),
      v('E1 Values', 'E Values[E1]'),
      v('E2 Values', 'E Values[E2]'),
      v('FINAL TIME', '10'),
      v('Initial Partial[C1]', 'INITIAL(Constant Partial 1)', { subscripts: ['_c1'] }),
      v('Initial Partial[C2]', 'INITIAL(Constant Partial 2)', { subscripts: ['_c2'] }),
      v('INITIAL TIME', '0'),
      v('Input 1', '10'),
      v('Input 1 and 2 Total', 'Input 1+Input 2'),
      v('Input 2', '20'),
      v('Input 2 and 3 Total', 'Input 2+Input 3'),
      v('Input 3', '30'),
      v('Look1', ''),
      v('Look1 Value at t1', 'Look1(1)'),
      v('Look2', ''),
      v('Look2 Value at t1', 'Look2(1)'),
      v('Partial[C2]', 'Initial Partial[C2]', { subscripts: ['_c2'] }),
      v('SAVEPER', 'TIME STEP'),
      v('Simple 1', '', { varType: 'data' }),
      v('Simple 2', '', { varType: 'data' }),
      v('Simple Totals', 'Simple 1+Simple 2'),
      v('Test 1 F', '2'),
      v('Test 1 Result', 'IF THEN ELSE(Input 1=10,Test 1 T,Test 1 F)'),
      v('Test 1 T', '1'),
      v('Test 10 Cond', '1'),
      v('Test 10 F', '2'),
      v('Test 10 Result', 'IF THEN ELSE(ABS(Test 10 Cond),Test 10 T,Test 10 F)'),
      v('Test 10 T', '1'),
      v('Test 11 Cond', '0'),
      v('Test 11 F', '2'),
      v('Test 11 Result', 'IF THEN ELSE(Test 11 Cond:AND:ABS(Test 11 Cond),Test 11 T,Test 11 F)'),
      v('Test 11 T', '1'),
      v('Test 12 Cond', '1'),
      v('Test 12 F', '2'),
      v('Test 12 Result', 'IF THEN ELSE(Test 12 Cond:OR:ABS(Test 12 Cond),Test 12 T,Test 12 F)'),
      v('Test 12 T', '1'),
      v('Test 13 Cond', '1'),
      v('Test 13 F', '2'),
      v('Test 13 Result', 'IF THEN ELSE(Test 13 Cond,Test 13 T1+Test 13 T2,Test 13 F)*10.0'),
      v('Test 13 T1', '1'),
      v('Test 13 T2', '7'),
      v('Test 2 F', '2'),
      v('Test 2 Result', 'IF THEN ELSE(0,Test 2 T,Test 2 F)'),
      v('Test 2 T', '1'),
      v('Test 3 F', '2'),
      v('Test 3 Result', 'IF THEN ELSE(1,Test 3 T,Test 3 F)'),
      v('Test 3 T', '1'),
      v('Test 4 Cond', '0'),
      v('Test 4 F', '2'),
      v('Test 4 Result', 'IF THEN ELSE(Test 4 Cond,Test 4 T,Test 4 F)'),
      v('Test 4 T', '1'),
      v('Test 5 Cond', '1'),
      v('Test 5 F', '2'),
      v('Test 5 Result', 'IF THEN ELSE(Test 5 Cond,Test 5 T,Test 5 F)'),
      v('Test 5 T', '1'),
      v('Test 6 Cond', '0'),
      v('Test 6 F', '2'),
      v('Test 6 Result', 'IF THEN ELSE(Test 6 Cond=1,Test 6 T,Test 6 F)'),
      v('Test 6 T', '1'),
      v('Test 7 Cond', '1'),
      v('Test 7 F', '2'),
      v('Test 7 Result', 'IF THEN ELSE(Test 7 Cond=1,Test 7 T,Test 7 F)'),
      v('Test 7 T', '1'),
      v('Test 8 Cond', '0'),
      v('Test 8 F', '2'),
      v('Test 8 Result', 'IF THEN ELSE(Test 8 Cond>0,Test 8 T,Test 8 F)'),
      v('Test 8 T', '1'),
      v('Test 9 Cond', '1'),
      v('Test 9 F', '2'),
      v('Test 9 Result', 'IF THEN ELSE(Test 9 Cond>0,Test 9 T,Test 9 F)'),
      v('Test 9 T', '1'),
      v('TIME STEP', '1'),
      v('With Look1 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('With Look2 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "pulsetrain" model', () => {
    const vars = readSubscriptsAndVariables('pulsetrain')
    expect(vars).toEqual([
      v('duration', '1'),
      v('FINAL TIME', '40'),
      v('first pulse time', '10'),
      v('INITIAL TIME', '0'),
      v('last pulse time', '30'),
      v('p', 'PULSE TRAIN(first pulse time,duration,repeat interval,last pulse time)'),
      v('repeat interval', '5'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '0.25'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "quantum" model', () => {
    const vars = readSubscriptsAndVariables('quantum')
    expect(vars).toEqual([
      v('a', 'QUANTUM(1.9,1.0)'),
      v('b', 'QUANTUM(0.9,1.0)'),
      v('c', 'QUANTUM(-0.9,1.0)'),
      v('d', 'QUANTUM(-1.9,1.0)'),
      v('e', 'QUANTUM(112.3,10.0)'),
      v('f', 'QUANTUM(50,12)'),
      v('FINAL TIME', '1'),
      v('g', 'QUANTUM(423,63)'),
      v('h', 'QUANTUM(10,10)'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "ref" model', () => {
    const vars = readSubscriptsAndVariables('ref')
    expect(vars).toEqual([
      v('ce[t1]', '1', { subscripts: ['_t1'] }),
      v('ce[tNext]', 'ecc[tPrev]+1', { subscripts: ['_t2'], separationDims: ['_tnext'] }),
      v('ce[tNext]', 'ecc[tPrev]+1', { subscripts: ['_t3'], separationDims: ['_tnext'] }),
      v('ecc[t1]', 'ce[t1]+1', { subscripts: ['_t1'] }),
      v('ecc[tNext]', 'ce[tNext]+1', { subscripts: ['_t2'], separationDims: ['_tnext'] }),
      v('ecc[tNext]', 'ce[tNext]+1', { subscripts: ['_t3'], separationDims: ['_tnext'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sample" model', () => {
    const vars = readSubscriptsAndVariables('sample')
    expect(vars).toEqual([
      v('a', 'SAMPLE IF TRUE(MODULO(Time,5)=0,Time,0)'),
      v('b', 'a'),
      v('F', 'SAMPLE IF TRUE(Time=5,2,IF THEN ELSE(switch=1,1,0))'),
      v('FINAL TIME', '10'),
      v('G', 'INTEG(rate,2*COS(scale))'),
      v('INITIAL TIME', '0'),
      v('rate', 'STEP(10,10)'),
      v('SAVEPER', 'TIME STEP'),
      v('scale', '1'),
      v('switch', '1'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sir" model', () => {
    const vars = readSubscriptsAndVariables('sir')
    expect(vars).toEqual([
      v('Average Duration of Illness d', '2'),
      v('Contact Rate c', 'Initial Contact Rate'),
      v('FINAL TIME', '200'),
      v(
        'Infection Rate',
        'Contact Rate c*Infectivity i*Susceptible Population S*Infectious Population I/Total Population P'
      ),
      v('Infectious Population I', 'INTEG(Infection Rate-Recovery Rate,1)'),
      v('Infectivity i', '0.25'),
      v('Initial Contact Rate', '2.5'),
      v('INITIAL TIME', '0'),
      v('Recovered Population R', 'INTEG(Recovery Rate,0)'),
      v('Recovery Rate', 'Infectious Population I/Average Duration of Illness d'),
      v(
        'Reproduction Rate',
        'Contact Rate c*Infectivity i*Average Duration of Illness d*Susceptible Population S/Total Population P'
      ),
      v('SAVEPER', '2'),
      v(
        'Susceptible Population S',
        'INTEG(-Infection Rate,Total Population P-Infectious Population I-Recovered Population R)'
      ),
      v('TIME STEP', '0.0625'),
      v('Total Population P', '10000'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "smooth" model', () => {
    const vars = readSubscriptsAndVariables('smooth3')
    expect(vars).toEqual([
      v('a', '1'),
      v('apt', '1'),
      v('b', '2'),
      v('ca[A1]', '1000+RAMP(100,1,10)', { subscripts: ['_a1'] }),
      v('ca[A2]', '1000+RAMP(300,1,10)', { subscripts: ['_a2'] }),
      v('ca[A3]', '1000+RAMP(600,1,10)', { subscripts: ['_a3'] }),
      v('cs[DimA]', 'MIN(SMOOTH3(sr,apt),ca[DimA]/TIME STEP)', { subscripts: ['_dima'] }),
      v('delay', '2'),
      v('FINAL TIME', '40'),
      v('INITIAL TIME', '0'),
      v('input', '3+PULSE(10,10)'),
      v('S1', 'scale*SMOOTH3(input,delay)'),
      v('S2', 'scale*S2 Level 3'),
      v('S2 Delay', 'delay/3'),
      v('S2 Level 1', 'INTEG((input-S2 Level 1)/S2 Delay,input)'),
      v('S2 Level 2', 'INTEG((S2 Level 1-S2 Level 2)/S2 Delay,input)'),
      v('S2 Level 3', 'INTEG((S2 Level 2-S2 Level 3)/S2 Delay,input)'),
      v('S3', 'SMOOTH3(s3 input,MAX(a,b))'),
      v('s3 input', '3+PULSE(10,10)'),
      v('SAVEPER', 'TIME STEP'),
      v('scale', '6'),
      v('sr', 'COS(Time/5)'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "specialchars" model', () => {
    const vars = readSubscriptsAndVariables('specialchars')
    expect(vars).toEqual([
      v('"100% true"', '4'),
      v('DOLLAR SIGN$', '1'),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('"M&Ms"', '3'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v("time's up", '2'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "subalias" model', () => {
    const vars = readSubscriptsAndVariables('subalias')
    expect(vars).toEqual([
      v('e[DimE]', '10,20,30', { subscripts: ['_f1'], separationDims: ['_dime'] }),
      v('e[DimE]', '10,20,30', { subscripts: ['_f2'], separationDims: ['_dime'] }),
      v('e[DimE]', '10,20,30', { subscripts: ['_f3'], separationDims: ['_dime'] }),
      v('f[DimF]', '1,2,3', { subscripts: ['_f1'], separationDims: ['_dimf'] }),
      v('f[DimF]', '1,2,3', { subscripts: ['_f2'], separationDims: ['_dimf'] }),
      v('f[DimF]', '1,2,3', { subscripts: ['_f3'], separationDims: ['_dimf'] }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "subscript" model', () => {
    const vars = readSubscriptsAndVariables('subscript')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimB]', { subscripts: ['_dima'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b1'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b2'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2,3', { subscripts: ['_b3'], separationDims: ['_dimb'] }),
      v('c[DimB]', 'b[DimB]', { subscripts: ['_dimb'] }),
      v('d[A1]', 'b[B1]', { subscripts: ['_a1'] }),
      v('e[B1]', 'b[B1]', { subscripts: ['_b1'] }),
      v('f[DimA,B1]', '1', { subscripts: ['_dima', '_b1'] }),
      v('f[DimA,B2]', '2', { subscripts: ['_dima', '_b2'] }),
      v('f[DimA,B3]', '3', { subscripts: ['_dima', '_b3'] }),
      v('FINAL TIME', '1'),
      v('g[B1,DimA]', 'f[DimA,B1]', { subscripts: ['_dima', '_b1'] }),
      v('g[B2,DimA]', 'f[DimA,B2]', { subscripts: ['_dima', '_b2'] }),
      v('g[B3,DimA]', 'f[DimA,B3]', { subscripts: ['_dima', '_b3'] }),
      v('INITIAL TIME', '0'),
      v('o[DimA,DimB]', 'f[DimA,DimB]', { subscripts: ['_dima', '_dimb'] }),
      v('p[DimB,DimA]', 'f[DimA,DimB]', { subscripts: ['_dima', '_dimb'] }),
      v('r[DimA]', 'IF THEN ELSE(DimA=Selected A,1,0)', { subscripts: ['_dima'] }),
      v('s[DimA]', 'DimB', { subscripts: ['_dima'] }),
      v('SAVEPER', 'TIME STEP'),
      v('Selected A', '2'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sum" model', () => {
    const vars = readSubscriptsAndVariables('sum')
    expect(vars).toEqual([
      v('a 2[SubA]', '1,2', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('a 2[SubA]', '1,2', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('a[DimA]', '1,2,3', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('a[DimA]', '1,2,3', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('a[DimA]', '1,2,3', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('b 2[SubA]', '4,5', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('b 2[SubA]', '4,5', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('b[DimA]', '4,5,6', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('b[DimA]', '4,5,6', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('b[DimA]', '4,5,6', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('c', 'SUM(a[DimA!])+1'),
      v('d', 'SUM(a[DimA!])+SUM(b[DimA!])'),
      v('e', 'SUM(a[DimA!]*b[DimA!]/TIME STEP)'),
      v('f[DimA,DimC]', '1', { subscripts: ['_dima', '_dimc'] }),
      v('FINAL TIME', '1'),
      v('g[DimA,DimC]', 'SUM(f[DimA!,DimC!])', { subscripts: ['_dima', '_dimc'] }),
      v('h[DimC]', '10,20,30', { subscripts: ['_c1'], separationDims: ['_dimc'] }),
      v('h[DimC]', '10,20,30', { subscripts: ['_c2'], separationDims: ['_dimc'] }),
      v('h[DimC]', '10,20,30', { subscripts: ['_c3'], separationDims: ['_dimc'] }),
      v('i', 'SUM(a[DimA!]+h[DimC!])'),
      v('INITIAL TIME', '0'),
      v('j[DimA]', 'a[DimA]/SUM(b[DimA!])', { subscripts: ['_dima'] }),
      v('k[SubA]', 'SUM(b 2[SubA!])', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('k[SubA]', 'SUM(b 2[SubA!])', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', { subscripts: ['_a2'], separationDims: ['_suba'] }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', { subscripts: ['_a3'], separationDims: ['_suba'] }),
      v('m[D1,E1]', '11', { subscripts: ['_d1', '_e1'] }),
      v('m[D1,E2]', '12', { subscripts: ['_d1', '_e2'] }),
      v('m[D2,E1]', '21', { subscripts: ['_d2', '_e1'] }),
      v('m[D2,E2]', '22', { subscripts: ['_d2', '_e2'] }),
      v('msum[DimD]', 'SUM(m[DimD,DimE!])', { subscripts: ['_dimd'] }),
      v('n[D1,E1,F1]', '111', { subscripts: ['_d1', '_e1', '_f1'] }),
      v('n[D1,E1,F2]', '112', { subscripts: ['_d1', '_e1', '_f2'] }),
      v('n[D1,E2,F1]', '121', { subscripts: ['_d1', '_e2', '_f1'] }),
      v('n[D1,E2,F2]', '122', { subscripts: ['_d1', '_e2', '_f2'] }),
      v('n[D2,E1,F1]', '211', { subscripts: ['_d2', '_e1', '_f1'] }),
      v('n[D2,E1,F2]', '212', { subscripts: ['_d2', '_e1', '_f2'] }),
      v('n[D2,E2,F1]', '221', { subscripts: ['_d2', '_e2', '_f1'] }),
      v('n[D2,E2,F2]', '222', { subscripts: ['_d2', '_e2', '_f2'] }),
      v('nsum[DimD,DimE]', 'SUM(n[DimD,DimE,DimF!])', { subscripts: ['_dimd', '_dime'] }),
      v('o[D1,DimE,F1]', '111', { subscripts: ['_d1', '_dime', '_f1'] }),
      v('o[D1,DimE,F2]', '112', { subscripts: ['_d1', '_dime', '_f2'] }),
      v('o[D2,DimE,F1]', '211', { subscripts: ['_d2', '_dime', '_f1'] }),
      v('o[D2,DimE,F2]', '212', { subscripts: ['_d2', '_dime', '_f2'] }),
      v('osum[DimD,DimE]', 'SUM(o[DimD,DimE,DimF!])', { subscripts: ['_dimd', '_dime'] }),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sumif" model', () => {
    const vars = readSubscriptsAndVariables('sumif')
    expect(vars).toEqual([
      v(
        'A Values Avg',
        'ZIDZ(SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,A Values[DimA!])),SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,1)))'
      ),
      v('A Values Total', 'SUM(A Values[DimA!])'),
      v('A Values[DimA]', '', { subscripts: ['_dima'] }),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "trend" model', () => {
    const vars = readSubscriptsAndVariables('trend')
    expect(vars).toEqual([
      v('average time', '6'),
      v('average value', 'INTEG((input-average value)/average time,input/(1+initial trend*average time))'),
      v('description', '0'),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('initial trend', '10'),
      v('input', '1+0.5*SIN(2*3.14159*Time/period)'),
      v('period', '20'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('TREND of input', 'TREND(input,average time,initial trend)'),
      v('trend1', 'ZIDZ(input-average value,average time*ABS(average value))'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "vector" model', () => {
    const vars = readSubscriptsAndVariables('vector')
    expect(vars).toEqual([
      v('a[DimA]', '0,1,1', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('a[DimA]', '0,1,1', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('a[DimA]', '0,1,1', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('ASCENDING', '1'),
      v('b[DimB]', '1,2', { subscripts: ['_b1'], separationDims: ['_dimb'] }),
      v('b[DimB]', '1,2', { subscripts: ['_b2'], separationDims: ['_dimb'] }),
      v('c[DimA]', '10+VECTOR ELM MAP(b[B1],a[DimA])', { subscripts: ['_dima'] }),
      v('d[A1,B1]', '1', { subscripts: ['_a1', '_b1'] }),
      v('d[A1,B2]', '4', { subscripts: ['_a1', '_b2'] }),
      v('d[A2,B1]', '2', { subscripts: ['_a2', '_b1'] }),
      v('d[A2,B2]', '5', { subscripts: ['_a2', '_b2'] }),
      v('d[A3,B1]', '3', { subscripts: ['_a3', '_b1'] }),
      v('d[A3,B2]', '6', { subscripts: ['_a3', '_b2'] }),
      v('DESCENDING', '0'),
      v('e[A1,B1]', '0', { subscripts: ['_a1', '_b1'] }),
      v('e[A1,B2]', '1', { subscripts: ['_a1', '_b2'] }),
      v('e[A2,B1]', '1', { subscripts: ['_a2', '_b1'] }),
      v('e[A2,B2]', '0', { subscripts: ['_a2', '_b2'] }),
      v('e[A3,B1]', '0', { subscripts: ['_a3', '_b1'] }),
      v('e[A3,B2]', '1', { subscripts: ['_a3', '_b2'] }),
      v('f[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],a[DimA])', { subscripts: ['_dima', '_dimb'] }),
      v('FINAL TIME', '1'),
      v('g[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],e[DimA,DimB])', { subscripts: ['_dima', '_dimb'] }),
      v('h[DimA]', '2100,2010,2020', { subscripts: ['_a1'], separationDims: ['_dima'] }),
      v('h[DimA]', '2100,2010,2020', { subscripts: ['_a2'], separationDims: ['_dima'] }),
      v('h[DimA]', '2100,2010,2020', { subscripts: ['_a3'], separationDims: ['_dima'] }),
      v('INITIAL TIME', '0'),
      v('l[DimA]', 'VECTOR SORT ORDER(h[DimA],ASCENDING)', { subscripts: ['_dima'] }),
      v('m[DimA]', 'VECTOR SORT ORDER(h[DimA],0)', { subscripts: ['_dima'] }),
      v('o[A1,B1]', '1', { subscripts: ['_a1', '_b1'] }),
      v('o[A1,B2]', '2', { subscripts: ['_a1', '_b2'] }),
      v('o[A2,B1]', '4', { subscripts: ['_a2', '_b1'] }),
      v('o[A2,B2]', '3', { subscripts: ['_a2', '_b2'] }),
      v('o[A3,B1]', '5', { subscripts: ['_a3', '_b1'] }),
      v('o[A3,B2]', '5', { subscripts: ['_a3', '_b2'] }),
      v('p[DimA,DimB]', 'VECTOR SORT ORDER(o[DimA,DimB],ASCENDING)', { subscripts: ['_dima', '_dimb'] }),
      v('q[DimB]', 'VECTOR SELECT(e[DimA!,DimB],c[DimA!],0,VSSUM,VSERRNONE)', { subscripts: ['_dimb'] }),
      v('r[DimA]', 'VECTOR SELECT(e[DimA,DimB!],d[DimA,DimB!],:NA:,VSMAX,VSERRNONE)', { subscripts: ['_dima'] }),
      v('s[DimB]', 'SUM(c[DimA!]*e[DimA!,DimB])', { subscripts: ['_dimb'] }),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('u', 'VMAX(x[DimX!])'),
      v('v', 'VMAX(x[SubX!])'),
      v('VSERRATLEASTONE', '1'),
      v('VSERRNONE', '0'),
      v('VSMAX', '3'),
      v('VSSUM', '0'),
      v('w', 'VMIN(x[DimX!])'),
      v('x[DimX]', '1,2,3,4,5', { subscripts: ['_one'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3,4,5', { subscripts: ['_two'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3,4,5', { subscripts: ['_three'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3,4,5', { subscripts: ['_four'], separationDims: ['_dimx'] }),
      v('x[DimX]', '1,2,3,4,5', { subscripts: ['_five'], separationDims: ['_dimx'] }),
      v('y[DimA]', 'VECTOR ELM MAP(x[three],(DimA-1))', { subscripts: ['_dima'] }),
      v('Time', '')
    ])
  })
})
