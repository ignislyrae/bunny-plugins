# Bunny Plugins Template
This repository provides a template for developing [Bunny](https://github.com/pyoncord/Bunny) plugins.

# Installation
Head over to Bunny's plugin browser and add a repository with the URL `https://[your_username].github.io/bunny-plugins/repo.json`. This will include the repository in the plugin loading and browsing process.

# Building
To build the plugin(s), run `pnpm install` followed by `pnpm build`. The builds will be available in the `dist` directory. For development purposes, consider using the `--dev` option during the build process to ensure Bunny prioritizes your repository when loading plugins.