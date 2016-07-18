grammar Model;
import Expr;

model: equation+ ;
equation: lhs ( ('=='|'=') (expr | constList) | lookup ) ;
lhs: Id subscriptList? ;
subscriptList : '[' Id (',' Id)* ']' ;
constList : Const (',' Const)* ;

Encoding: '{' [A-Za-z0-9-]+ '}' -> skip ;
UnitsDoc: '~' .*? '|' -> skip ;
Group: '****' .*? '|' -> skip ;
