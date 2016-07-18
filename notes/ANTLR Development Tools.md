ANTLR Development Tools
Command line utilities

These scripts generate a lexer and parser in Java and then run the ANTLR TestRig tool. They are useful in development when you are trying to understand how the lexer is tokenizing your model and what parse tree the parser is generating.

The grammar currently assumes that the sketch section is removed from the model, and that lines continued with the backslash character have been joined. You can accomplish this with the sdepp tool below. Alternatively, you can just put the equation in question in a .mdl file without the sketch section, so that preprocessing is unnecessary.

Installing

To install on a Unix-like system such as Mac OS X:

Install Java and ANTLR 4.5.
Copy these files to a suitable location such as /usr/local/bin or your project directory.
Change the location of ANTLR in the "antlr4" shell variable in each script if necessary.
Run "chmod +x" on each script to make them executable.
lex

Usage: lex [-g] mdl-filename

-g generates the lexer and parser before running the lexer

Run the lexer on the .mdl file to print the token stream. Use the -g option to generate the lexer the first time you run "lex" and whenever you change the grammar.

tree

Usage: tree [-g] mdl-filename

-g generates the lexer and parser before running the parser

Run the parser on the .mdl file to print the parse tree in Lisp s-expression format. Use the -g option to generate the parser the first time you run "tree" and whenever you change the grammar.

clean

Remove all generated Java code and data files. Useful if you are targeting a language other than Java.

Model preprocessor

The grammar currently assumes that the sketch section is removed from the model, and that lines continued with the backslash character have been joined. You can accomplish this with the sdepp tool. It is written in the new ES6 version of JavaScript, and thus requires the Babel preprocessor to work with currently available JavaScript engines.

The preprocessor may become unnecessary if someone extends the Vensim grammar. Versions in languages other than ES6 are welcome.

Installing

To install on a Unix-like system such as Mac OS X:

Copy the sdepp.js file to your project directory.
Install node.js to get the Google V8 JavaScript engine on your development machine.
Install Babel and other dependencies with the Node Package Manager. We are using Babel 5 until the big changes in Babel 6 shake out.
sudo npm install -g babel@5.8.29
sudo npm install -g ramda commander
Running

Run the script with the model filename and capture the preprocessed model file. You can parse this file with the Vensim grammar.

babel-node sdepp.js -m {mdl-filename} >sdepp.mdl
