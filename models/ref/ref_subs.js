[
  // Target: (t1-t3)
  { name: 'Target', value: [ 't1', 't2', 't3' ] },
  { name: 't1', value: 0, family: 'Target' },
  { name: 't2', value: 1, family: 'Target' },
  { name: 't3', value: 2, family: 'Target' },
  // tNext: (t2-t3) -> tPrev
  // Mappings give the index mapped from for each index in order in the dimension mapped to.
  { name: 'tNext', value: [ 't2', 't3' ], family: 'Target',
    mappings: [
      { toDim: 'tPrev', value: [ 't2', 't3' ] }
    ] },
  // tPrev: (t1-t2) -> tNext
  { name: 'tPrev', value: [ 't1', 't2' ], family: 'Target',
    mappings: [
      { toDim: 'tNext', value: [ 't1', 't2' ] }
    ] },
]
