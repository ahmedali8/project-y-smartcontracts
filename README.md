[![Github Actions][gha-badge]][gha]
[![Code Coverage][coveralls-badge]][coveralls]
[![Prettier][prettier-badge]][prettier]
[![License][license-badge]][license]

# Project Y Smartcontracts

```bash
# Clone repo
$ git clone https://github.com/ahmedali8/project-y-smartcontracts

# Initialize submodule dependencies
$ git submodule update --init --recursive

# Install development dependencies
$ yarn install
```

```bash
$ rm -rf ./slither/* && slither . --hardhat-cache-directory ./generated/cache/hardhat --hardhat-artifacts-directory ./generated/artifacts/hardhat --checklist --json ./slither/output.json --sarif ./slither/output.sarif
```

### Note: refer to [hardhat-foundry-template](https://github.com/ahmedali8/foundry-hardhat-template) for more information and commands

[gha]: https://github.com/ahmedali8/project-y-smartcontracts/actions
[gha-badge]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/hardhat-ci.yml/badge.svg
[coveralls]: https://coveralls.io/github/ahmedali8/project-y-smartcontracts?branch=main
[coveralls-badge]: https://coveralls.io/repos/github/ahmedali8/project-y-smartcontracts/badge.svg?branch=main&t=ssK3fj
[prettier]: https://prettier.io
[prettier-badge]: https://img.shields.io/badge/Code_Style-Prettier-ff69b4.svg
[license]: https://unlicense.org/
[license-badge]: https://img.shields.io/badge/License-Unlicense-blue.svg
