Applura CLI
---

## Overview

This package contains the official command-line utility for the Applura platform.

Use it to manage local deploy keys and deploy front-end application code.

## Usage

To add a deploy key generated via the web interface, run:

```shell
npx applura deploy-key setup
```

To deploy code from your terminal, run:

```shell
npx applura deploy $distDir
```

Where `$distDir` is a file path pointing to the directory of already compiled
front-end files you would like to deploy—not a directory of source files.

