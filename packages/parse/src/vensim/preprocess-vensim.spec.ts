// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { preprocessVensimModel } from './preprocess-vensim'

describe('preprocessVensimModel', () => {
  it('should preprocess a model', () => {
    const mdl = `\
{UTF-8}
A  : A1, A2 ~~|
B  :   B1, B2 ~~|

:MACRO: VSMOOTH(input,SMOOTH TIME)

Vsmooth = INTEG((input - Vsmooth)/SMOOTH TIME, input)
  ~ input
  ~ The first order smoothed value of a variable.
  |

:END OF MACRO:

X[A]  = 1 ~~|  Y[B]  = 2 ~~|
Z[A,B]  = 
  X[A] +
    Y[B]
  ~ EJ/year
  ~ Comment text is here. And here. Here, too. \\
    And on a second line.
  ~ :SUPPLEMENTARY:
  |

Population[a,b] = TABBED ARRAY(
\t1\t2
\t5\t6) ~Person~|

remove me 1 = 1
  ~~|

remove me 2 = 2
  ~~|

Another to remove = 3 ~~|

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

    const removalKeys = ['remove me', 'Another to remove']
    expect(preprocessVensimModel(mdl, { removalKeys })).toEqual({
      defs: [
        {
          key: 'a',
          def: 'A : A1, A2 ~~|',
          kind: 'dim',
          line: 2,
          units: '',
          comment: ''
        },
        {
          key: 'b',
          def: 'B : B1, B2 ~~|',
          kind: 'dim',
          line: 3,
          units: '',
          comment: ''
        },
        {
          key: 'x[a]',
          def: 'X[A] = 1 ~~|',
          kind: 'eqn',
          line: 14,
          units: '',
          comment: ''
        },
        {
          key: 'y[b]',
          def: 'Y[B] = 2 ~~|',
          kind: 'eqn',
          line: 14,
          units: '',
          comment: ''
        },
        {
          key: 'z[a,b]',
          def: 'Z[A,B] = X[A] + Y[B] ~~|',
          kind: 'eqn',
          line: 15,
          units: 'EJ/year',
          comment: 'Comment text is here. And here. Here, too. And on a second line.'
        },
        {
          key: 'w[a,b] :except: [a1,b1]',
          def: 'W[A,B] :EXCEPT: [A1,B1] = 1 ~~|',
          kind: 'eqn',
          line: 42,
          units: '',
          comment: '',
          group: 'Group name'
        }
      ],
      removedMacros: [
        `\
:MACRO: VSMOOTH(input,SMOOTH TIME)

Vsmooth = INTEG((input - Vsmooth)/SMOOTH TIME, input)
  ~ input
  ~ The first order smoothed value of a variable.
  |

:END OF MACRO:`
      ],
      removedBlocks: [
        `\
Population[a,b] = TABBED ARRAY(
\t1\t2
\t5\t6) ~Person~|`,
        `\
remove me 1 = 1
  ~~|`,
        `\
remove me 2 = 2
  ~~|`,
        `\
Another to remove = 3 ~~|`
      ]
    })
  })
})
