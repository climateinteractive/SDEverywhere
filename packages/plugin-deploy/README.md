# @sdeverywhere/plugin-deploy

This package provides a build plugin that simplifies the process of deploying an [SDEverywhere](https://github.com/climateinteractive/SDEverywhere)-generated app to a web server.

Currently this plugin supports deploying to [GitHub Pages](https://docs.github.com/en/pages), a free static site hosting service that is connected to a given GitHub repository.
Support for other hosting services (e.g., [GitLab Pages](https://docs.gitlab.com/user/project/pages/), [AWS S3](https://aws.amazon.com/s3/)) is on the roadmap.

## Quick Start

The best way to get started with SDEverywhere is to follow the [Quick Start](https://github.com/climateinteractive/SDEverywhere#quick-start) instructions.
If you follow those instructions, the `@sdeverywhere/plugin-deploy` package will be added to your project automatically, in which case you can skip the next section and jump straight to the ["Usage"](#usage) section below.

## Install

```sh
# npm
npm install --save-dev @sdeverywhere/plugin-deploy

# pnpm
pnpm add -D @sdeverywhere/plugin-deploy

# yarn
yarn add -D @sdeverywhere/plugin-deploy
```

## Usage

_Note:_ If you followed the "Quick Start" instructions above and/or are using one of the standard project templates provided by SDEverywhere, the `sde.config.js` file should already be set up to use `plugin-deploy`.
Reading these instructions can still be helpful if you are setting up a project manually or want to understand how `plugin-deploy` can be integrated into your project.

To get started:

1. Add `@sdeverywhere/plugin-deploy` as a project "dev" dependency:

```sh
cd your-model-project
npm install --save-dev @sdeverywhere/plugin-deploy
```

2. Update your `sde.config.js` file to use `plugin-deploy`. Make sure that `deployPlugin` is the last step in the `plugins` array:

```js
import { deployPlugin } from '@sdeverywhere/plugin-deploy'

export async function config() {
  return {
    // ...

    plugins: [
      // ...

      // Make sure that `deployPlugin` is the last step, since it depends on the output of
      // earlier plugins
      deployPlugin({
        // Include options here if needed
      })
    ]
  }
}
```

3. Update your GitHub Actions workflow to run `sde bundle`.

## How It Works

### Overview

At a high level, this plugin has two main functions:

- It copies build products (e.g., your app, model-check bundle, model-check report, etc) to an ideal structure in the `sde-staged` folder.
- It stores the contents of the `sde-staged` folder in a separate ("orphan") `artifacts` branch in your Git repository.

Once the build products are added to the `artifacts` branch, they can be published to GitHub Pages in a GitHub Actions workflow that runs each time you push changes to your repository (see "Deploying in GitHub Actions" below for an example).

### The `sde-staged` directory

This plugin creates the `sde-staged` directory in your current branch and copies your app, model-check files, etc to that directory.
The `sde-staged` directory structure is as follows:

```
  sde-staged/
  ├── app
  |   ├── index.html              # App entrypoint
  |   ├── assets/                 # App assets
  └── extras/
      ├── check-bundle.js         # The model-check bundle file
      └── check-compare-to-base/  # The model-check report
```

### The `artifacts` branch and directory

Once the `sde-staged` directory is populated, this plugin folds the contents of `sde-staged` into the `artifacts` branch, which contains build artifacts for all branches that have been built.
The `artifacts` directory structure is as follows:

```
  artifacts/
  ├── index.html             # Top-level index.html file
  ├── latest/
  |   ├── index.html         # Main branch app
  |   ├── assets/            # Main branch assets
  ├── branch/
  |   ├── main/
  |   │   ├── app/           # Main branch app files
  |   │   └── extras/        # Main branch check bundles and reports
  |   ├── chris/1234-test/
  |   │   ├── app/           # Feature branch app files
  |   │   └── extras/        # Feature branch check bundles and reports
  |   └── feature/new-ui/
  |       ├── app/           # Feature branch app files
  |       └── extras/        # Feature branch check bundles and reports
  └── metadata/
      ├── bundles.json       # Listing of available bundles
      └── index.json         # Listing of available branch builds
```

The top-level `index.html` file and `metadata` directory are updated with each build:

- The `index.html` file provides a convenient overview of the available branch build links that can be accessed during development of your model.
- The `metadata/index.json` file is used to keep track of all available branch builds and is used to create the top-level `index.html` file.
- The `metadata/bundles.json` file is used to keep track of all available bundles, mainly for use by the model-check tool, which allows selecting any available bundle.

### Deploying in GitHub Actions

Once the `artifacts` branch is updated, the `artifacts` directory can be published to GitHub Pages to make the entire directory structure available at the public URL.

The easiest way to deploy automatically is to create a GitHub Actions workflow that runs every time you push changes to your repository.
See below for an example workflow, which you can add to `.github/workflows/build.yaml` in your project.

_Note:_ If you followed the "Quick Start" instructions above and are using one of the standard project templates provided by SDEverywhere, the template should already contain a `.github/workflows/build.yaml` file.
If so, your project is already set up to deploy to GitHub Pages.

<details>
<summary>Click to show example GitHub Actions workflow</summary>

```yaml
#
# This workflow builds the app and model-check reports, stores them in the `artifacts` branch,
# then deploys the updated `artifacts` directory to GitHub Pages.
#

name: Build

on:
  # Run this workflow on every push to any branch except the special `artifacts` branch
  push:
    branches:
      - '**'
      - '!artifacts'
  # Allow for running this workflow manually from the Actions tab
  workflow_dispatch:

# Set the GITHUB_TOKEN permissions to allow deployment to GitHub Pages
permissions:
  # Allow pushing to the `artifacts` branch
  contents: write
  # Allow deployment to GitHub Pages
  pages: write
  id-token: write

# Allow one concurrent build
concurrency:
  group: 'build'

jobs:
  build:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Check out current branch
        uses: actions/checkout@v5
        with:
          # Fetch full history for `artifacts` branch operations
          fetch-depth: 0

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: ./scripts/ci-build.js

      - name: Check out artifacts branch
        run: git checkout artifacts

      - name: Set up GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload GitHub Pages artifacts
        uses: actions/upload-pages-artifact@v4
        with:
          path: './artifacts'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

</details>

## Documentation

API documentation (for plugin configuration options) is available in the [`docs`](./docs/index.md) directory.

## License

SDEverywhere is distributed under the MIT license. See `LICENSE` for more details.
