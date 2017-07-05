grammar Model;
import Expr;

// A Vensim model is a sequence of equations and subscript ranges.
// This grammar assumes that the sketch section has been removed.
model: ( subscriptRange | equation )+ ;

// A subscript range definition names subscripts in a dimension.
subscriptRange : Id ':' subscriptList ( '->' Id )? ;

// An equation has a left-hand side and a right-hand side.
// A Vensim lookup is simply a vector or array of data.
// Typically, the RHS is a formula expression or constant list.
// The RHS is empty for data equations.
equation : lookup | ( lhs ( ( ':=' | '==' | '=' ) ( expr | constList ) ) ) | lhs ;
lhs : Id ( '[' subscriptList ']' )? ;
constList : expr ( ',' expr )* ;

// The lexer strips some tokens we are not interested in.
// The character encoding is given at the start of a Vensim file.
// Line continuation characters don't matter to us because we skip whitepace.
// The units and documentation sections and group markings are skipped for now.
Encoding : '{' [A-Za-z0-9-]+ '}' -> skip ;
Continuation : '\\' -> skip ;
UnitsDoc : '~' .*? '|' -> skip ;
Group : '****' .*? '|' -> skip ;
