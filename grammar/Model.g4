grammar Model;
import Expr;

// A Vensim model is a sequence of equations and subscript ranges.
model: ( subscriptRange | equation )+ ;

// A subscript range definition names subscripts in a dimension.
subscriptRange : Id ':' ( subscriptList | subscriptSequence ) subscriptMapping? ;
subscriptSequence : '(' Id '-' Id ')' ;
subscriptMapping : '->' ( Id | '(' Id ':' subscriptList ')' ) ;

// An equation has a left-hand side and a right-hand side.
// Typically, the RHS is a formula expression or constant list.
// A Vensim lookup is simply a vector or array of data.
// The RHS is empty for data equations.
equation : lhs ( ( ':=' | '==' | '=' ) ( expr | constList ) | lookup )? ;

lhs : Id ( '[' subscriptList ']' )? ;
constList : expr ( ',' expr )* ;

// The lexer strips some tokens we are not interested in.
// The character encoding is given at the start of a Vensim file.
// Line continuation characters don't matter to us because we skip whitepace.
// The units and documentation sections and group markings are skipped for now.
Encoding : '{' [A-Za-z0-9-]+ '}' -> skip ;
UnitsDoc : '~' .*? '|' -> skip ;
Group : '****' .*? '|' -> skip ;
// Ignore the ANTLR 4 warning message for this rule.
Sketch : '\\\\\\---/// Sketch' .* -> skip;
