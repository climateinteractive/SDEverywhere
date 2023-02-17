# SDEverywhere &nbsp;&nbsp; ![](https://github.com/climateinteractive/SDEverywhere/actions/workflows/build.yaml/badge.svg)

## Introduction

TODO: suite/collection of libraries and command line tools to transform System Dynamics models for ...

TODO:

- Vensim to C (and WebAssembly/JavaScript)
- web user interface
- model check/comparison

[SDEverywhere](http://sdeverywhere.org/) is a [Vensim](http://vensim.com/) [transpiler](https://en.wikipedia.org/wiki/Source-to-source_compiler) that handles a broad range of [System Dynamics](http://www.systemdynamics.org/what-is-system-dynamics/) models. It supports some advanced features of the [Vensim modeling language](https://www.vensim.com/documentation/index.html?ref_language.htm), including subscripts, subranges, and subscript mapping. It generates C and JavaScript code, and can create a generic web user interface for simple models.

Using SDEverywhere, you can deploy interactive System Dynamics models in mobile, desktop, and web apps for policymakers and the public. Or you could perform model analysis using general-purpose languages, running the model as high-performance C code.

## Quick start

TODO: Requirements

TODO: Install [Node.js](https://nodejs.org/) version 14 or later. This will also install the `npm` Node Package Manager.

TODO: `npm create @sdeverywhere`

## Documentation

TODO: Link to wiki and table of packages

## Use in production

- [Climate Interactive](https://www.climateinteractive.org) has been using SDEverywhere in production since 2019 for their popular simulation tools:
  - [En-ROADS](https://en-roads.climateinteractive.org) &mdash; an online global climate simulator that allows users to explore the impact of policies on hundreds of factors like energy prices, temperature, air quality, and sea level rise
  - [C-ROADS](https://c-roads.climateinteractive.org) &mdash; an online policy simulator (also available as a macOS or Windows desktop application) that helps people understand the long-term climate impacts of national and regional greenhouse gas emission reductions at the global level

## Caveats

SDEverywhere has been used to generate code for complex models with thousands of equations, but your model may use features of Vensim that SDEverywhere cannot translate yet. Please fork our code and contribute! Here are some prominent current limitations.

- Sketch information, the visual representation of the model, is not converted.
- Only the most common [Vensim functions](https://www.vensim.com/documentation/index.html?20770.htm) are implemented.
- All models run using the Euler integrator.
- Strings are not supported.
- You must rewrite tabbed arrays as separate, non-apply-to-all variables.
- You must rewrite equations that use macros or code them in C.

Tabbed arrays and macros are removed from the model during preprocessing and written to the `removals.txt` file for your reference.

## Repository structure

SDEverywhere is developed in a monorepo structure.
Each package listed in the table below is developed as a separate npm package/library under the `packages` directory in this repository.
All packages are published independently to the [npm registry](https://www.npmjs.com).

If you're new to SDEverywhere, refer to the [Quick start](#quick-start) section above.
Running the `npm create @sdeverywhere` command described in that section will take care of setting up a recommended project structure and will install/configure the necessary `@sdeverywhere` packages from the table below.

If you want more control over which packages are installed, or for API documentation and configuration instructions, refer to the links below.

Packages marked with an asterisk (\*) are implementation details.
Most users won't need to interact with these implementation packages directly, but they may be useful for advanced use cases (for example, if you want to create a new build plugin or a custom test runner).

<table>
  <tr>
    <th>Package</th>
    <th>Version</th>
    <th>Links</th>
  </tr>
  <tr>
    <td colspan="3"><em>Project creation</em></td>
  </tr>
  <tr>
    <td><a href="./packages/create">@sdeverywhere/create</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/create"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/create.svg?label=%20"></a></td>
    <td>
      <a href="./packages/create">Source</a>&nbsp;|&nbsp;
      <a href="./packages/create/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/create/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td colspan="3"><em>Command line interface</em></td>
  </tr>
  <tr>
    <td><a href="./packages/cli">@sdeverywhere/cli</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/cli"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/cli.svg?label=%20"></a></td>
    <td>
      <a href="./packages/cli">Source</a>&nbsp;|&nbsp;
      <a href="./packages/cli/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/cli/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td colspan="3"><em>Build plugins</em></td>
  </tr>
  <tr>
    <td><a href="./packages/plugin-config">@sdeverywhere/plugin-config</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/plugin-config"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/plugin-config.svg?label=%20"></a></td>
    <td>
      <a href="./packages/plugin-config">Source</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-config/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-config/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/plugin-wasm">@sdeverywhere/plugin-wasm</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/plugin-wasm"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/plugin-wasm.svg?label=%20"></a></td>
    <td>
      <a href="./packages/plugin-wasm">Source</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-wasm/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-wasm/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/plugin-worker">@sdeverywhere/plugin-worker</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/plugin-worker"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/plugin-worker.svg?label=%20"></a></td>
    <td>
      <a href="./packages/plugin-worker">Source</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-worker/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-worker/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/plugin-vite">@sdeverywhere/plugin-vite</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/plugin-vite"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/plugin-vite.svg?label=%20"></a></td>
    <td>
      <a href="./packages/plugin-vite">Source</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-vite/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-vite/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/plugin-check">@sdeverywhere/plugin-check</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/plugin-check"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/plugin-check.svg?label=%20"></a></td>
    <td>
      <a href="./packages/plugin-check">Source</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-check/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/plugin-check/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td colspan="3"><em>Runtime libraries</em></td>
  </tr>
  <tr>
    <td><a href="./packages/runtime">@sdeverywhere/runtime</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/runtime"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/runtime.svg?label=%20"></a></td>
    <td>
      <a href="./packages/runtime">Source</a>&nbsp;|&nbsp;
      <a href="./packages/runtime/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/runtime/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/runtime-async">@sdeverywhere/runtime-async</a></td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/runtime-async"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/runtime-async.svg?label=%20"></a></td>
    <td>
      <a href="./packages/runtime-async">Source</a>&nbsp;|&nbsp;
      <a href="./packages/runtime-async/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/runtime-async/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td colspan="3"><em>Build/CLI implementation</em></td>
  </tr>
  <tr>
    <td><a href="./packages/build">@sdeverywhere/build</a> *</td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/build"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/build.svg?label=%20"></a></td>
    <td>
      <a href="./packages/build">Source</a>&nbsp;|&nbsp;
      <a href="./packages/build/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/build/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/compile">@sdeverywhere/compile</a> *</td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/compile"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/compile.svg?label=%20"></a></td>
    <td>
      <a href="./packages/compile">Source</a>&nbsp;|&nbsp;
      <a href="./packages/compile/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/compile/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td colspan="3"><em>`model-check` implementation</em></td>
  </tr>
  <tr>
    <td><a href="./packages/check-core">@sdeverywhere/check-core</a> *</td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/check-core"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/check-core.svg?label=%20"></a></td>
    <td>
      <a href="./packages/check-core">Source</a>&nbsp;|&nbsp;
      <a href="./packages/check-core/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/check-core/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
  <tr>
    <td><a href="./packages/check-ui-shell">@sdeverywhere/check-ui-shell</a> *</td>
    <td><a href="https://www.npmjs.com/package/@sdeverywhere/check-ui-shell"><img style="vertical-align:middle;" src="https://img.shields.io/npm/v/@sdeverywhere/check-ui-shell.svg?label=%20"></a></td>
    <td>
      <a href="./packages/check-ui-shell">Source</a>&nbsp;|&nbsp;
      <a href="./packages/check-ui-shell/README.md">Docs</a>&nbsp;|&nbsp;
      <a href="./packages/check-ui-shell/CHANGELOG.md">Changelog</a>
    </td>
  </tr>
</table>

## Features

TODO: Using `create`

TODO: Using config files

TODO: model-check

## Contributing

SDEverywhere covers a subset of the Vensim modeling language used in models that have been deployed with it. There is still much to contribute.

- Expand the Vensim parser to cover more of the language syntax, such as documentation strings, `:EXCEPT:` clauses, etc.
- Enhance the C code generator to produce code for new language features now that you can parse them.
- Implement more Vensim functions. This is the easiest way to help out.
- Target languages other than C, such as R or Ruby. (If you want Python, check out the excellent [PySD](https://github.com/JamesPHoughton/pysd)).

## License

All packages developed in the SDEverywhere repository are distributed under the MIT license.
See [LICENSE](./LICENSE) for more details.

## Conventions used in this guide

A string surrounded by curly braces `{like this}` indicates a placeholder that you should fill in with the appropriate value.

## Installing

### Requirements

Using SDEverywhere requires the macOS operating system and the free [Xcode](https://itunes.apple.com/us/app/xcode/id497799835) development tools from Apple.

### Install Node.js

Install [Node.js](https://nodejs.org/) version 14 or later. This will also install the `npm` Node Package Manager.

### Install SDEverywhere

If you want to use the stable release of SDEverywhere, simply install the npm package. If you want to work with the latest version of SDEverywhere in development, install source code from GitHub (see below).

**Install the stable release version of SDEverywhere**

```
npm install @sdeverywhere/cli -g
```

**Install the development version of SDEverywhere**

If you previously installed the SDEverywhere package using npm, uninstall that package first before installing your new, local copy.

```
npm rm @sdeverywhere/cli -g
```

Clone the `SDEverywhere` and `antlr4-vensim` repos in a project directory of your choice using either `git` on the command line or Sourcetree (see below).

_If you are using command-line Git_, clone each repo and track the `develop` branch, substituting your project directory name for "{project directory}".

```
cd {project directory}
git clone https://github.com/climateinteractive/antlr4-vensim
cd antlr4-vensim
cd ..
git clone https://github.com/climateinteractive/SDEverywhere
cd SDEverywhere
```

_If you are using Sourcetree_, do File > New > Clone from URL. Fill in the form as follows, substituting your project directory name for "{project directory}".

| Prompt           | Contents                                                |
| ---------------- | ------------------------------------------------------- |
| Source URL       | https://github.com/climateinteractive/antlr4-vensim.git |
| Destination Path | {project directory}/antlr4-vensim                       |
| Name             | antlr4-vensim                                           |

Then do the same for SDEverywhere.

| Prompt           | Contents                                               |
| ---------------- | ------------------------------------------------------ |
| Source URL       | https://github.com/climateinteractive/SDEverywhere.git |
| Destination Path | {project directory}/SDEverywhere                       |
| Name             | SDEverywhere                                           |

Track the `main` branch for both repos in Sourcetree by opening "origin" under Remotes in the sidebar, and then double-clicking `main`. Click the Checkout button.

When running SDEverywhere in development, you can also link the local version of `antlr4-vensim` by adding the following to `package.json`:

```
{
  "pnpm": {
    "overrides": {
      "antlr4-vensim": "link:../antlr4-vensim"
    }
  }
}
```

Then run `pnpm install`.

If you need to run SDEverywhere in a debugger, use the instructions in the "Debugging" section below.

## Test your setup

If you cloned the GitHub repo, you can test your installation by building and running the models in the `models` directory, and then comparing SDEverywhere output to Vensim output. Each model has its own directory under `models` with the same name as the model.

Run all model tests with pnpm.

```
pnpm test
```

## Usage

Use `sde -h` to see a list of all commands.

Use `sde {command}` to see options for a command.

It is usually easiest to run these commands from the directory where the `.mdl` file is located. The `{model}` placeholder can be the model filename, for instance `arrays.mdl`, or simply the model name `arrays`.

If you are not running from the model directory, you can give a full pathname to locate the `.mdl` file anywhere on the system.

By default, SDEverywhere will create a `build` directory in your model directory to hold the generated code and the compiled model. If you run the model, it will also create an `output` directory by default. You can specify other directories with command options.

**Generate baseline model code that outputs all variables with no inputs**

```
sde generate --genc {model}
```

**List a model's variables**

```
sde generate --list {model}   ## list will be `build` directory
```

**Preprocess a model to remove macros and tabbed arrays to removals.txt**

```
sde generate --preprocess {model}  ## model will be `build` directory
```

**Compile the C code into an executable in the build directory**

```
sde compile {model}
```

**Run the executable and capture output into a text file in the output directory**

```
sde exec {model} {arguments}
```

**Convert the SDEverywhere output file to a DAT file in the output directory**

```
sde log --dat output/{model}.txt
```

**Compare a previously exported Vensim DAT file to SDEverywhere output**

```
sde compare {model}.dat output/{model}.dat
```

**Generate C code and compile it in the build directory**

```
sde build {model}
```

**Build C code and run the model**

```
sde run {model}
```

**Run the model and compare its output to a previously exported Vensim DAT file**

```
sde test {model}
```

**Delete the build, output, and html directories**

```
sde clean {model}
```

**Print variable dependencies**

```
sde causes {model} {C variable name}
```

**Convert variable names to C format**

```
sde names {model} {Vensim names file}
```

**Print the SDEverywhere home directory**

```
sde which
```

### Specify input and output variables

Most applications do not require all variables in the output. And we usually want to designate some constant variables as inputs. In SDEverywhere, this is done with a model specification JSON file. The conventional name is `{model}_spec.json`.

First, create a model specification file that gives the Vensim names of input and output variables of interest. Be sure to include `Time` first among the output variables.

```JSON
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
```

### Specify external data sources

Add a `directData` section to the spec file to have SDEverywhere read data from an Excel file into lookups with a variable name prefix. There is an example in the `directdata` sample model.

```JSON
"directData": {
  "?data": "data.xlsx"
}
```

### Specify equations to remove from the model

When SDEverywhere cannot handle a certain Vensim construct yet, you will need to remove equations that use the construct from the model, convert it by hand into something that SDEverywhere can handle, and then insert it back into the model. To have the preprocessor remove equations from the model into a `removals.txt` file, specify substrings to match in the equation in the `removalKeys` section. Macros and TABBED ARRAY equations are already automatically removed by the preprocessor.

For instance, you could key on the variable name in the equation definition.

```JSON
"removalKeys": [
  "varname1 =",
  "varname2 ="
]
```

### Generating, compiling, running, and testing the C code

To generate C code using the `--spec` argument, enter the following command:

```
sde generate --genc --spec {model}_spec.json {model}
```

SDE allows for validation against Vensim output. Before running the C file, it is useful to generate the Vensim data so you can ensure the C code is valid and reproduces the same results as Vensim. To make the Vensim output, run the model in 64-bit Vensim and export the run in DAT format to the `{model}.dat` file in the model directory.

The `sde test` command generates baseline C code that outputs all variables with no inputs. It then compiles the C code and runs it. The output is captured and converted into DAT format in the `output/{model}.dat` file. This is compared to Vensim run exported to a `{model}.dat` file in the model directory. All values that differ by a factor of 1e-5 or more are listed with the variance.

```
sde test {model}
```

### Setting inputs

SDEverywhere generates code that runs the model using the constants defined in the model. To explore model behavior, the user changes the values of constants we call "input variables" and runs the model again.

There is a `setInputs` implementation in the generated code that gets called at initialization. It takes a string with serialized input values and sets variable values from it. The serialization format depends on the needs of your application. You can replace `setInputs` if you want to use a different serialization form. The input variables are listed in the `inputVars` section of the spec file. Look at the `arrays` model for an example.

The generated format minimizes the amount of data on the wire for web applications. It parses index-value pairs sent in a compact format that looks like this: `0:3.14 6:42`. That is, the values are separated by spaces, and each pair has an index number, a colon, and a floating point number.

The zero-based index maps into a static array of input variable pointers held in the function. These are used to set the value directly into the static `double` variable in the generated code.

### Inserting a file into the model

Some constructs like macros are not supported by SDEverywhere. They are removed from the model by the preprocessor into the `removals.txt` file. You can edit these constructs into a form that SDEverywhere supports and insert them back into the model. Simply create a file called `mdl-edits.txt` in the model directory with the constructs to insert. For instance, manually expand macros and place them into the `mdl-edits.txt` file. The preprocessor will read this file and insert its contents unchanged into the beginning of the model.

## Generating a web application

Refer to the "Using SDEverywhere to Make a Vensim Model into a Web Application" article in the `notes` directory for full details on designing and building your web app.
