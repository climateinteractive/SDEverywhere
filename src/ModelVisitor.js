// Generated from Model.g4 by ANTLR 4.7
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by ModelParser.

function ModelVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

ModelVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
ModelVisitor.prototype.constructor = ModelVisitor;

// Visit a parse tree produced by ModelParser#model.
ModelVisitor.prototype.visitModel = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#subscriptRange.
ModelVisitor.prototype.visitSubscriptRange = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#subscriptSequence.
ModelVisitor.prototype.visitSubscriptSequence = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#subscriptMapping.
ModelVisitor.prototype.visitSubscriptMapping = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#equation.
ModelVisitor.prototype.visitEquation = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#lhs.
ModelVisitor.prototype.visitLhs = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#constList.
ModelVisitor.prototype.visitConstList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Call.
ModelVisitor.prototype.visitCall = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Or.
ModelVisitor.prototype.visitOr = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Keyword.
ModelVisitor.prototype.visitKeyword = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#MulDiv.
ModelVisitor.prototype.visitMulDiv = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#AddSub.
ModelVisitor.prototype.visitAddSub = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Var.
ModelVisitor.prototype.visitVar = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Parens.
ModelVisitor.prototype.visitParens = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Const.
ModelVisitor.prototype.visitConst = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Relational.
ModelVisitor.prototype.visitRelational = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#LookupCall.
ModelVisitor.prototype.visitLookupCall = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Not.
ModelVisitor.prototype.visitNot = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Negative.
ModelVisitor.prototype.visitNegative = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Positive.
ModelVisitor.prototype.visitPositive = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#And.
ModelVisitor.prototype.visitAnd = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Equality.
ModelVisitor.prototype.visitEquality = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#LookupArg.
ModelVisitor.prototype.visitLookupArg = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#Power.
ModelVisitor.prototype.visitPower = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#exprList.
ModelVisitor.prototype.visitExprList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#subscriptList.
ModelVisitor.prototype.visitSubscriptList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#lookup.
ModelVisitor.prototype.visitLookup = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#lookupRange.
ModelVisitor.prototype.visitLookupRange = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#lookupPointList.
ModelVisitor.prototype.visitLookupPointList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by ModelParser#lookupPoint.
ModelVisitor.prototype.visitLookupPoint = function(ctx) {
  return this.visitChildren(ctx);
};



exports.ModelVisitor = ModelVisitor;