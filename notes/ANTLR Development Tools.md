# ANTLR Development Tools

## Command line utilities

These scripts generate a lexer and parser in Java and then run the ANTLR TestRig tool. They are useful in development when you are trying to understand how the lexer is tokenizing your model and what parse tree the parser is generating.

The grammar currently assumes that the sketch section is removed from the model, and that lines continued with the backslash character have been joined. You can accomplish this with the sdepp tool below. Alternatively, you can just put the equation in question in a .mdl file without the sketch section, so that preprocessing is unnecessary.

## Installing

To install on a Unix-like system such as Mac OS X:

Install Java and ANTLR 4.7.

Copy these files to a suitable location such as `/usr/local/bin` or your project directory.

Change the location of ANTLR in the "antlr4" shell variable in each script if necessary.

Run `chmod +x` on each script to make them executable.

## Using the commands

### make_parser

Usage: make_parser

Generate `ModelLexer.js`, `ModelParser.js`, and `ModelVisitor.js` in the `src` directory.

### lex

Usage: lex [-g] mdl-filename

-g generates the lexer and parser before running the lexer

Run the lexer on the .mdl file to print the token stream. Use the -g option to generate the lexer the first time you run "lex" and whenever you change the grammar.

### tree

Usage: tree [-g] mdl-filename

-g generates the lexer and parser before running the parser

Run the parser on the .mdl file to print the parse tree in Lisp s-expression format. Use the -g option to generate the parser the first time you run "tree" and whenever you change the grammar.

### clean

Remove all generated Java code and data files. Useful if you are targeting a language other than Java.
