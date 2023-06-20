# SDEverywhere &nbsp;&nbsp; ![](https://github.com/climateinteractive/SDEverywhere/actions/workflows/build.yaml/badge.svg)

[SDEverywhere](http://sdeverywhere.org/) is a collection of libraries and command line tools that help you transform a [System Dynamics](http://www.systemdynamics.org/what-is-system-dynamics/) model into C, JavaScript, and WebAssembly code.

Using SDEverywhere, you can deploy interactive System Dynamics models in mobile, desktop, and web apps for policymakers and the public.
Or you could perform model analysis using general-purpose languages, running the model as high-performance C code.

By following the ["Quick Start"](#quick-start) instructions below, within minutes you can turn a Vensim model like this:

<img width="500" alt="sde-vensim" src="https://github.com/climateinteractive/SDEverywhere/assets/438425/97e9b89e-54e4-438e-8cbd-51b9cd10a027">

<p>
<br/>
...into an interactive (and fully customizable) simulator that runs in any web browser:
</p>

<img width="500" alt="sde-explorer" src="https://github.com/climateinteractive/SDEverywhere/assets/438425/95a51d0d-0201-47ae-b224-9820709de6c2">

## Supported Platforms

The SDEverywhere tools can be used on on any computer running macOS, Windows, or Linux.
The libraries and code generated by SDEverywhere can be run in web browsers on almost any device (including phones and tablets) as well as on the server side (using C/C++ or WebAssembly).

## Supported File Formats

SDEverywhere currently supports a broad range of System Dynamics models in [Vensim](https://www.vensim.com) format and handles many features of the [Vensim modeling language](https://www.vensim.com/documentation/index.html?ref_language.htm), including subscripts, subranges, and subscript mapping.

Support for models in [XMILE](http://docs.oasis-open.org/xmile/xmile/v1.0/xmile-v1.0.html) format (as used by e.g., [Stella](https://www.iseesystems.com)) is on the roadmap.

## Core Functionality

At its core, SDEverywhere includes a [transpiler](https://en.wikipedia.org/wiki/Source-to-source_compiler) that can read a [Vensim](https://www.vensim.com/documentation/index.html?ref_language.htm) model and generate a high-performance version of that model in the C programming language.

The [`sde`](./packages/cli) command line tool &mdash; in addition to generating C code &mdash; provides a plugin-based build system for extended functionality:

- [plugin-config](./packages/plugin-config) allows you to configure your model/library/app using CSV files
- [plugin-wasm](./packages/plugin-wasm) converts the generated C model into a fast WebAssembly module for use in a web browser or Node.js application
- [plugin-worker](./packages/plugin-worker) generates a Web Worker that can be used to run the WebAssembly model in a separate thread for improved user experience
- [plugin-vite](./packages/plugin-vite) provides integration with [Vite](https://github.com/vitejs/vite) for developing a library or application around your generated model
- [plugin-check](./packages/plugin-check) allows for running QA checks and comparison tests on your model every time you make a change

Additionally, the [runtime](./packages/runtime) and [runtime-async](./packages/runtime-async) packages make it easy to interact with your generated WebAssembly model in a JavaScript- or TypeScript-based application.

For more details on all of these packages, refer to the ["Packages"](#packages) section below.

## Requirements

The SDEverywhere libraries and tools can be used on any computer running macOS, Windows, or Linux.

SDEverywhere requires [Node.js](https://nodejs.org) version 14 or later.
Node.js is a cross-platform runtime environment that allows for running JavaScript-based tools (like SDEverywhere) on macOS, Windows, and Linux computers.

Note: It is not necessary to have extensive knowledge of Node.js and JavaScript in order to use SDEverywhere, but a one-time download of Node.js is necessary to get started.
Once you [download and install](https://nodejs.org) Node.js, you can run the commands listed on this page that start with `npm`.
(The `npm` command line tool is included when you install the Node.js runtime environment.)

If you are already familiar with Node.js and have it installed, note that SDEverywhere is also compatible with the [pnpm](https://pnpm.io) and [Yarn](https://classic.yarnpkg.com/) package managers, which can be used as an alternative to `npm`.

## Quick Start

The following video shows what it will look like when you follow the steps in this section.
In this video, we demonstrate commands that turn a Vensim model (the SIR model from `examples/sir`) into a web application project.

https://github.com/climateinteractive/SDEverywhere/assets/438425/c0c81bcd-f5a5-4cf1-8698-be46118d7c9c

As shown in the video above, the quickest way to get started with SDEverywhere is to open your terminal emulator ("Terminal" on macOS or Linux, or "Command Prompt" on Windows) and type the commands explained below.

If you already have a directory containing a Vensim `mdl` file, change to that directory first.
(The script will generate some new files in that directory, so if you would prefer, feel free to create a fresh directory that includes just your `mdl` file.)

```sh
# Change to the directory containing your `mdl` file:
cd my-project-folder
```

Or, if you don't already have a Vensim `mdl` file, and/or you want to evaluate SDEverywhere for the first time, you can create an empty directory, and the script will provide a sample model to get you started:

```sh
# Create an empty directory and change to that directory:
mkdir my-project-folder
cd my-project-folder
```

Once you are in the correct folder, run the `create` script:

```sh
# Use `npm` to run the "create" script:
npm create @sdeverywhere@latest

# Or, if you use pnpm:
pnpm create @sdeverywhere@latest

# Or, if you use Yarn:
yarn create @sdeverywhere
```

Answer a few questions, and within minutes you can have a functional web application that runs your model!

## Documentation

Detailed API and usage documentation for each `@sdeverywhere` package can be found in the ["Packages"](#packages) section below.

Additional user guides and documentation for contributors can be found in the [SDEverywhere wiki](https://github.com/climateinteractive/SDEverywhere/wiki).
For example:

- For guidance on designing and building a full-featured web application around your model, refer to [Creating a Web Application](https://github.com/climateinteractive/SDEverywhere/wiki/Creating-a-Web-Application).
- To learn how to embed an SD model into a native C/C++ application or library, refer to [Integrating a Model into a Native Application](https://github.com/climateinteractive/SDEverywhere/wiki/Integrating-a-Model-into-a-Native-Application).

## Caveats

SDEverywhere has been used to generate code for complex models with thousands of equations, but your model may use features of Vensim that SDEverywhere cannot translate yet.
Please fork our code and contribute!
Here are some prominent current limitations:

- Sketch information, the visual representation of the model, is not converted.
- Only the most common [Vensim functions](https://www.vensim.com/documentation/index.html?20770.htm) are implemented.
- All models run using the Euler integrator.
- Strings are not supported.
- You must rewrite tabbed arrays as separate, non-apply-to-all variables.
- You must rewrite equations that use macros or code them in C.

Tabbed arrays and macros are removed from the model during preprocessing and written to the `removals.txt` file for your reference.

## Features

### Live Editing

SDEverywhere provides a live development environment and configuration files that allow you to see your edits in real time.
Every time you save changes to your Vensim model or to the CSV config files, the local builder automatically rebuilds your project and the changes appear instantaneously in your browser, no manual reloads required.

The following video demonstrates using a text editor to make simple edits in the CSV config files that affect the appearance and behavior of the generated web application.
In the video, we tweak the color of a graph plot, change an axis label, and set a new default for a slider.
All of these settings and more can be configured by editing the CSV files in your favorite text editor or in Excel.

https://github.com/climateinteractive/SDEverywhere/assets/438425/cd495776-5744-40b9-a922-8ad5b138106c

### Quality Checks and Comparisons

SDEverywhere includes extensive QA (quality assurance) tools that you can run locally on your machine as you develop your model or in the cloud in a continuous integration environment.
There is support for two different kinds of tests:

- **_Checks:_** Check tests can be used to verify that your model behaves according to some guidelines (or conforms to your mental models). For example, you can have checks that verify that stocks are always positive, or that some output variable produces values that are close to historical reference data.
- **_Comparisons:_** Comparison tests can be used to track changes to your model between two different versions. For example, you can run your model over thousands of input scenarios and see at a glance how your model outputs differ from a previous version.

In the following video, we demonstrate how the model-check tools can be run alongside Vensim to give you immediate feedback whenever you make changes to your model.
In this example, we have an existing "check" test that verifies that the different population variables always produce values in the range 0 to 10000.
If we multiply a variable by -1 and save the model file, the builder detects the change and re-runs all the defined check and comparison tests.

Since the "Recovered Population" variable is now producing negative values, there is a failing check that gets flagged in the Model Check report, showing that the data now goes outside the expected (green) range.
Additionally, the comparison tests show how the new model results differ from the previous ones over many different input scenarios.

https://github.com/climateinteractive/SDEverywhere/assets/438425/b6f05b3f-f18a-48c4-89a9-80f1d8bfbfde

## SDEverywhere in Production

- [Climate Interactive](https://www.climateinteractive.org) has been using SDEverywhere in production since 2019 for their popular simulation tools:
  - [En-ROADS](https://en-roads.climateinteractive.org) &mdash; an online global climate simulator that allows users to explore the impact of policies on hundreds of factors like energy prices, temperature, air quality, and sea level rise
  - [C-ROADS](https://c-roads.climateinteractive.org) &mdash; an online policy simulator (also available as a macOS or Windows desktop application) that helps people understand the long-term climate impacts of national and regional greenhouse gas emission reductions at the global level

## Packages

SDEverywhere is developed in a monorepo structure.
Each package listed in the table below is developed as a separate npm package/library under the `packages` directory in this repository.
All packages are published independently to the [npm registry](https://www.npmjs.com).

If you're new to SDEverywhere, refer to the ["Quick Start"](#quick-start) section above.
Running the `npm create @sdeverywhere@latest` command described in that section will take care of setting up a recommended project structure and will install/configure the necessary `@sdeverywhere` packages from the table below.

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

## Contributing

SDEverywhere covers a subset of the Vensim modeling language used in models that have been deployed with it.
There is still much to contribute, for example:

- Expand the Vensim parser to cover more of the language syntax, such as documentation strings, `:EXCEPT:` clauses, etc.
- Enhance the C code generator to produce code for new language features now that you can parse them.
- Implement more Vensim functions. This is the easiest way to help out.
- Target languages other than C, such as R or Rust. (If you want Python, check out the excellent [PySD](https://github.com/JamesPHoughton/pysd)).

For more guidance on contributing to SDEverywhere, please consult the [wiki](https://github.com/climateinteractive/SDEverywhere/wiki).

## License

All packages developed in the SDEverywhere repository are distributed under the MIT license.
See [LICENSE](./LICENSE) for more details.
