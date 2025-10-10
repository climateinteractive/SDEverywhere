import { describe, expect, it } from 'vitest'

import { canonicalName, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'
import { default as VariableImpl } from './variable'

import { parseVensimModel, sampleModelDir, type Variable } from '../_tests/test-support'

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

  return Model.variables.map(v => {
    // XXX: Strip out the new parsedEqn field, since we don't need it for comparing
    delete v.parsedEqn
    return v
  })
}

function v(lhs: string, formula: string, overrides?: Partial<Variable>): Variable {
  const variable = new VariableImpl()
  variable.modelLHS = lhs
  variable.modelFormula = formula
  variable.varName = canonicalName(lhs.split('[')[0])
  variable.varType = 'aux'
  variable.hasInitValue = false
  variable.includeInOutput = true
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      v('Initial Target Capacity', '100'),
      v('Production', '100+STEP(100,10)'),
      v('Target Capacity', 'ACTIVE INITIAL(Capacity*Utilization Adjustment,Initial Target Capacity)'),
      v('Utilization Adjustment', 'Capacity Utilization^Utilization Sensitivity'),
      v('Utilization Sensitivity', '1'),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "allocate" model', () => {
    const vars = readSubscriptsAndVariables('allocate')
    expect(vars).toEqual([
      v(
        'shipments[region]',
        'ALLOCATE AVAILABLE(demand[region],priority vector[region,ptype],total supply available)',
        {
          subscripts: ['_region']
        }
      ),
      v(
        'total supply available',
        'IF THEN ELSE(integer supply,INTEGER(Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME)),Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME))'
      ),
      v('integer supply', '0'),
      v('total demand', 'SUM(demand[region!])'),
      v('total shipments', 'SUM(shipments[region!])'),
      v('extra', '1'),
      v('priority[region]', '1,2,3', {
        separationDims: ['_region'],
        subscripts: ['_boston']
      }),
      v('priority[region]', '1,2,3', {
        separationDims: ['_region'],
        subscripts: ['_dayton']
      }),
      v('priority[region]', '1,2,3', {
        separationDims: ['_region'],
        subscripts: ['_fresno']
      }),
      v('Final Supply', '10'),
      v('Initial Supply', '0'),
      v('integer type', '0'),
      v('demand[region]', '3,2,4', {
        separationDims: ['_region'],
        subscripts: ['_boston']
      }),
      v('demand[region]', '3,2,4', {
        separationDims: ['_region'],
        subscripts: ['_dayton']
      }),
      v('demand[region]', '3,2,4', {
        separationDims: ['_region'],
        subscripts: ['_fresno']
      }),
      v('priority vector[region,ptype]', 'priority type+integer type', {
        subscripts: ['_region', '_ptype']
      }),
      v('priority vector[region,ppriority]', 'priority[region]', {
        subscripts: ['_region', '_ppriority']
      }),
      v('priority vector[region,pwidth]', 'priority width', {
        subscripts: ['_region', '_pwidth']
      }),
      v('priority vector[region,pextra]', 'extra', {
        subscripts: ['_region', '_pextra']
      }),
      v('priority width', '1'),
      v('priority type', '3'),
      v('FINAL TIME', '12'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '0.125'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "arrays" model', () => {
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
        subscripts: [`_d${d}`, `_a${a}`],
        separationDims: ['_dimd', '_dima']
      })
    }

    const zC1 = (a: number, b: number) => {
      return v(`z[C1,DimA,DimB]`, '110,111,112;120,121,122;130,131,132;', {
        subscripts: ['_c1', `_a${a}`, `_b${b}`],
        separationDims: ['_dima', '_dimb']
      })
    }

    const zC2 = (a: number, b: number) => {
      return v(`z[C2,DimA,DimB]`, '210,211,212;220,221,222;230,231,232;', {
        subscripts: ['_c2', `_a${a}`, `_b${b}`],
        separationDims: ['_dima', '_dimb']
      })
    }

    const vars = readSubscriptsAndVariables('arrays')
    expect(vars).toEqual([
      v('inputA[DimA]', '-1,+2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('inputA[DimA]', '-1,+2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('inputA[DimA]', '-1,+2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('a[DimA]', 'inputA[DimA]*10', {
        subscripts: ['_dima']
      }),
      v('b[DimA]', '42', {
        subscripts: ['_dima']
      }),
      v('c[DimA]', 'inputA[DimA]+a[DimA]', {
        subscripts: ['_dima']
      }),
      v('d[A1]', 'inputA[A1]*10', {
        subscripts: ['_a1']
      }),
      v('e[DimB]', 'inputA[DimA]*10', {
        subscripts: ['_dimb']
      }),
      v('inputAB[A1,B1]', '11', {
        subscripts: ['_a1', '_b1']
      }),
      v('inputAB[A1,B2]', '12', {
        subscripts: ['_a1', '_b2']
      }),
      v('inputAB[A1,B3]', '13', {
        subscripts: ['_a1', '_b3']
      }),
      v('inputAB[A2,B1]', '14', {
        subscripts: ['_a2', '_b1']
      }),
      v('inputAB[A2,B2]', '15', {
        subscripts: ['_a2', '_b2']
      }),
      v('inputAB[A2,B3]', '16', {
        subscripts: ['_a2', '_b3']
      }),
      v('inputAB[A3,B1]', '17', {
        subscripts: ['_a3', '_b1']
      }),
      v('inputAB[A3,B2]', '18', {
        subscripts: ['_a3', '_b2']
      }),
      v('inputAB[A3,B3]', '19', {
        subscripts: ['_a3', '_b3']
      }),
      v('f[DimA,DimB]', 'inputAB[DimA,DimB]*a[DimA]', {
        subscripts: ['_dima', '_dimb']
      }),
      v('g[DimB]', 'INTEG(a[DimA],e[DimB])', {
        subscripts: ['_dimb']
      }),
      v('h', 'SUM(a[DimA!])+1'),
      v('o[DimB]', 'SUM(inputAB[DimA!,DimB])', {
        subscripts: ['_dimb']
      }),
      v('p[DimA]', 'SUM(inputAB[DimA,DimB!])', {
        subscripts: ['_dima']
      }),
      v('r[DimA,DimB]', 'inputAB[DimA,DimB]*g[DimB]', {
        subscripts: ['_dima', '_dimb']
      }),
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
      sc(1, 1),
      sc(1, 2),
      sc(1, 3),
      sc(2, 1),
      sc(2, 2),
      sc(2, 3),
      sc(3, 1),
      sc(3, 2),
      sc(3, 3),
      v('s1d[DimA]', '1', {
        subscripts: ['_dima']
      }),
      v('s1i[A1]', '1', {
        subscripts: ['_a1']
      }),
      v('s2dd[DimA,DimB]', '1', {
        subscripts: ['_dima', '_dimb']
      }),
      v('s2di[DimA,B1]', '1', {
        subscripts: ['_dima', '_b1']
      }),
      v('s2id[A1,DimB]', '1', {
        subscripts: ['_a1', '_dimb']
      }),
      v('s2ii[A1,B1]', '1', {
        subscripts: ['_a1', '_b1']
      }),
      v('s3ddd[DimA,DimB,DimC]', '1', {
        subscripts: ['_dima', '_dimb', '_dimc']
      }),
      v('s3ddi[DimA,DimB,C1]', '1', {
        subscripts: ['_dima', '_dimb', '_c1']
      }),
      v('s3did[DimA,B1,DimC]', '1', {
        subscripts: ['_dima', '_b1', '_dimc']
      }),
      v('s3dii[DimA,B1,C1]', '1', {
        subscripts: ['_dima', '_b1', '_c1']
      }),
      v('s3idd[A1,DimB,DimC]', '1', {
        subscripts: ['_a1', '_dimb', '_dimc']
      }),
      v('s3idi[A1,DimB,C1]', '1', {
        subscripts: ['_a1', '_dimb', '_c1']
      }),
      v('s3iid[A1,B1,DimC]', '1', {
        subscripts: ['_a1', '_b1', '_dimc']
      }),
      v('s3iii[A1,B1,C1]', '1', {
        subscripts: ['_a1', '_b1', '_c1']
      }),
      v('t[SubA]', '1', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('t[SubA]', '1', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('u[SubA]', '1,2', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('u[SubA]', '1,2', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('v[DimA,B1]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a1', '_b1']
      }),
      v('v[DimA,B1]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a2', '_b1']
      }),
      v('v[DimA,B1]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a3', '_b1']
      }),
      v('w[A1,DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1']
      }),
      v('w[A1,DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2']
      }),
      v('w[A1,DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b3']
      }),
      v('x[DimX]', '1,2,3', {
        separationDims: ['_dimx'],
        subscripts: ['_a2']
      }),
      v('x[DimX]', '1,2,3', {
        separationDims: ['_dimx'],
        subscripts: ['_a3']
      }),
      v('x[DimX]', '1,2,3', {
        separationDims: ['_dimx'],
        subscripts: ['_a1']
      }),
      y(1, 1),
      y(1, 2),
      y(1, 3),
      y(2, 1),
      y(2, 2),
      y(2, 3),
      y(3, 1),
      y(3, 2),
      y(3, 3),
      y(4, 1),
      y(4, 2),
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
      v('ndim4[DimA,DimB,DimC,DimD]', '4', {
        subscripts: ['_dima', '_dimb', '_dimc', '_dimd']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delay" model', () => {
    const vars = readSubscriptsAndVariables('delay')
    expect(vars).toEqual([
      v('input', 'STEP(10,0)-STEP(10,4)'),
      v('delay', '5'),
      v('init 1', '0'),
      v('input a[DimA]', '10,20,30', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('input a[DimA]', '10,20,30', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('input a[DimA]', '10,20,30', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('delay a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('delay a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('delay a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('init a[DimA]', '0', {
        subscripts: ['_dima']
      }),
      v('input 2[SubA]', '20,30', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('input 2[SubA]', '20,30', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('delay 2', '5'),
      v('init 2[SubA]', '0', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('init 2[SubA]', '0', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('k', '42'),
      v('d1', 'DELAY1(input,delay)'),
      v('d2[DimA]', 'DELAY1I(input a[DimA],delay,init 1)', {
        subscripts: ['_dima']
      }),
      v('d3[DimA]', 'DELAY1I(input,delay a[DimA],init 1)', {
        subscripts: ['_dima']
      }),
      v('d4[DimA]', 'DELAY1I(input,delay,init a[DimA])', {
        subscripts: ['_dima']
      }),
      v('d5[DimA]', 'DELAY1I(input a[DimA],delay a[DimA],init a[DimA])', {
        subscripts: ['_dima']
      }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('d7', 'DELAY3(input,delay)'),
      v('d8[DimA]', 'DELAY3(input,delay a[DimA])', {
        subscripts: ['_dima']
      }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('d10', 'k*DELAY3(input,delay)'),
      v('d11[DimA]', 'k*DELAY3(input,delay a[DimA])', {
        subscripts: ['_dima']
      }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '10'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delayfixed" model', () => {
    const vars = readSubscriptsAndVariables('delayfixed')
    expect(vars).toEqual([
      v('receiving', 'DELAY FIXED(shipping,shipping time,shipping)'),
      v('shipping', 'STEP(reference shipping rate,10)-STEP(reference shipping rate,20)'),
      v('shipping time', '20'),
      v('reference shipping rate', '1'),
      v('shipments in transit', 'INTEG(shipping-receiving,shipping*shipping time)'),
      v('input[A1]', '10*TIME', {
        subscripts: ['_a1']
      }),
      v('input[A2]', '20*TIME', {
        subscripts: ['_a2']
      }),
      v('input[A3]', '30*TIME', {
        subscripts: ['_a3']
      }),
      v('output[DimA]', 'DELAY FIXED(input[DimA],1,0)', {
        subscripts: ['_dima']
      }),
      v('a delay time', '0'),
      v('a', 'DELAY FIXED(input[A1]+1,a delay time,0)'),
      v('b delay time', '1'),
      v('b', 'DELAY FIXED(input[A1]+1,b delay time,0)'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '50'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "delayfixed2" model', () => {
    const vars = readSubscriptsAndVariables('delayfixed2')
    expect(vars).toEqual([
      v('input1', '10*TIME+10'),
      v('output1', 'DELAY FIXED(input1,1,0)'),
      v('input2', '10*TIME+10'),
      v('output2', 'DELAY FIXED(input2,5,0)'),
      v('INITIAL TIME', '10'),
      v('FINAL TIME', '20'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "depreciate" model', () => {
    const vars = readSubscriptsAndVariables('depreciate')
    expect(vars).toEqual([
      v('dtime', '20'),
      v('Capacity Cost', '1e+06'),
      v('New Capacity', 'IF THEN ELSE(Time=2022,1000,IF THEN ELSE(Time=2026,2500,0))'),
      v('str', 'Capacity Cost*New Capacity'),
      v('Depreciated Amount', 'DEPRECIATE STRAIGHTLINE(str,dtime,1,0)'),
      v('FINAL TIME', '2050'),
      v('INITIAL TIME', '2020'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directconst" model', () => {
    const vars = readSubscriptsAndVariables('directconst')
    expect(vars).toEqual([
      v('a', "GET DIRECT CONSTANTS('data/a.csv',',','B2')"),
      v('a from named xlsx', "GET DIRECT CONSTANTS('data/a.xlsx','a','B2')"),
      v('a from tagged xlsx', "GET DIRECT CONSTANTS('?a','a','B2')"),
      v('b[DimB]', "GET DIRECT CONSTANTS('data/b.csv',',','b2*')", {
        subscripts: ['_dimb']
      }),
      v('c[DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        subscripts: ['_dimb', '_dimc']
      }),
      v('d[D1,DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        subscripts: ['_d1', '_dimb', '_dimc']
      }),
      v('e[DimC,DimB]', "GET DIRECT CONSTANTS('data/c.csv',',','B2*')", {
        subscripts: ['_dimc', '_dimb']
      }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        separationDims: ['_suba'],
        subscripts: ['_dimc', '_a2']
      }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        separationDims: ['_suba'],
        subscripts: ['_dimc', '_a3']
      }),
      v('f[DimC,DimA]:EXCEPT:[DimC,SubA]', '0', {
        separationDims: ['_dima'],
        subscripts: ['_dimc', '_a1']
      }),
      v('g[From DimC,To DimC]', "GET DIRECT CONSTANTS('data/g.csv',',','B2')", {
        subscripts: ['_from_dimc', '_to_dimc']
      }),
      v('h', "GET DIRECT CONSTANTS('data/h.csv',',','B5')"),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directdata" model', () => {
    const vars = readSubscriptsAndVariables('directdata')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT DATA('data.xlsx','A Data','A','B2')", {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a[DimA]', "GET DIRECT DATA('data.xlsx','A Data','A','B2')", {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('b[DimA]', 'a[DimA]*10', {
        subscripts: ['_dima']
      }),
      v('c', "GET DIRECT DATA('?data','C Data','a','b2')"),
      v('d', 'c*10'),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('f[DimA]', 'e[DimA]*10', {
        subscripts: ['_dima']
      }),
      v('g', "GET DIRECT DATA('g_data.csv',',','A','B2')"),
      v('h', 'g*10'),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1']
      }),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2']
      }),
      v('j[A1,DimB]', 'i[A1,DimB]', {
        subscripts: ['_a1', '_dimb']
      }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1']
      }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2']
      }),
      v('k[A2,DimB]', '0', {
        subscripts: ['_a2', '_dimb']
      }),
      v('l[DimA,DimB]', 'k[DimA,DimB]', {
        subscripts: ['_dima', '_dimb']
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m1']
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m2']
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m3']
      }),
      v('n', 'm[M2]'),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m1']
      }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m2']
      }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        separationDims: ['_dimm'],
        subscripts: ['_m3']
      }),
      v('p', 'o[M2]'),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_subm'],
        subscripts: ['_m2']
      }),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        separationDims: ['_subm'],
        subscripts: ['_m3']
      }),
      v('r', 'q[M3]'),
      v('INITIAL TIME', '1990'),
      v('FINAL TIME', '2050'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "directlookups" model', () => {
    const vars = readSubscriptsAndVariables('directlookups')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT LOOKUPS('lookups.CSV',',','1','e2')", {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookups.CSV',',','1','e2')", {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookups.CSV',',','1','e2')", {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('a from named xlsx[DimA]', "GET DIRECT LOOKUPS('lookups.xlsx','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a from named xlsx[DimA]', "GET DIRECT LOOKUPS('lookups.xlsx','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a from named xlsx[DimA]', "GET DIRECT LOOKUPS('lookups.xlsx','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('a from tagged xlsx[DimA]', "GET DIRECT LOOKUPS('?lookups','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a from tagged xlsx[DimA]', "GET DIRECT LOOKUPS('?lookups','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a from tagged xlsx[DimA]', "GET DIRECT LOOKUPS('?lookups','a','1','E2')", {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('b', 'a[A1](Time)'),
      v('b from named xlsx', 'a from named xlsx[A1](Time)'),
      v('b from tagged xlsx', 'a from tagged xlsx[A1](Time)'),
      v('c', 'LOOKUP INVERT(a[A1],0.5)'),
      v('d', 'LOOKUP FORWARD(a[A1],2028.1)'),
      v('e', 'LOOKUP FORWARD(a[A1],2028)'),
      v('f', 'a[A1](2028.1)'),
      v('g', ''),
      v('h', 'LOOKUP FORWARD(g,1)'),
      v('INITIAL TIME', '2020'),
      v('FINAL TIME', '2050'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
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
      v('b[DimA]', '10*ELMCOUNT(DimA)+a', {
        subscripts: ['_dima']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "except" model', () => {
    const vars = readSubscriptsAndVariables('except')
    expect(vars).toEqual([
      v('a[DimA]', '1', {
        subscripts: ['_dima']
      }),
      v('b[SubA]', '2', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('b[SubA]', '2', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('c[DimA,DimC]', '3', {
        subscripts: ['_dima', '_dimc']
      }),
      v('d[SubA,C1]', '4', {
        separationDims: ['_suba'],
        subscripts: ['_a2', '_c1']
      }),
      v('d[SubA,C1]', '4', {
        separationDims: ['_suba'],
        subscripts: ['_a3', '_c1']
      }),
      v('e[DimA,SubC]', '5', {
        separationDims: ['_subc'],
        subscripts: ['_dima', '_c2']
      }),
      v('e[DimA,SubC]', '5', {
        separationDims: ['_subc'],
        subscripts: ['_dima', '_c3']
      }),
      v('f[A1,C1]', '6', {
        subscripts: ['_a1', '_c1']
      }),
      v('g[DimA]:EXCEPT:[A1]', '7', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('g[DimA]:EXCEPT:[A1]', '7', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('h[DimA]:EXCEPT:[SubA]', '8', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('j[DimD]', '10,20', {
        separationDims: ['_dimd'],
        subscripts: ['_d1']
      }),
      v('j[DimD]', '10,20', {
        separationDims: ['_dimd'],
        subscripts: ['_d2']
      }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('o[SubA]:EXCEPT:[SubA2]', '9', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c2']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c3']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c1']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c2']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c3']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c1']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c2']
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c3']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c1']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c2']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c3']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c1']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c3']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c1']
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c3']
      }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', {
        separationDims: ['_dimc'],
        subscripts: ['_dima', '_c2']
      }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', {
        separationDims: ['_dimc'],
        subscripts: ['_dima', '_c3']
      }),
      v('s[A3]', '13', {
        subscripts: ['_a3']
      }),
      v('s[SubA]:EXCEPT:[A3]', '14', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('t[SubA,SubC]', '15', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c2']
      }),
      v('t[SubA,SubC]', '15', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c3']
      }),
      v('t[SubA,SubC]', '15', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c2']
      }),
      v('t[SubA,SubC]', '15', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c3']
      }),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('w[DimA]:EXCEPT:[SubA]', 'a[DimA]', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('x[DimA]:EXCEPT:[SubA]', 'c[DimA,C1]', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c2']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c3']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c2']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f1', '_g1']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f1', '_g2']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f2', '_g1']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f2', '_g2']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f1', '_g1']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f1', '_g2']
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f2', '_g1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g1', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g1', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g2', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g2', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g1', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g1', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g2', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g2', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g1', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g1', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g2', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g2', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g1', '_h1']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g1', '_h2']
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g2', '_h1']
      }),
      v('input', '0'),
      v('z ref a', '25'),
      v('z ref b', '5'),
      v('z[SubA]', 'z ref a*z ref b', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('z[SubA]', 'z ref a*z ref b', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('z[DimA]:EXCEPT:[SubA]', '10', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('z total', 'SUM(z[SubA!])'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('SAVEPER', '1'),
      v('TIME STEP', '1'),
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
      v('Simple 1', '', {
        varType: 'data'
      }),
      v('Simple 2', '', {
        varType: 'data'
      }),
      v('A Values[DimA]', '', {
        subscripts: ['_dima']
      }),
      v('BC Values[DimB,DimC]', '', {
        subscripts: ['_dimb', '_dimc']
      }),
      v('D Values[DimD]', '', {
        subscripts: ['_dimd']
      }),
      v('E Values[E1]', '', {
        subscripts: ['_e1']
      }),
      v('E Values[E2]', '', {
        subscripts: ['_e2']
      }),
      v('EBC Values[DimE,DimB,DimC]', '', {
        subscripts: ['_dime', '_dimb', '_dimc']
      }),
      v('Simple Totals', 'Simple 1+Simple 2'),
      v('A Totals', 'SUM(A Values[DimA!])'),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])'),
      v('D Totals', 'SUM(D Values[DimD!])'),
      v('E1 Values', 'E Values[E1]'),
      v('E2 Values', 'E Values[E2]'),
      v('Chosen E', '2'),
      v('Chosen B', '3'),
      v('Chosen C', '1'),
      v('E Selection[DimE]', 'IF THEN ELSE(DimE=Chosen E,1,0)', {
        subscripts: ['_dime']
      }),
      v('B Selection[DimB]', 'IF THEN ELSE(DimB=Chosen B,1,0)', {
        subscripts: ['_dimb']
      }),
      v('C Selection[DimC]', 'IF THEN ELSE(DimC=Chosen C,1,0)', {
        subscripts: ['_dimc']
      }),
      v(
        'Total EBC for Selected C[DimE,DimB]',
        'VECTOR SELECT(C Selection[DimC!],EBC Values[DimE,DimB,DimC!],0,VSSUM,VSERRATLEASTONE)',
        {
          subscripts: ['_dime', '_dimb']
        }
      ),
      v(
        'Total EBC for Selected BC[DimE]',
        'VECTOR SELECT(B Selection[DimB!],Total EBC for Selected C[DimE,DimB!],0,VSSUM,VSERRATLEASTONE)',
        {
          subscripts: ['_dime']
        }
      ),
      v('Total EBC', 'VECTOR SELECT(E Selection[DimE!],Total EBC for Selected BC[DimE!],0,VSSUM,VSERRATLEASTONE)'),
      v('VSERRATLEASTONE', '1'),
      v('VSSUM', '0'),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
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
      v('Period', '20'),
      v('x', 'amplitude*COS(6.28*Time/Period)'),
      v('relative x', 'x/INITIAL x'),
      v('INITIAL x', 'INITIAL(x)'),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "interleaved" model', () => {
    const vars = readSubscriptsAndVariables('interleaved')
    expect(vars).toEqual([
      v('x', '1'),
      v('a[A1]', 'x', {
        subscripts: ['_a1']
      }),
      v('a[A2]', 'y', {
        subscripts: ['_a2']
      }),
      v('y', 'a[A1]'),
      v('b[DimA]', 'a[DimA]', {
        subscripts: ['_dima']
      }),
      v('FINAL TIME', '100'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "longeqns" model', () => {
    const vars = readSubscriptsAndVariables('longeqns')
    expect(vars).toEqual([
      v('EqnA[DimX,DimY]', '1', { subscripts: ['_dimx', '_dimy'] }),
      v('EqnB[DimX,DimW]', '1', { subscripts: ['_dimx', '_dimw'] }),
      v(
        'EqnC[DimX,DimY,DimZ]',
        'EqnA[DimX,DimY]*(-SUM(EqnB[DimX,DimW\n!])-(SUM(EqnB[DimX,DimW!])-SUM(EqnB[DimX,DimW\n!]))*EqnA[DimX,DimY])',
        { subscripts: ['_dimx', '_dimy', '_dimz'] }
      ),
      v('Result', 'EqnC[X1,Y1,Z1]'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "lookup" model', () => {
    const vars = readSubscriptsAndVariables('lookup')
    expect(vars).toEqual([
      v('a', ''),
      v('b', 'a(i)'),
      v('i', 'Time/10'),
      v('c[A1]', '', {
        subscripts: ['_a1']
      }),
      v('c[A2]', '', {
        subscripts: ['_a2']
      }),
      v('c[A3]', '', {
        subscripts: ['_a3']
      }),
      v('d', 'WITH LOOKUP(i,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))'),
      v('e[DimA]', 'c[DimA](i)', {
        subscripts: ['_dima']
      }),
      v('f', 'c[A1](i)'),
      v('g', ''),
      v('g at minus 1 forward', 'LOOKUP FORWARD(g,-1)'),
      v('g at 0 forward', 'LOOKUP FORWARD(g,0)'),
      v('g at 0pt5 forward', 'LOOKUP FORWARD(g,0.5)'),
      v('g at 1pt0 forward', 'LOOKUP FORWARD(g,1.0)'),
      v('g at 1pt5 forward', 'LOOKUP FORWARD(g,1.5)'),
      v('g at 2pt0 forward', 'LOOKUP FORWARD(g,2.0)'),
      v('g at 2pt5 forward', 'LOOKUP FORWARD(g,2.5)'),
      v('g at minus 1 backward', 'LOOKUP BACKWARD(g,-1)'),
      v('g at 0 backward', 'LOOKUP BACKWARD(g,0)'),
      v('g at 0pt5 backward', 'LOOKUP BACKWARD(g,0.5)'),
      v('g at 1pt0 backward', 'LOOKUP BACKWARD(g,1.0)'),
      v('g at 1pt5 backward', 'LOOKUP BACKWARD(g,1.5)'),
      v('g at 2pt0 backward', 'LOOKUP BACKWARD(g,2.0)'),
      v('g at 2pt5 backward', 'LOOKUP BACKWARD(g,2.5)'),
      v('withlookup at minus 1', 'WITH LOOKUP(-1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 0', 'WITH LOOKUP(0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 0pt5', 'WITH LOOKUP(0.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 1pt0', 'WITH LOOKUP(1.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 1pt5', 'WITH LOOKUP(1.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 2pt0', 'WITH LOOKUP(2.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('withlookup at 2pt5', 'WITH LOOKUP(2.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "mapping" model', () => {
    const vars = readSubscriptsAndVariables('mapping')
    expect(vars).toEqual([
      v('b[DimB]', '1,2', {
        separationDims: ['_dimb'],
        subscripts: ['_b1']
      }),
      v('b[DimB]', '1,2', {
        separationDims: ['_dimb'],
        subscripts: ['_b2']
      }),
      v('a[DimA]', 'b[DimB]*10', {
        subscripts: ['_dima']
      }),
      v('c[DimC]', '1,2,3', {
        separationDims: ['_dimc'],
        subscripts: ['_c1']
      }),
      v('c[DimC]', '1,2,3', {
        separationDims: ['_dimc'],
        subscripts: ['_c2']
      }),
      v('c[DimC]', '1,2,3', {
        separationDims: ['_dimc'],
        subscripts: ['_c3']
      }),
      v('d[DimD]', 'c[DimC]*10', {
        subscripts: ['_dimd']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "multimap" model', () => {
    const vars = readSubscriptsAndVariables('multimap')
    expect(vars).toEqual([
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('b[DimB]', 'a[DimA]', {
        subscripts: ['_dimb']
      }),
      v('c[DimC]', 'a[DimA]', {
        subscripts: ['_dimc']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('SAVEPER', '1'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "npv" model', () => {
    const vars = readSubscriptsAndVariables('npv')
    expect(vars).toEqual([
      v('investment', '100'),
      v('start time', '12'),
      v('revenue', '3'),
      v('interest rate', '10'),
      v('stream', '-investment/TIME STEP*PULSE(start time,TIME STEP)+STEP(revenue,start time)'),
      v('discount rate', 'interest rate/12/100'),
      v('init val', '0'),
      v('factor', '1'),
      v('NPV vs initial time', 'NPV(stream,discount rate,init val,factor)'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '100'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "power" model', () => {
    const vars = readSubscriptsAndVariables('power')
    expect(vars).toEqual([
      v('base', '2'),
      v('a', 'POWER(base,2)'),
      v('b', 'POWER(base,0.5)'),
      v('c', 'POWER(base,1.5)'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
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
      v('Simple 1', '', {
        varType: 'data'
      }),
      v('Simple 2', '', {
        varType: 'data'
      }),
      v('A Values[DimA]', '', {
        subscripts: ['_dima']
      }),
      v('BC Values[DimB,DimC]', '', {
        subscripts: ['_dimb', '_dimc']
      }),
      v('D Values[DimD]', '', {
        subscripts: ['_dimd']
      }),
      v('E Values[E1]', '', {
        subscripts: ['_e1']
      }),
      v('E Values[E2]', '', {
        subscripts: ['_e2']
      }),
      v('Look1', ''),
      v('Look2', ''),
      v('Input 1', '10'),
      v('Input 2', '20'),
      v('Input 3', '30'),
      v('Simple Totals', 'Simple 1+Simple 2'),
      v('A Totals', 'SUM(A Values[DimA!])'),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])'),
      v('D Totals', 'SUM(D Values[DimD!])'),
      v('E1 Values', 'E Values[E1]'),
      v('E2 Values', 'E Values[E2]'),
      v('Input 1 and 2 Total', 'Input 1+Input 2'),
      v('Input 2 and 3 Total', 'Input 2+Input 3'),
      v('Look1 Value at t1', 'Look1(1)'),
      v('Look2 Value at t1', 'Look2(1)'),
      v('With Look1 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('With Look2 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))'),
      v('Constant Partial 1', '1'),
      v('Constant Partial 2', '2'),
      v('Initial Partial[C1]', 'INITIAL(Constant Partial 1)', {
        subscripts: ['_c1']
      }),
      v('Initial Partial[C2]', 'INITIAL(Constant Partial 2)', {
        subscripts: ['_c2']
      }),
      v('Partial[C2]', 'Initial Partial[C2]', {
        subscripts: ['_c2']
      }),
      v('Test 1 T', '1'),
      v('Test 1 F', '2'),
      v('Test 1 Result', 'IF THEN ELSE(Input 1=10,Test 1 T,Test 1 F)'),
      v('Test 2 T', '1'),
      v('Test 2 F', '2'),
      v('Test 2 Result', 'IF THEN ELSE(0,Test 2 T,Test 2 F)'),
      v('Test 3 T', '1'),
      v('Test 3 F', '2'),
      v('Test 3 Result', 'IF THEN ELSE(1,Test 3 T,Test 3 F)'),
      v('Test 4 Cond', '0'),
      v('Test 4 T', '1'),
      v('Test 4 F', '2'),
      v('Test 4 Result', 'IF THEN ELSE(Test 4 Cond,Test 4 T,Test 4 F)'),
      v('Test 5 Cond', '1'),
      v('Test 5 T', '1'),
      v('Test 5 F', '2'),
      v('Test 5 Result', 'IF THEN ELSE(Test 5 Cond,Test 5 T,Test 5 F)'),
      v('Test 6 Cond', '0'),
      v('Test 6 T', '1'),
      v('Test 6 F', '2'),
      v('Test 6 Result', 'IF THEN ELSE(Test 6 Cond=1,Test 6 T,Test 6 F)'),
      v('Test 7 Cond', '1'),
      v('Test 7 T', '1'),
      v('Test 7 F', '2'),
      v('Test 7 Result', 'IF THEN ELSE(Test 7 Cond=1,Test 7 T,Test 7 F)'),
      v('Test 8 Cond', '0'),
      v('Test 8 T', '1'),
      v('Test 8 F', '2'),
      v('Test 8 Result', 'IF THEN ELSE(Test 8 Cond>0,Test 8 T,Test 8 F)'),
      v('Test 9 Cond', '1'),
      v('Test 9 T', '1'),
      v('Test 9 F', '2'),
      v('Test 9 Result', 'IF THEN ELSE(Test 9 Cond>0,Test 9 T,Test 9 F)'),
      v('Test 10 Cond', '1'),
      v('Test 10 T', '1'),
      v('Test 10 F', '2'),
      v('Test 10 Result', 'IF THEN ELSE(ABS(Test 10 Cond),Test 10 T,Test 10 F)'),
      v('Test 11 Cond', '0'),
      v('Test 11 T', '1'),
      v('Test 11 F', '2'),
      v('Test 11 Result', 'IF THEN ELSE(Test 11 Cond:AND:ABS(Test 11 Cond),Test 11 T,Test 11 F)'),
      v('Test 12 Cond', '1'),
      v('Test 12 T', '1'),
      v('Test 12 F', '2'),
      v('Test 12 Result', 'IF THEN ELSE(Test 12 Cond:OR:ABS(Test 12 Cond),Test 12 T,Test 12 F)'),
      v('Test 13 Cond', '1'),
      v('Test 13 T1', '1'),
      v('Test 13 T2', '7'),
      v('Test 13 F', '2'),
      v('Test 13 Result', 'IF THEN ELSE(Test 13 Cond,Test 13 T1+Test 13 T2,Test 13 F)*10.0'),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "pulsetrain" model', () => {
    const vars = readSubscriptsAndVariables('pulsetrain')
    expect(vars).toEqual([
      v('p', 'PULSE TRAIN(first pulse time,duration,repeat interval,last pulse time)'),
      v('first pulse time', '10'),
      v('duration', '1'),
      v('repeat interval', '5'),
      v('last pulse time', '30'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '40'),
      v('TIME STEP', '0.25'),
      v('SAVEPER', 'TIME STEP'),
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
      v('g', 'QUANTUM(423,63)'),
      v('h', 'QUANTUM(10,10)'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "ref" model', () => {
    const vars = readSubscriptsAndVariables('ref')
    expect(vars).toEqual([
      v('ecc[t1]', 'ce[t1]+1', {
        subscripts: ['_t1']
      }),
      v('ecc[tNext]', 'ce[tNext]+1', {
        separationDims: ['_tnext'],
        subscripts: ['_t2']
      }),
      v('ecc[tNext]', 'ce[tNext]+1', {
        separationDims: ['_tnext'],
        subscripts: ['_t3']
      }),
      v('ce[t1]', '1', {
        subscripts: ['_t1']
      }),
      v('ce[tNext]', 'ecc[tPrev]+1', {
        separationDims: ['_tnext'],
        subscripts: ['_t2']
      }),
      v('ce[tNext]', 'ecc[tPrev]+1', {
        separationDims: ['_tnext'],
        subscripts: ['_t3']
      }),
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
      v('G', 'INTEG(rate,2*COS(scale))'),
      v('rate', 'STEP(10,10)'),
      v('scale', '1'),
      v('switch', '1'),
      v('FINAL TIME', '10'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sir" model', () => {
    const vars = readSubscriptsAndVariables('sir')
    expect(vars).toEqual([
      v('Infectious Population I', 'INTEG(Infection Rate-Recovery Rate,1)'),
      v('Initial Contact Rate', '2.5'),
      v('Contact Rate c', 'Initial Contact Rate'),
      v(
        'Reproduction Rate',
        'Contact Rate c*Infectivity i*Average Duration of Illness d*Susceptible Population S/Total Population P'
      ),
      v('Total Population P', '10000'),
      v(
        'Infection Rate',
        'Contact Rate c*Infectivity i*Susceptible Population S*Infectious Population I/Total Population P'
      ),
      v('Average Duration of Illness d', '2'),
      v('Recovered Population R', 'INTEG(Recovery Rate,0)'),
      v('Recovery Rate', 'Infectious Population I/Average Duration of Illness d'),
      v('Infectivity i', '0.25'),
      v(
        'Susceptible Population S',
        'INTEG(-Infection Rate,Total Population P-Infectious Population I-Recovered Population R)'
      ),
      v('FINAL TIME', '200'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', '2'),
      v('TIME STEP', '0.0625'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "smooth" model', () => {
    const vars = readSubscriptsAndVariables('smooth')
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)'),
      v('input 2[SubA]', '3+PULSE(10,10)', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('input 2[SubA]', '3+PULSE(10,10)', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('input 3[DimA]', '3+PULSE(10,10)', {
        subscripts: ['_dima']
      }),
      v('input 3x3[DimA,DimB]', '3+PULSE(10,10)', {
        subscripts: ['_dima', '_dimb']
      }),
      v('input 2x3[SubA,DimB]', '3+PULSE(10,10)', {
        separationDims: ['_suba'],
        subscripts: ['_a2', '_dimb']
      }),
      v('input 2x3[SubA,DimB]', '3+PULSE(10,10)', {
        separationDims: ['_suba'],
        subscripts: ['_a3', '_dimb']
      }),
      v('delay', '2'),
      v('delay 2[SubA]', '2', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('delay 2[SubA]', '2', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('delay 3[DimA]', '2', {
        subscripts: ['_dima']
      }),
      v('initial s', '50'),
      v('initial s with subscripts[DimA]', '50', {
        subscripts: ['_dima']
      }),
      v('s1', 'SMOOTH(input,delay)'),
      v('s2[DimA]', 'SMOOTH(input,delay)', {
        subscripts: ['_dima']
      }),
      v('s3[DimA]', 'SMOOTH(input 3[DimA],delay 3[DimA])', {
        subscripts: ['_dima']
      }),
      v('s4[SubA]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('s4[SubA]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('s5[SubA]', 'SMOOTH3(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('s5[SubA]', 'SMOOTH3(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('s6[DimB]', 'SMOOTH(input 3[DimA],delay 3[DimA])', {
        subscripts: ['_dimb']
      }),
      v('s7[SubB]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_subb'],
        subscripts: ['_b2']
      }),
      v('s7[SubB]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        separationDims: ['_subb'],
        subscripts: ['_b3']
      }),
      v('s8[DimA,DimB]', 'SMOOTH(input 3x3[DimA,DimB],delay)', {
        subscripts: ['_dima', '_dimb']
      }),
      v('s9[SubA,DimB]', 'SMOOTH(input 2x3[SubA,DimB],delay)', {
        separationDims: ['_suba'],
        subscripts: ['_a2', '_dimb']
      }),
      v('s9[SubA,DimB]', 'SMOOTH(input 2x3[SubA,DimB],delay)', {
        separationDims: ['_suba'],
        subscripts: ['_a3', '_dimb']
      }),
      v('s10[SubA,B1]', 'SMOOTH(input 2[SubA],delay)', {
        separationDims: ['_suba'],
        subscripts: ['_a2', '_b1']
      }),
      v('s10[SubA,B1]', 'SMOOTH(input 2[SubA],delay)', {
        separationDims: ['_suba'],
        subscripts: ['_a3', '_b1']
      }),
      v('s11[DimA]', 'SMOOTH3(input 3[DimA],delay)', {
        subscripts: ['_dima']
      }),
      v('s12[DimA]', 'SMOOTH3I(input 3[DimA],delay 3[DimA],initial s)', {
        subscripts: ['_dima']
      }),
      v('s13[DimA]', 'SMOOTH3I(input 3[DimA],delay,initial s)', {
        subscripts: ['_dima']
      }),
      v('s14[DimA]', 'SMOOTH3I(input 3[DimA],delay,initial s with subscripts[DimA])', {
        subscripts: ['_dima']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '40'),
      v('SAVEPER', '1'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "smooth3" model', () => {
    const vars = readSubscriptsAndVariables('smooth3')
    expect(vars).toEqual([
      v('a', '1'),
      v('S3', 'SMOOTH3(s3 input,MAX(a,b))'),
      v('b', '2'),
      v('s3 input', '3+PULSE(10,10)'),
      v('apt', '1'),
      v('ca[A1]', '1000+RAMP(100,1,10)', {
        subscripts: ['_a1']
      }),
      v('ca[A2]', '1000+RAMP(300,1,10)', {
        subscripts: ['_a2']
      }),
      v('ca[A3]', '1000+RAMP(600,1,10)', {
        subscripts: ['_a3']
      }),
      v('cs[DimA]', 'MIN(SMOOTH3(sr,apt),ca[DimA]/TIME STEP)', {
        subscripts: ['_dima']
      }),
      v('sr', 'COS(Time/5)'),
      v('S2 Level 1', 'INTEG((input-S2 Level 1)/S2 Delay,input)'),
      v('S2', 'scale*S2 Level 3'),
      v('S2 Level 3', 'INTEG((S2 Level 2-S2 Level 3)/S2 Delay,input)'),
      v('S2 Level 2', 'INTEG((S2 Level 1-S2 Level 2)/S2 Delay,input)'),
      v('S2 Delay', 'delay/3'),
      v('delay', '2'),
      v('input', '3+PULSE(10,10)'),
      v('S1', 'scale*SMOOTH3(input,delay)'),
      v('scale', '6'),
      v('FINAL TIME', '40'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "specialchars" model', () => {
    const vars = readSubscriptsAndVariables('specialchars')
    expect(vars).toEqual([
      v('DOLLAR SIGN$', '1'),
      v("time's up", '2'),
      v('"M&Ms"', '3'),
      v('"100% true"', '4'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "subalias" model', () => {
    const vars = readSubscriptsAndVariables('subalias')
    expect(vars).toEqual([
      v('e[DimE]', '10,20,30', {
        separationDims: ['_dime'],
        subscripts: ['_f1']
      }),
      v('e[DimE]', '10,20,30', {
        separationDims: ['_dime'],
        subscripts: ['_f2']
      }),
      v('e[DimE]', '10,20,30', {
        separationDims: ['_dime'],
        subscripts: ['_f3']
      }),
      v('f[DimF]', '1,2,3', {
        separationDims: ['_dimf'],
        subscripts: ['_f1']
      }),
      v('f[DimF]', '1,2,3', {
        separationDims: ['_dimf'],
        subscripts: ['_f2']
      }),
      v('f[DimF]', '1,2,3', {
        separationDims: ['_dimf'],
        subscripts: ['_f3']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "subscript" model', () => {
    const vars = readSubscriptsAndVariables('subscript')
    expect(vars).toEqual([
      v('b[DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_b1']
      }),
      v('b[DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_b2']
      }),
      v('b[DimB]', '1,2,3', {
        separationDims: ['_dimb'],
        subscripts: ['_b3']
      }),
      v('a[DimA]', 'b[DimB]', {
        subscripts: ['_dima']
      }),
      v('c[DimB]', 'b[DimB]', {
        subscripts: ['_dimb']
      }),
      v('d[A1]', 'b[B1]', {
        subscripts: ['_a1']
      }),
      v('e[B1]', 'b[B1]', {
        subscripts: ['_b1']
      }),
      v('f[DimA,B1]', '1', {
        subscripts: ['_dima', '_b1']
      }),
      v('f[DimA,B2]', '2', {
        subscripts: ['_dima', '_b2']
      }),
      v('f[DimA,B3]', '3', {
        subscripts: ['_dima', '_b3']
      }),
      v('g[B1,DimA]', 'f[DimA,B1]', {
        subscripts: ['_b1', '_dima']
      }),
      v('g[B2,DimA]', 'f[DimA,B2]', {
        subscripts: ['_b2', '_dima']
      }),
      v('g[B3,DimA]', 'f[DimA,B3]', {
        subscripts: ['_b3', '_dima']
      }),
      v('o[DimA,DimB]', 'f[DimA,DimB]', {
        subscripts: ['_dima', '_dimb']
      }),
      v('p[DimB,DimA]', 'f[DimA,DimB]', {
        subscripts: ['_dimb', '_dima']
      }),
      v('r[DimA]', 'IF THEN ELSE(DimA=Selected A,1,0)', {
        subscripts: ['_dima']
      }),
      v('Selected A', '2'),
      v('s[DimA]', 'DimB', {
        subscripts: ['_dima']
      }),
      v('t[DimC]', '1', {
        subscripts: ['_dimc']
      }),
      v('u[C1]', '1', {
        subscripts: ['_c1']
      }),
      v('u[C2]', '2', {
        subscripts: ['_c2']
      }),
      v('u[C3]', '3', {
        subscripts: ['_c3']
      }),
      v('u[C4]', '4', {
        subscripts: ['_c4']
      }),
      v('u[C5]', '5', {
        subscripts: ['_c5']
      }),
      v('v[DimA]', 'IF THEN ELSE(DimA=A2,1,0)', {
        subscripts: ['_dima']
      }),
      v('w[DimX,DimY]', 'DimX-DimY', {
        subscripts: ['_dimx', '_dimy']
      }),
      v('FINAL TIME', '1'),
      v('INITIAL TIME', '0'),
      v('SAVEPER', 'TIME STEP'),
      v('TIME STEP', '1'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sum" model', () => {
    const vars = readSubscriptsAndVariables('sum')
    expect(vars).toEqual([
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a[DimA]', '1,2,3', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('b[DimA]', '4,5,6', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('b[DimA]', '4,5,6', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('b[DimA]', '4,5,6', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('a 2[SubA]', '1,2', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('a 2[SubA]', '1,2', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('b 2[SubA]', '4,5', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('b 2[SubA]', '4,5', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('c', 'SUM(a[DimA!])+1'),
      v('d', 'SUM(a[DimA!])+SUM(b[DimA!])'),
      v('e', 'SUM(a[DimA!]*b[DimA!]/TIME STEP)'),
      v('f[DimA,DimC]', '1', {
        subscripts: ['_dima', '_dimc']
      }),
      v('g[DimA,DimC]', 'SUM(f[DimA!,DimC!])', {
        subscripts: ['_dima', '_dimc']
      }),
      v('h[DimC]', '10,20,30', {
        separationDims: ['_dimc'],
        subscripts: ['_c1']
      }),
      v('h[DimC]', '10,20,30', {
        separationDims: ['_dimc'],
        subscripts: ['_c2']
      }),
      v('h[DimC]', '10,20,30', {
        separationDims: ['_dimc'],
        subscripts: ['_c3']
      }),
      v('i', 'SUM(a[DimA!]+h[DimC!])'),
      v('j[DimA]', 'a[DimA]/SUM(b[DimA!])', {
        subscripts: ['_dima']
      }),
      v('k[SubA]', 'SUM(b 2[SubA!])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('k[SubA]', 'SUM(b 2[SubA!])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', {
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', {
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('m[D1,E1]', '11', {
        subscripts: ['_d1', '_e1']
      }),
      v('m[D1,E2]', '12', {
        subscripts: ['_d1', '_e2']
      }),
      v('m[D2,E1]', '21', {
        subscripts: ['_d2', '_e1']
      }),
      v('m[D2,E2]', '22', {
        subscripts: ['_d2', '_e2']
      }),
      v('msum[DimD]', 'SUM(m[DimD,DimE!])', {
        subscripts: ['_dimd']
      }),
      v('n[D1,E1,F1]', '111', {
        subscripts: ['_d1', '_e1', '_f1']
      }),
      v('n[D1,E1,F2]', '112', {
        subscripts: ['_d1', '_e1', '_f2']
      }),
      v('n[D1,E2,F1]', '121', {
        subscripts: ['_d1', '_e2', '_f1']
      }),
      v('n[D1,E2,F2]', '122', {
        subscripts: ['_d1', '_e2', '_f2']
      }),
      v('n[D2,E1,F1]', '211', {
        subscripts: ['_d2', '_e1', '_f1']
      }),
      v('n[D2,E1,F2]', '212', {
        subscripts: ['_d2', '_e1', '_f2']
      }),
      v('n[D2,E2,F1]', '221', {
        subscripts: ['_d2', '_e2', '_f1']
      }),
      v('n[D2,E2,F2]', '222', {
        subscripts: ['_d2', '_e2', '_f2']
      }),
      v('nsum[DimD,DimE]', 'SUM(n[DimD,DimE,DimF!])', {
        subscripts: ['_dimd', '_dime']
      }),
      v('o[D1,DimE,F1]', '111', {
        subscripts: ['_d1', '_dime', '_f1']
      }),
      v('o[D1,DimE,F2]', '112', {
        subscripts: ['_d1', '_dime', '_f2']
      }),
      v('o[D2,DimE,F1]', '211', {
        subscripts: ['_d2', '_dime', '_f1']
      }),
      v('o[D2,DimE,F2]', '212', {
        subscripts: ['_d2', '_dime', '_f2']
      }),
      v('osum[DimD,DimE]', 'SUM(o[DimD,DimE,DimF!])', {
        subscripts: ['_dimd', '_dime']
      }),
      v('t[DimT]', '1,2', {
        separationDims: ['_dimt'],
        subscripts: ['_t1']
      }),
      v('t[DimT]', '1,2', {
        separationDims: ['_dimt'],
        subscripts: ['_t2']
      }),
      v('u[DimU]', '10,20,30,40', {
        separationDims: ['_dimu'],
        subscripts: ['_u1']
      }),
      v('u[DimU]', '10,20,30,40', {
        separationDims: ['_dimu'],
        subscripts: ['_u2']
      }),
      v('u[DimU]', '10,20,30,40', {
        separationDims: ['_dimu'],
        subscripts: ['_u3']
      }),
      v('u[DimU]', '10,20,30,40', {
        separationDims: ['_dimu'],
        subscripts: ['_u4']
      }),
      v("t two dim[DimT,DimT']", "(10*t[DimT])+t[DimT']", {
        subscripts: ['_dimt', '_dimt_']
      }),
      v("t two dim with u[DimT,DimT',DimU]", "(10*u[DimU])+(10*t[DimT])+t[DimT']", {
        subscripts: ['_dimt', '_dimt_', '_dimu']
      }),
      v('v[DimT]', 'SUM(t two dim[DimT,DimT!])', {
        subscripts: ['_dimt']
      }),
      v('w[DimT,DimU]', 'u[DimU]*SUM(t two dim[DimT,DimT!])', {
        subscripts: ['_dimt', '_dimu']
      }),
      v('x[DimT,DimU]', 'SUM(t two dim with u[DimT,DimT!,DimU])', {
        subscripts: ['_dimt', '_dimu']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "sumif" model', () => {
    const vars = readSubscriptsAndVariables('sumif')
    expect(vars).toEqual([
      v('A Values[DimA]', '', {
        subscripts: ['_dima']
      }),
      v('A Values Total', 'SUM(A Values[DimA!])'),
      v(
        'A Values Avg',
        'ZIDZ(SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,A Values[DimA!])),SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,1)))'
      ),
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
      v('description', '0'),
      v('input', '1+0.5*SIN(2*3.14159*Time/period)'),
      v('average time', '6'),
      v('initial trend', '10'),
      v('period', '20'),
      v('TREND of input', 'TREND(input,average time,initial trend)'),
      v('trend1', 'ZIDZ(input-average value,average time*ABS(average value))'),
      v('average value', 'INTEG((input-average value)/average time,input/(1+initial trend*average time))'),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '100'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })

  it('should work for Vensim "vector" model', () => {
    const vars = readSubscriptsAndVariables('vector')
    expect(vars).toEqual([
      v('ASCENDING', '1'),
      v('DESCENDING', '0'),
      v('VSSUM', '0'),
      v('VSMAX', '3'),
      v('VSERRNONE', '0'),
      v('VSERRATLEASTONE', '1'),
      v('a[DimA]', '0,1,1', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('a[DimA]', '0,1,1', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('a[DimA]', '0,1,1', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('b[DimB]', '1,2', {
        separationDims: ['_dimb'],
        subscripts: ['_b1']
      }),
      v('b[DimB]', '1,2', {
        separationDims: ['_dimb'],
        subscripts: ['_b2']
      }),
      v('c[DimA]', '10+VECTOR ELM MAP(b[B1],a[DimA])', {
        subscripts: ['_dima']
      }),
      v('d[A1,B1]', '1', {
        subscripts: ['_a1', '_b1']
      }),
      v('d[A2,B1]', '2', {
        subscripts: ['_a2', '_b1']
      }),
      v('d[A3,B1]', '3', {
        subscripts: ['_a3', '_b1']
      }),
      v('d[A1,B2]', '4', {
        subscripts: ['_a1', '_b2']
      }),
      v('d[A2,B2]', '5', {
        subscripts: ['_a2', '_b2']
      }),
      v('d[A3,B2]', '6', {
        subscripts: ['_a3', '_b2']
      }),
      v('e[A1,B1]', '0', {
        subscripts: ['_a1', '_b1']
      }),
      v('e[A2,B1]', '1', {
        subscripts: ['_a2', '_b1']
      }),
      v('e[A3,B1]', '0', {
        subscripts: ['_a3', '_b1']
      }),
      v('e[A1,B2]', '1', {
        subscripts: ['_a1', '_b2']
      }),
      v('e[A2,B2]', '0', {
        subscripts: ['_a2', '_b2']
      }),
      v('e[A3,B2]', '1', {
        subscripts: ['_a3', '_b2']
      }),
      v('f[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],a[DimA])', {
        subscripts: ['_dima', '_dimb']
      }),
      v('g[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],e[DimA,DimB])', {
        subscripts: ['_dima', '_dimb']
      }),
      v('h[DimA]', '2100,2010,2020', {
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('h[DimA]', '2100,2010,2020', {
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('h[DimA]', '2100,2010,2020', {
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('l[DimA]', 'VECTOR SORT ORDER(h[DimA],ASCENDING)', {
        subscripts: ['_dima']
      }),
      v('m[DimA]', 'VECTOR SORT ORDER(h[DimA],0)', {
        subscripts: ['_dima']
      }),
      v('o[A1,B1]', '1', {
        subscripts: ['_a1', '_b1']
      }),
      v('o[A1,B2]', '2', {
        subscripts: ['_a1', '_b2']
      }),
      v('o[A2,B1]', '4', {
        subscripts: ['_a2', '_b1']
      }),
      v('o[A2,B2]', '3', {
        subscripts: ['_a2', '_b2']
      }),
      v('o[A3,B1]', '5', {
        subscripts: ['_a3', '_b1']
      }),
      v('o[A3,B2]', '5', {
        subscripts: ['_a3', '_b2']
      }),
      v('p[DimA,DimB]', 'VECTOR SORT ORDER(o[DimA,DimB],ASCENDING)', {
        subscripts: ['_dima', '_dimb']
      }),
      v('q[DimB]', 'VECTOR SELECT(e[DimA!,DimB],c[DimA!],0,VSSUM,VSERRNONE)', {
        subscripts: ['_dimb']
      }),
      v('r[DimA]', 'VECTOR SELECT(e[DimA,DimB!],d[DimA,DimB!],:NA:,VSMAX,VSERRNONE)', {
        subscripts: ['_dima']
      }),
      v('s[DimB]', 'SUM(c[DimA!]*e[DimA!,DimB])', {
        subscripts: ['_dimb']
      }),
      v('u', 'VMAX(x[DimX!])'),
      v('v', 'VMAX(x[SubX!])'),
      v('w', 'VMIN(x[DimX!])'),
      v('x[DimX]', '1,2,3,4,5', {
        separationDims: ['_dimx'],
        subscripts: ['_one']
      }),
      v('x[DimX]', '1,2,3,4,5', {
        separationDims: ['_dimx'],
        subscripts: ['_two']
      }),
      v('x[DimX]', '1,2,3,4,5', {
        separationDims: ['_dimx'],
        subscripts: ['_three']
      }),
      v('x[DimX]', '1,2,3,4,5', {
        separationDims: ['_dimx'],
        subscripts: ['_four']
      }),
      v('x[DimX]', '1,2,3,4,5', {
        separationDims: ['_dimx'],
        subscripts: ['_five']
      }),
      v('y[DimA]', 'VECTOR ELM MAP(x[three],(DimA-1))', {
        subscripts: ['_dima']
      }),
      v('INITIAL TIME', '0'),
      v('FINAL TIME', '1'),
      v('TIME STEP', '1'),
      v('SAVEPER', 'TIME STEP'),
      v('Time', '')
    ])
  })
})
