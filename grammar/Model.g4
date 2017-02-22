grammar Model;
import Expr;

model: equation+ ;
equation: lhs | ( lhs ( (':='|'=='|'=') (expr | constList) | lookup ) ) ;
lhs: Id subscriptList? ;
subscriptList : '[' Id (',' Id)* ']' ;
constList : expr (',' expr)* ;

Encoding: '{' [A-Za-z0-9-]+ '}' -> skip ;
UnitsDoc: '~' .*? '|' -> skip ;
Group: '****' .*? '|' -> skip ;
