[![Github Actions][gha-badge]][gha]
[![Code Coverage][coverage-badge]][coverage-link]
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
# Slither
$ rm -rf ./slither/* && slither . --hardhat-cache-directory ./generated/cache/hardhat --hardhat-artifacts-directory ./generated/artifacts/hardhat --checklist --json ./slither/output.json --sarif ./slither/output.sarif
```

### Note: refer to [hardhat-foundry-template](https://github.com/ahmedali8/foundry-hardhat-template) for more information and commands

[gha]: https://github.com/ahmedali8/project-y-smartcontracts/actions
[gha-badge]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/hardhat.yml/badge.svg
[coverage-badge]: https://codecov.io/gh/ahmedali8/project-y-smartcontracts/branch/main/graph/badge.svg?token=Z84USEIDJX
[coverage-link]: https://codecov.io/gh/ahmedali8/project-y-smartcontracts
[prettier]: https://prettier.io
[prettier-badge]: https://img.shields.io/badge/Code_Style-Prettier-ff69b4.svg
[license]: https://unlicense.org/
[license-badge]: https://img.shields.io/badge/License-Unlicense-blue.svg
