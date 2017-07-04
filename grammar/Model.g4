grammar Model;
import Expr;

// A Vensim model is a sequence of equations.
// This grammar assumes that the sketch section has been removed and that
// lines continued with '\' have been joined in a preprocessing step.
model: equation+ ;

// An equation has a left-hand side and a right-hand side.
// A subscript range definition is not really an equation, but names subscripts in a dimension.
// A Vensim lookup is simply a vector or array of data.
// Typically, the RHS is a formula expression or constant list.
// The RHS is empty for data equations.
equation : subscriptRange | lookup | ( lhs ( (':='|'=='|'=') (expr | constList) ) ) | lhs ;
lhs : Id ('[' subscriptList ']')? ;
subscriptRange : Id ':' subscriptList ;
constList : expr ( ',' expr )* ;

// The lexer strips some tokens we are not interested in.
// The character encoding is given at the start of a Vensim file.
// The units and documentation sections and group markings are skipped for now.
Encoding : '{' [A-Za-z0-9-]+ '}' -> skip ;
UnitsDoc : '~' .*? '|' -> skip ;
Group : '****' .*? '|' -> skip ;
