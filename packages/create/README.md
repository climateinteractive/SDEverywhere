# @sdeverywhere/create

Create a new [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) project with minimal configuration.

## Quick Start

The quickest way to get started with SDEverywhere is to open your terminal emulator ("Terminal" on macOS or Linux, or "Command Prompt" on Windows) and type the following commands.

If you already have a directory containing a Vensim `mdl` file, change to that directory first.
(The script will generate some new files in that directory, so if you would prefer, feel free to create a fresh directory that includes just your `mdl` file.)

```sh
# Change to the directory containing your `mdl` file:
cd my-project-folder
```

Or, if you don't already have a Vensim `mdl` file, and/or you want to evaluate SDEverywhere for the first time, you can create an empty directory, and the script will add a sample model to get you started:

```sh
# Create an empty directory and change to that directory:
mkdir my-project-folder
cd my-project-folder
```

Once you are in the correct folder, run the `create` script:

```sh
# Use `npm` to run the "create" script:
npm create @sdeverywhere

# Or, if you use pnpm:
pnpm create @sdeverywhere

# Or, if you use Yarn:
yarn create @sdeverywhere
```

Answer a few questions, and within minutes you can have a functional web application that runs your model!

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
