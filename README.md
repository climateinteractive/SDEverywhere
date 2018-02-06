# SDEverywhere Guide

Revised: 2018-02-04 (version 0.4.0)

## Introduction

[SDEverywhere](://sdeverywhere.org/) is a [Vensim](http://vensim.com/) [transpiler](https://en.wikipedia.org/wiki/Source-to-source_compiler) that handles a broad range of [System Dynamics](http://www.systemdynamics.org/what-is-s/) models. It supports some advanced features of [Vensim Modeling Language](https://www.vensim.com/documentation/index.html?ref_language.htm), including subscripts, subranges, and subscript mapping. It generates C and JavaScript code, and can create a generic web user interface for simple models.

Using SDEverywhere, you can deploy interactive System Dynamics models in mobile, desktop, and web apps for policymakers and the public. Or you could perform model analysis using general-purpose languages, running the model as high-performance C code.

## Caveats

SDEverywhere has been used to generate code for complex models with thousands of equations, but your model may use features of Vensim that SDEverywhere cannot translate yet. Please fork our code and contribute! Here are some prominent current limitations.

- Sketch information, the visual representation of the model, is not converted.
- Only the most common [Vensim functions](https://www.vensim.com/documentation/index.html?20770.htm) are implemented.
- Arrays must be one- or two-dimensional.
- All models run using the Euler integrator.
- You must remove tabbed arrays and add them to the model as separate, non-apply-to-all variables.
- You must remove macros and either hand code them in C or rewrite equations that use them.

Tabbed arrays and macros are removed from the model during preprocessing and written to the `removals.txt` file for your reference.

## Installing

### Requirements

Using SDEverywhere requires the macOS operating system and the free [Xcode](https://itunes.apple.com/us/app/xcode/id497799835) development tools from Apple.

### Install Node.js

Install [Node.js](https://nodejs.org/) version 8.9.4 LTS or later. This will also install the `npm` Node Package Manager.

### Install SDEverywhere as an npm package

If you want to use SDEverywhere without getting the sample models, tests, and source code, simply install the npm package. The global installation gives you the `sde` command everywhere on your system.
~~~
npm install sdeverywhere -g
~~~

### Get the source code and sample models

If you want the full source code, visit the [GitHub repo](https://github.com/ToddFincannon/SDEverywhere) to download the code as a zip file and install it in the directory of your choice. Alternatively, clone the repository on your machine.
~~~
git clone https://github.com/ToddFincannon/SDEverywhere
~~~

You can run SDEverywhere from anywhere on your machine by installing the `sde` command line tool globally using `npm`. The examples in this guide assume a global installation. If you choose not to do that, instead of the `sde` command, run `node sde.js` from the `src` directory.
~~~
cd src
npm install -g
sde -v
~~~

## Test your setup

If you installed the sample models from the GitHub repo, you can test your installation by building and running the models in the `models` directory, and then comparing SDEverywhere output to Vensim x64 output. Each model has its own directory under `models` with the same name as the model. For instance:
~~~
cd models/arrays
sde test arrays
~~~

If that worked OK, you have installed everything needed to use SDEverywhere. You can test *all* the sample models too.
~~~
cd src/tests
./modeltests
~~~

## Sample models

The sample Vensim models located in the `models` directory in a folder with the base name of the `.mdl` file. The C code will be written with the same base name in the `build` directory.

The following models are included as samples and test cases for various Vensim features.

Model          | Description
-------------- | -----------
active_initial | ACTIVE INITIAL function
arrays         | 1-D and 2-D arrays with a variety of subscript references
delay          | DELAY function
delay3         | DELAY3 function
index          | Apply-to-all and non-apply-to-all arrays
initial        | INITIAL function
interleaved    | Demonstrating a case where non-apply-to-all array elements are separated in eval order
lookup         | Lookup variables and functions
mapping        | Mapping subranges
ref            | An eval order that require an apply-to-all array to become non-apply-to-all
sample         | SAMPLE function
sir            | SIR infection model
smooth         | SMOOTH function
smooth3        | SMOOTH3 function
subscript      | Subscript references in various orders
sum            | SUM expressions
vector         | Vector functions

Here are the files in each model directory.

Filename          | Description
----------------- | -----------
{model}.mdl       | Vensim model
{model}.vdf64     | Vensim data file from a 64-bit run using default variable values
{model}.dat       | Data file exported in DAT text format
{model}.txt       | SDEverywhere log file in DAT format with values for all time steps
{model}_spec.json | Model specification including input and output variables of interest
{model}_vars.txt  | SDEverywhere variable analysis

## Usage

Use `sde -h` to see a list of all commands.

Use `sde {command}` to see options for a command.

It is usually easiest to run these commands from the directory where the `.mdl` file is located. The `{model}` placeholder can be the model filename, for instance `arrays.mdl`, or simply the model name `arrays`.

If you are not running from the model directory, you can give a full pathname to locate the `.mdl` file anywhere on the system.

By default, SDEverywhere will create a `build` directory in your model directory to hold the generated code and the compiled model. If you run the model, it will also create an `output` directory by default. You can specify other directories with command options.

**Generate baseline model code that outputs all variables with no inputs**
~~~
sde generate --genc {model}
~~~

**List a model's variables**
~~~
sde generate --list {model} >{model}_vars.txt
~~~

**Preprocess a model to remove macros and tabbed arays to removals.txt**
~~~
sde generate ----preprocess {model} >{model}_pp.mdl
~~~

**Compile the C code into an executable in the build directory**
~~~
sde compile {model}
~~~

**Run the executable and capture output into a text file in the output directory**
~~~
sde exec {model} {arguments}
~~~

**Convert the SDEverywhere output file to a DAT file in the output directory**
~~~
sde log --dat output/{model}.txt
~~~

**Compare a previously exported Vensim DAT file to SDEverywhere output**
~~~
sde compare {model}.dat output/{model}.dat
~~~

**Generate C code and compile it in the build directory**
~~~
sde build {model}
~~~

**Build C code and run the model**
~~~
sde run {model}
~~~

**Run the model and compare its output to a previously exported Vensim DAT file**
~~~
sde test {model}
~~~

**Delete the build, output, and html directories**
~~~
sde clean {model}
~~~

**Generate a web app to run the model and graph the results**
~~~
sde generate --genhtml {model}
~~~

### Specify input and output variables

Most applications do not require all variables in the output. And we usually want to designate some constant variables as inputs. In SDEverywhere, this is done with a model specification JSON file. The conventional name is `{model}_spec.json`.

First, create a model specification file that gives the Vensim names of input and output variables of interest. Be sure to include `Time` first among the output variables.
~~~
{
  "inputVars": [
    "Reference predators",
    "Reference prey"
  ],
  "outputVars": [
    "Time",
    "Predators Y",
    "Prey X"
  ]
}
~~~

Generate code using the `--spec` argument.
~~~
sde generate --genc --spec {model}_spec.json {model}
~~~

### Generating, compiling, running, and testing the C code

First, run the model in 64-bit Vensim and export the run in DAT format to the `{model}.dat` file in the model directory.

The `sde test` command generates baseline C code that outputs all variables with no inputs. It then compiles the C code and runs it. The output is captured and converted into DAT format in the `output/{model}.dat` file. This is compared to Vensim run exported to a `{model}.dat` file in the model directory. All values that differ by a factor of 1e-5 or more are listed with the variance.
~~~
sde test {model}
~~~

### Setting inputs

SDEverywhere generates code that runs the model using the constants defined in the model. To explore model behavior, the user changes the values of constants we call "input variables" and runs the model again.

There is a `setInputs` implementation in the generated code that gets called at initialization. It takes a string with serialized input values and sets variable values from it. The serialization format depends on the needs of your application. You can replace `setInputs` if you want to use a different serialization form. The input variables are listed in the `inputVars` section of the spec file. Look at the `arrays` model for an example.

The generated format minimizes the amount of data on the wire for web applications. It parses index-value pairs sent in a compact format that looks like this: `0:3.14 6:42`. That is, the values are separated by spaces, and each pair has an index number, a colon, and a floating point number.

The zero-based index maps into a static array of input variable pointers held in the function. These are used to set the value directly into the static `double` variable in the generated code.

## Generating a web application

Refer to the "Using SDEverywhere to Make a Vensim Model into a Web Application" article in the `notes` directory for full details on designing and building your web app.

## Contributing

SDEverywhere covers a subset of the Vensim Modeling Language used in models that have been deployed with it. There is still much to contribute.

- Expand the Vensim parser to cover more of the language syntax, such as documentation strings, :EXCEPT clauses, etc.
- Enhance the C code generator to produce code for new language features now that you can parse them.
- Implement more Vensim functions. This is the easiest way to help out.
- Target languages other than C, such as R or Ruby. (If you want Python, check out the excellent [PySD](https://github.com/JamesPHoughton/pysd)).

### Debugging

To run in the Chrome debugger, start Node with the `--inspect-brk` flag. Use `node sde.js` from the SDEverywhere `src` directory.

[Debugging Node.js with Chrome DevTools](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27)

Place a `debugger` statement in the code to set a breakpoint. Only one source file is available when the debugger starts. Others will become available as you step through code or examine the call stack. You can set additional breakpoints in the debugger once the source file is loaded.

When running in the Chrome debugger, enter `ctx.getText()` in the console when in a visitor method to see the text of the parser node.

An exception of "code generator exception: Cannot read property 'name' of undefined" is generated when a subscript is not able to be resolved by the `subs()` function in `normalizeSubscripts()`.

To print a stack trace to the console, use `console.error(e.stack)` in an exception handler and `console.trace()` elsewhere.

In the C input parsing code, show a changed value:
~~~
if (*inputVarPtrs[modelVarIndex] != value) {
  fprintf(stderr, "input %d changed from %g to %g\n", modelVarIndex, *inputVarPtrs[modelVarIndex], value);
}
~~~

## SDEverywhere architecture

SDEverywhere is a transpiler that converts models written in the [Vensim Modeling Language](http://www.vensim.com/documentation/index.html?22300.htm) to either C or JavaScript. The language features and Vensim library functions that are most commonly used in models are supported, including subscripts.

SDEverywhere is written in the [ES6](https://github.com/lukehoban/es6features) language (also known as ECMAScript 2015, the latest JavaScript standard). Much of the code is written in a functional programming style using the [Ramda](http://ramdajs.com/) toolkit.

### Some notes on terminology

SDEverywhere uses [XMILE](http://docs.oasis-open.org/xmile/) terminology in most cases. A Vensim subscript range becomes a "dimension" that has "indices". (The XMILE specification has "element" as the child of "dimension" in the model XML format, but uses "index" informally, so SDEverywhere sticks with "index".) XMILE does not include the notion of subranges. SDEverywhere calls subranges "subdimensions".

Vensim refers to variables and equations interchangeably. This usually makes sense, since most variables are defined by a single equation. In SDEverywhere, models define variables with equations. However, a subscripted variable may be defined by multiple equations. In XMILE terminology, an *apply-to-all* array has an equation that defines all indices of the variable. There is just one array variable. A *non-apply-to-all* array is defined by different equations for each index. This means there are multiple variables, one for each index.

The `Variable` class is the heart of SDEverywhere. An equation has a left-hand side (LHS), usually the variable name, and a right-hand side (RHS), usually a formula expression that is evaluated to determine the variable's value. The RHS could also be a Vensim lookup (a set of data points) or a constant array.

### Parsing

The `sdegen` command reads the model file, an optional model spec JSON file detailing input and output variables, and an optional subscript JSON file detailing dimensions, indices, and mappings. Each file is parsed and then handed off to the `CodeGen` object.

The model file is parsed using a grammar generated by [ANTLR v4](http://www.antlr.org/) from the `Model.g4` and `Expr.g4` grammar files. The parser constructs a parse tree that the code generator works with. The model file is passed through a preprocessor first to handle some things the grammar can't work with yet, such as macros and tabbed arrays.

### Code generation overview

SDEverywhere first visits the parse tree with the `VariableReader` class to construct `Variable` objects that contain basic information about each variable. This is roughly the equivalent of parsing an [XMILE](http://docs.oasis-open.org/xmile/) model definition. The SDEverywhere project intends to use an XMILE representation internally at some point to enable interop with other tools. XMILE terminology is used in the code in preference to Vensim terminology.

A second pass through the parse tree with the `EquationReader` class analyzes the right-hand side (RHS) of each equation to further annotate the `Variable` objects. The variable type is determined, and the variables the equation references are listed.

SDEverywhere is now ready to generate code.

<img src="notes/Code-Generation-Diagram.png" alt="Code generation diagram" style="width: 284px"/>

### The generated model and the run loop

Each section of a complete model program in C is written in sequence. The decl section declares C variables, including arrays of the proper size. The init section initializes constant variables and evaluates levels and the auxiliary variables necessary to evaluate them. The eval section is the main run loop. It evaluates aux variables and then outputs the state. The time is advanced to the next time step. Levels are evaluated next, and then the loop is finished. The input/output section has the code that sends output variable values to the output channel and optionally sets input values when the program starts.

<img src="notes/Run-Loop-Diagram.png" alt="Run loop diagram" style="width: 285px"/>

### The Variable object

The `eqnCtx` property holds a reference to the ANTLR `ParserRuleContext` object for the variable in the parse tree. This enables the code generator to walk the subtree for the variable.

In the `Variable` object, the `modelLHS` and `modelFormula` properties preserve the Vensim variable name (left-hand side of the equation) and the Vensim formula (RHS). Everywhere else, names of variables are in a canonical format compatible with the C programming language. The Vensim name is converted to lower case (it is case insensitive), spaces are replaced with underscores, and an underscore is prepended to the name. Vensim function names are similar, but are upper-cased instead.

The unsubscripted form of the Vensim variable name, in canonical format, is saved in the `varName` property. If there are subscripts in the LHS, the maximal canonical dimension names in sorted "normal" order establish subscript families by position in the `families` property. The subscripts are saved as canonical dimension or index names in the LHS in normal order in the `subscripts` property.

Lookup variables do not have a formula. Instead, they have a list of 2-D points and an optional range. These are saved in the `range` and `points` properties.

Each variable has a `refId` property that gives the variable's LHS in a normal form that can be used in lists of references. The `refId` is the same as the `varName` for unsubscripted variables. A subscripted variable can include both dimension and index subscripts on the LHS. When another variable refers to the subscripted variable, we add its `refId` to the list of references. The normal form for a `refId` has the canonical name of each dimension or index sorted by their subscript families, separated by commas in a single pair of brackets, for example: `_a[_dima,_dimb]`.

The `references` array property lists the refIds of variables that this variable's formula references. This determines the dependency order and thus evaluation order during code generation. Some Vensim functions such as `_INTEG` have a special initialization argument that is evaluated before the normal run loop. The references in the expression for this argument are stored in the `initReferences` property and do not appear in `references` unless they occur elsewhere in the formula.

The `varType` property holds the variable type, which determines where the variable is evaluated in the sim’s run loop. The Vensim var types that SDEverywhere supports are const, aux, level, and lookup.

Lookups may occur as function arguments as well as variables in their own right. When this happens, the code generator generates an internal lookup variable to hold the lookup's points. The name of the generated variable is saved in the `lookupArgVarName` property. It replaces the lookup as the function argument when code is generated.

`SMOOTH*` calls are replaced by a generated level variable named in `smoothVarName`. `DELAY3*` calls are replaced by a level named in `delayVarName` and an aux variable named in `delayTimeVarName`.

### Visitor classes

In SDEverywhere, most of the work is accomplished by visitor classes that walk the parse tree.

<img src="notes/Visitor-Classes-Diagram.png" alt="SDEverywhere Visitor Classes" style="width: 708px"/>

`ParseTreeVisitor` is the visitor base class in the ANTLR runtime.

The ANTLR parser generator creates the `ModelVisitor` class to provide an empty interface consisting of "visit" methods for each parser rule. The runtime calls these methods as each rule is matched in the parse tree. The visit methods take a `ParserRuleContext` argument encapsulating the current spot in the parse tree. The rule context provides information on each part of the string that matched the rule. This is where SDEverywhere extracts information about the model from the parse tree.

`ModelReader` is an SDEverywhere base class for more specialized parse tree walker classes. It does not extract any information from the parse tree on its own. Instead, it visits each element of a rule context by getting the element from the rule context and then calling its `accept` method. `ModelReader` knows what elements are part of each rule context in what order, which ones are optional, and which ones can take multiple values. The `accept` method goes through the visitor framework to make a "visit" call on the method for the element's rule contxt. In effect, it is asking a child rule context to "accept" a "visit" from "this" parent rule context.

For instance, when the LHS of an equation is visited, the `visitLhs` method is called. It sees if there is a subscript list in the parse tree under the LHS node. If there is, the `accept` method is called on the subscript list rule context.
~~~
visitLhs(ctx) {
  if (ctx.subscriptList()) {
    ctx.subscriptList().accept(this);
  }
}
~~~

The remaining SDEverywhere visitor classes derive from the abstract `ModelReader` base to extract information from the parse tree.

`VariableReader` is used in the first pass to construct `Variable` objects with information from the LHS of each equation in the model.

`EquationReader` is used in the second pass to analyze the RHS of each variable's equation and fill in the variable type, references to other variables, and the remaining `Variable` properties.

`EquationGen` is used by the code generator to walk the RHS again and generate code for each variable in the correct order.

`ModelLHSReader` is a special reader that simply reads the LHS of a variable's equation to get Vensim var names with dimensions expanded into a variable for each index. It is used in the output section.

`VarNameReader` reads an individual model var name using the parser to get the var name in C format. This is used to generate an individual variable output in the output section.

### Code generation details

#### VariableReader

Syntactically, an equation can be one of three things: a variable, a lookup, or a constant list. `VariableReader` creates multiple variables for each constant in a constant list. Subscripts are put into normal form.

When a variable is added to the model, the Model object checks to see if there is an index subscript on the LHS. If so, the variable is a non-apply-to-all array, and is added to the `nonAtoANames` list indexed by the var name, with a value of an array of flags for each subscript in normal order, indicating whether the subscript is an index or not.

A subscripted constant variable can be defined with all of the constants in a list on the RHS. This notation is handled as a top-level alternative for the RHS in the grammar. When `VariableReader` finds a constant list, it creates new variables, one for each index in the constant list.

#### EquationReader

When `EquationReader` finds lookup syntax on the RHS, it creates a lookup variable by setting the points, optional range, and variable type in the `Variable`. If a variable has no references, the variable type is set to "const". If a function name such as `_INTEG` is encountered, the variable type is set to `level`.

If the variable is non-apply-to-all, and it has a dimension subscript on the RHS in the same position as an index subscript on the LHS, then the equation references each element of the non-apply-to-all variable separately, one for each index in the dimension. `EquationReader` constructs a refId for each of the expanded variables and adds it to the `expandedRefIds` list. The references are added later in `addReferencesToList()`.

#### CodeGen

The code generator gets lists of variables for each section of the program and calls the `generate` method of `EquationGen` to generate code for each variable.

The Model object supplies the variable lists, relying on the following internal functions. `varsOfType` returns vars with a given varType. `sortVarsOfType` returns aux or level vars sorted in dependency order using eval time references. `sortInitVars` does the same using init time references. The other difference is that aux and level vars are evaluated separately at eval time, while a mixture of level vars and the aux vars they depend on are evaluated at init time.

#### EquationGen

`EquationGen` has a number of properties that hold intermediate results as the RHS parse tree is visited.

The `var` property holds a reference to the variable for which code is being generated. Code is generated differently in the init section of the program. This is controlled by the `initMode` flag, which is passed into the `EquationGen` constructor.

The LHS for the equation is generated in the constructor and saved in the `lhs` property to be emitted later. The LHS for array variables includes subscripts in normal form.

Code is emitted into several distinct channels that are all brought together after the entire RHS is visited. `exprCode` is the code for the formula expression. Comments go in `comments`.

Array functions such as SUM require the creation of a temporary variable and a loop. These go in the `tmpVarCode` temporary variable channel.

Subscripted variables are also evaluated in a loop. The subscript loop opening and closing go in the `subscriptLoopOpeningCode` and `subscriptLoopClosingCode` channels. The array function code itself goes in the `arrayFunctionCode` buffer.

Array functions mark one dimension that the function operates over. The dimension is marked by a `!` character at the end of the dimension name. If this is detected, the `!` is removed and the name of the marked dimension is saved in `markedDim`.

A Vensim formula has one main function name at the outset, but may include other functions in the expressions that make up its arguments. As `EquationGen` descends into the parse tree, it maintains a stack of function names in the `callStack` property. Similarly, a stack of var names inside the current expression is maintained in the `varNames` property. The current function name and var name (the top of the stacks) are available in the `currentFunctionName()` and `currentVarName()` methods.

## WebAssembly

For web apps, SDEverywhere converts the C code it generates into [WebAssembly](http://webassembly.org/) code that runs fast in recent browsers.

Instead of calling `startup()` on page load, we need to wait for the WebAssembly (wasm) module to load. We define a global Module object with the callback.

~~~
window.Module = {
  preRun: [],
  postRun: [],
  onRuntimeInitialized: () => startup()
}
~~~

It is set in `window` so that Browserify will make it part of the global namespace. Defining `var Module` in the html file does not work. A more elegant solution would be to use the Browserify `insertGlobalVars` method. This would best be done by running Browserify from JavaScript instead of the CLI.

[Defining global variable for Browserify](https://stackoverflow.com/questions/23480336/defining-global-variable-for-browserify)

[Missing parity between command line and programmatic options](https://github.com/browserify/browserify/issues/1289)

The `print` and `printError` defaults are `console.log` and `console.warn`.

We load `index.min.js` first to get the `Module` object created. The WebAssembly wrapper generated by Emscripten in `sd_alps.js` is loaded next and adds to `Module`. We do not define a main function and define `NO_EXIT_RUNTIME=1` instead to prevent the module from exiting after the first run. The C functions we call are listed in `EXPORTED_FUNCTIONS` and wrapped with `cwrap`.
