[
  // DimA: A1, A2, A3
  { name: 'DimA', value: [ 'A1', 'A2', 'A3' ] },
  { name: 'A1', value: 0, family: 'DimA' },
  { name: 'A2', value: 1, family: 'DimA' },
  { name: 'A3', value: 2, family: 'DimA' },
  // SubA: A1, A2
  { name: 'SubA', value: ['A1', 'A2'], family: 'DimA' },
  // DimB: B1, B2 -> (DimA: SubA, A3)
  // Dimension mapping expanded through subdimensions
  { name: 'DimB', value: [ 'B1', 'B2' ],
    mappings: [
      { toDim: 'DimA', value: [ 'B1', 'B1', 'B2' ] },
    ] },
  { name: 'B1', value: 0, family: 'DimB' },
  { name: 'B2', value: 1, family: 'DimB' },
  // SubC: C1, C2
  { name: 'SubC', value: [ 'C1', 'C2' ], family: 'DimC' },
  // DimC: SubC, C3 -> DimD
  { name: 'DimC', value: [ 'C1', 'C2', 'C3' ],
    mappings: [
      { toDim: 'DimD', value: [ 'D1', 'D2', 'D3' ] },
    ] },
  { name: 'C1', value: 0, family: 'DimC' },
  { name: 'C2', value: 1, family: 'DimC' },
  { name: 'C3', value: 2, family: 'DimC' },
  // DimD: D1, D2, D3
  { name: 'DimD', value: [ 'D1', 'D2', 'D3' ] },
  { name: 'D1', value: 0, family: 'DimD' },
  { name: 'D2', value: 1, family: 'DimD' },
  { name: 'D3', value: 2, family: 'DimD' },
]
