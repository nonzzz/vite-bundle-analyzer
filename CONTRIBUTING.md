# Contributing

## Reporting Issues and Asking Questions

Before opening an issue, please search the issue tracker to make sure your issue
hasn't already been reported. Please note that your issue may be closed if it
doesn't include the information requested in the issue template.

## Getting started

Visit the issue tracker to find a list of open issues that need attention.

Fork, then clone the repo:

```shell
git clone https://github.com/your-username/vite-bundle-analyzer.git
```

Make sure you have Node.js installed at version equal to or greater than the one specified in `.node-version` file and have Make tool. Then install the package dependencies:

```shell
make
```

## Run test

```shell
make test
```

## Compile and build

```shell
make build-all
```

## Typical Editor setup

### VS Code

If you're using Visual Studio Code, we recommend the following setup for the
best experience.

#### Extensions

We recommend you have the following extensions installed:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Dprint Code Formatter](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)

Turn off your local config.
