# template-svelte

This is a template that is used by the `@sdeverywhere/create` package to generate a
new project that uses SDEverywhere for a Svelte-based web application.

The project includes:

- a build process that converts a Vensim model to a JavaScript or WebAssembly
  module that can run the model in any web browser or in a Node.js application
- a `config` directory that contains CSV files for configuring the generated
  model and application
- a "core" package that provides a clean JavaScript / TypeScript API around the
  generated model
- an "app" package containing a web application (based on the
  [Svelte](https://svelte.dev/) framework) that can be used to exercise the model
- a local development mode (`npm run dev`) that allows for rapid prototyping
  of the model and app
- a "model-check" setup that allows for running checks and comparison tests using
  the generated model

## Quick Start

```sh
# Create a new project (you can also use yarn or pnpm here, if preferred).
npm create @sdeverywhere@latest -- --template svelte

# Enter development mode for your model.  This will start a live
# development environment that will build a JavaScript version of the
# model and run checks on it any time you make changes to:
#   - the config files
#   - the Vensim model file (<name>.mdl)
#   - the model check definitions (model/checks/*.yaml)
#   - the model comparison definitions (model/comparisons/*.yaml)
npm run dev
```

## Notes

- The Vensim model is in `model/{MODEL_NAME}.mdl`.

- The `sde.config.js` file is used by the `sde` command line tool to generate
  a JavaScript version of the model, which is copied into the `core` package
  at build time (into the `packages/core/src/model/generated` directory).

- The web app is developed using the [Svelte](https://svelte.dev/) framework.
  See `packages/app/src/app.svelte` for the top-level `App` component.

- The code that runs the generated model is located in
  `packages/core/src/model/model.ts`. This code:
  1. passes the slider values to the generated model as inputs
  2. runs the generated model asynchronously (in a Web Worker)
  3. makes the model outputs available to be displayed (and animated) in the
     main graphs

## Deployment

This project automatically publishes your simulator and model-check reports to
a public website (hosted on GitHub Pages) whenever you push changes to GitHub.

NOTE: The `deployPlugin` step in the `sde.config.js` file will only be enabled
if you set `baseUrl`; see instructions at the top of that file for details.
Once you set `baseUrl` and push your changes to GitHub, your builds will fail
until you manually enable GitHub Pages for your repo.

To enable GitHub Pages for your repository:

1. Go to the GitHub repository settings (`https://github.com/{USER}/{REPO}/settings`)
2. In the sidebar (under "Code and automation"), select "Pages"
3. Under "Build and deployment", change "Source" to "GitHub Actions"
4. In the tab bar, select "Actions"
5. Click on the most recent failed workflow run
6. In the upper right corner, click "Re-run jobs" then "Re-run all jobs"
7. If the build succeeds, you should see a link to the deployed website

### Automatic Publishing

- **Every time you push changes** to any branch on GitHub, a workflow automatically runs.
- **Your simulator becomes available online** at a public web address that anyone can visit.
- **The model-check reports for your branch are also published** alongside your simulator.
- **No manual steps required** - everything happens automatically in GitHub Actions.

### Accessing Your Published Simulator

- **Index page**: An index page that includes links to the latest build and all branch builds is available at `https://yourusername.github.io/your-project-name`
- **Main branch**: Your latest simulator app build for the `main` branch is available at `https://yourusername.github.io/your-project-name/latest`
- **Other branches**: Each branch gets its own URL (e.g., `https://yourusername.github.io/your-project-name/branch/feature-name`)
  - The app build for the branch is available at `https://yourusername.github.io/your-project-name/branch/feature-name/app`
  - The model-check report that compares the branch to the latest `main` build will be available at `https://yourusername.github.io/your-project-name/branch/feature-name/extras/check-compare-to-base`
  - The model-check bundle file will be available at `https://yourusername.github.io/your-project-name/branch/feature-name/extras/check-bundle.js`

### Sharing Your Work

Once published, you can share the web address with anyone. They can:

- Use your simulator directly in their web browser
- View the model-check reports to understand how the model on one branch compares to another version of the model
- Access different versions if you're working on multiple features or other changes in parallel

## For Contributors

If you are modifying SDEverywhere (the packages in this repository) and want
to use this `template-svelte` example to test your changes, you can use it directly
without copying to a separate directory.

The template already includes the "SIR" Vensim model in `model/MODEL_NAME.mdl`
and associated graph and slider configuration in the `config` directory, so it
can be used right away without following the "Quick Start" instructions.

Note that this example is already configured in `pnpm-workspace.yaml`, which
means that its dependencies (e.g., `@sdeverywhere/cli`) are already linked to
the ones from the `packages` directory in this repository; no separate linking
step is necessary.

The following assumes that you have already run `pnpm install` in the top-level
directory, and have built the local packages with `pnpm build`.

```sh
# Enter local development mode for the project (this uses `sde dev`)
pnpm dev
```

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
