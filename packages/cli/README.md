# @sdeverywhere/cli

This package contains the `sde` command line interface for the SDEverywhere suite of tools.

SDEverywhere can be used to translate System Dynamics models from Vensim to C and WebAssembly.

For more details on the full suite of tools and libraries provided in SDEverywhere, refer to the top-level [README](https://github.com/climateinteractive/SDEverywhere) in the SDEverywhere repository.

For instructions on using the `sde` command line tool provided in this package, refer to the ["Usage"](#usage) section below.

## Quick Start

The quickest way to get started with SDEverywhere is to open your terminal emulator ("Terminal" on macOS or Linux, or "Command Prompt" on Windows) and type:

```sh
npm create @sdeverywhere
```

Running that `create` script will install the `cli` package (and the `sde` command line tool) automatically, so you can skip the next section and jump straight to the ["Usage"](#usage) section below.

## Install

If you are building a JavaScript-based library or application, it is recommended that you install the `cli` package locally (in the `devDependencies` section of your `package.json` file).
This allows you to use a version of the `cli` package that is specific to your project:

```sh
npm install --save-dev @sdeverywhere/cli
```

If you are using SDEverywhere only to generate C code (using the more advanced `sde` commands listed below), then it is acceptable to install the package "globally":

```sh
npm install -g @sdeverywhere/cli
```

## Usage

If you installed the `cli` package globally (see ["Install"](#install) section above), you can run the `sde` command directly.

If you installed the `cli` package locally (i.e., added it as a dev dependency in your `package.json`), you can run the `sde` command via `npx`, for example:

```sh
npx sde <args>
```

### Basic commands

Note: A string surrounded by curly braces `{like this}` indicates a placeholder that you should fill in with the appropriate value.

Use `sde -h` to see a list of all commands.

Use `sde {command}` to see options for a command.

It is usually easiest to run these commands from the directory where the `.mdl` file is located.
The `{model}` placeholder can be the model filename, for instance `arrays.mdl`, or simply the model name `arrays`.

If you are not running from the model directory, you can give a full pathname to locate the `.mdl` file anywhere on the system.

By default, SDEverywhere will create a `build` directory in your model directory to hold the generated code and the compiled model.
If you run the model, it will also create an `output` directory by default.
You can specify other directories with command options.

#### Generate C code that outputs all variables with no inputs

```
sde generate --genc {model}
```

#### Generate C code that uses a specified set of inputs and outputs

```
sde generate --genc --spec {model}_spec.json {model}
```

#### Start a local development builder/server

The `sde dev` command is great for local development of a web application.
It will start a builder process that rebuilds your app and runs QA checks against your model any time you save changes to your `mdl` file.
You can leave the builder running while developing your model in Vensim.
The app and model-check tabs in your browser will refresh automatically whenever you save changes in Vensim or make edits to your application code.

See [`examples/hello-world`](https://github.com/climateinteractive/SDEverywhere/tree/main/examples/hello-world) for a simple example of an `sde.config.js` file.
You can also follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere/tree/main/examples/sir#quick-start) instructions for `examples/sir`, which will generate a more complete example of an `sde.config.js` file.

```
sde dev [--config sde.config.js] [--verbose]
```

#### Generate a JS bundle that can be deployed on a web server

After using the `sde dev` command described above, you can use `sde bundle` to generate a production-ready version of your web application that can be deployed on any web server.

```
sde bundle [--config sde.config.js] [--verbose]
```

### Advanced commands

#### List a model's variables

```
sde generate --list {model}
```

#### Preprocess a model to remove macros and tabbed arrays to removals.txt

```
sde generate --preprocess {model}
```

#### Compile the C code into an executable in the build directory

```
sde compile {model}
```

#### Run the executable and capture output into a text file in the output directory

```
sde exec {model} {arguments}
```

#### Convert the SDEverywhere output file to a DAT file in the output directory

```
sde log --dat output/{model}.txt
```

#### Compare a previously exported Vensim DAT file to SDEverywhere output

```
sde compare {model}.dat output/{model}.dat
```

#### Generate C code and compile it in the build directory

```
sde build {model}
```

#### Build C code and run the model

```
sde run {model}
```

#### Run the model and compare its output to a previously exported Vensim DAT file

```
sde test {model}
```

#### Delete the build and output directories

```
sde clean {model}
```

#### Print variable dependencies

```
sde causes {model} {C variable name}
```

#### Convert variable names to C format

```
sde names {model} {Vensim names file}
```

#### Print the SDEverywhere home directory

```
sde which
```

### Configuration files

_NOTE:_ The following sections refer to "model specification files" (or "spec files" as a shorthand).
These JSON spec files are generally used by the lower-level `sde` commands, such as `sde generate`.
We are gradually adding support for a more flexible configuration file format (`sde.config.js`) that works with newer commands such as `sde dev` and `sde bundle`.
We hope to unify these configuration file formats soon to eliminate any confusion about which file format can be used with which command (see related issue [#327](https://github.com/climateinteractive/SDEverywhere/issues/327)).

#### Specify input and output variables

Most applications do not require all variables in the output.
And we usually want to designate some constant variables as inputs.
In SDEverywhere, this is done with a model specification JSON file.
The conventional name is `{model}_spec.json`.

First, create a model specification file that gives the Vensim names of input and output variables of interest.
Be sure to include `Time` first among the output variables.

```json
{
  "inputVars": ["Reference predators", "Reference prey"],
  "outputVars": ["Time", "Predators Y", "Prey X"]
}
```

#### Specify external data sources

Add a `directData` section to the spec file to have SDEverywhere read data from an Excel file into lookups with a variable name prefix.
There is an example in the `directdata` sample model.

```json
"directData": {
  "?data": "data.xlsx"
}
```

#### Specify equations to remove from the model

When SDEverywhere cannot handle a certain Vensim construct yet, you will need to remove equations that use the construct from the model, convert it by hand into something that SDEverywhere can handle, and then insert it back into the model.
To have the preprocessor remove equations from the model into a `removals.txt` file, specify substrings to match in the equation in the `removalKeys` section.
Macros and `TABBED ARRAY` equations are already automatically removed by the preprocessor.

For instance, you could key on the variable name in the equation definition.

```json
"removalKeys": [
  "varname1 =",
  "varname2 ="
]
```

#### Generating, compiling, running, and testing the C code

To generate C code using the `--spec` argument, enter the following command:

```
sde generate --genc --spec {model}_spec.json {model}
```

SDE allows for validation against Vensim output.
Before running the C file, it is useful to generate the Vensim data so you can ensure the C code is valid and reproduces the same results as Vensim.
To make the Vensim output, run the model in 64-bit Vensim and export the run in DAT format to the `{model}.dat` file in the model directory.

The `sde test` command generates baseline C code that outputs all variables with no inputs.
It then compiles the C code and runs it.
The output is captured and converted into DAT format in the `output/{model}.dat` file.
This is compared to Vensim run exported to a `{model}.dat` file in the model directory.
All values that differ by a factor of 1e-5 or more are listed with the variance.

```
sde test {model}
```

#### Setting inputs

SDEverywhere generates code that runs the model using the constants defined in the model.
To explore model behavior, the user changes the values of constants we call "input variables" and runs the model again.

There is a `setInputs` implementation in the generated code that gets called at initialization.
It takes a string with serialized input values and sets variable values from it.
The serialization format depends on the needs of your application.
You can replace `setInputs` if you want to use a different serialization form.
The input variables are listed in the `inputVars` section of the spec file.
Look at the `arrays` model for an example.

The generated format minimizes the amount of data on the wire for web applications.
It parses index-value pairs sent in a compact format that looks like this: `0:3.14 6:42`.
That is, the values are separated by spaces, and each pair has an index number, a colon, and a floating point number.

The zero-based index maps into a static array of input variable pointers held in the function.
These are used to set the value directly into the static `double` variable in the generated code.

#### Inserting a file into the model

Some constructs like macros are not supported by SDEverywhere.
They are removed from the model by the preprocessor into the `removals.txt` file.
You can edit these constructs into a form that SDEverywhere supports and insert them back into the model.
Create a file called `mdl-edits.txt` in the model directory with the constructs to insert.
For instance, manually expand macros and place them into the `mdl-edits.txt` file.
The preprocessor will read this file and insert its contents unchanged into the beginning of the model.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
