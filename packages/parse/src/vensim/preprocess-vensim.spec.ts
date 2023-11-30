// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { preprocessVensimModel } from './preprocess-vensim'

describe('preprocessVensimModel', () => {
  it('should preprocess a model', () => {
    const mdl = `\
{UTF-8}
A  : A1, A2 ~~|
B  :   B1, B2 ~~|


X[A]  = 1 ~~|  Y[B]  = 2 ~~|
Z[A,B]  = 
  X[A] +
    Y[B]
  ~ EJ/year
  ~ Comment text is here. And here. Here, too. \\
    And on a second line.
  ~ :SUPPLEMENTARY:
  |


********************************************************
  .Group name
********************************************************~
  Group comment here.
  |

W[A,B] :EXCEPT: [A1,B1]  = 1 ~~|

\\\\\\---/// Sketch information - do not modify anything except names
V301  Do not put anything below this section - it will be ignored
*XYZ
$192-192-192,0,Arial|12||0-0-0|0-0-0|0-0-255|-1--1--1|-1--1--1|96,96,5,0
10,0,X,115,147,75,30,8,3,0,0,0,0,0,0,0,0,0,0,0,0
`

    expect(preprocessVensimModel(mdl)).toEqual([
      {
        key: 'a',
        def: 'A : A1, A2 ~~|',
        line: 2,
        units: '',
        comment: ''
      },
      {
        key: 'b',
        def: 'B : B1, B2 ~~|',
        line: 3,
        units: '',
        comment: ''
      },
      {
        key: 'x[a]',
        def: 'X[A] = 1 ~~|',
        line: 6,
        units: '',
        comment: ''
      },
      {
        key: 'y[b]',
        def: 'Y[B] = 2 ~~|',
        line: 6,
        units: '',
        comment: ''
      },
      {
        key: 'z[a,b]',
        def: 'Z[A,B] = X[A] + Y[B] ~~|',
        line: 7,
        units: 'EJ/year',
        comment: 'Comment text is here. And here. Here, too. And on a second line.'
      },
      {
        key: 'w[a,b] :except: [a1,b1]',
        def: 'W[A,B] :EXCEPT: [A1,B1] = 1 ~~|',
        line: 23,
        units: '',
        comment: ''
      }
    ])
  })
})
