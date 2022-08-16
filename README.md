[![Hardhat][gha-badge-hardhat]][gha-hardhat]
[![Foundry][gha-badge-foundry]][gha-foundry]
[![Slither Analysis][gha-badge-slither]][gha-slither]
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
$ rm -rf ./slither/* && slither . --hardhat-cache-directory ./hardhat_cache --hardhat-artifacts-directory ./artifacts --checklist --json ./slither/output.json --sarif ./slither/output.sarif
```

### Note: refer to [hardhat-foundry-template](https://github.com/ahmedali8/foundry-hardhat-template) for more information and commands

[gha-hardhat]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/hardhat.yml
[gha-badge-hardhat]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/hardhat.yml/badge.svg
[gha-foundry]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/foundry.yml
[gha-badge-foundry]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/foundry.yml/badge.svg
[gha-slither]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/slither.yml
[gha-badge-slither]: https://github.com/ahmedali8/project-y-smartcontracts/actions/workflows/slither.yml/badge.svg
[coverage-badge]: https://codecov.io/gh/ahmedali8/project-y-smartcontracts/branch/main/graph/badge.svg?token=Z84USEIDJX
[coverage-link]: https://codecov.io/gh/ahmedali8/project-y-smartcontracts
[prettier]: https://prettier.io
[prettier-badge]: https://img.shields.io/badge/Code_Style-Prettier-ff69b4.svg
[license]: https://unlicense.org/
[license-badge]: https://img.shields.io/badge/License-Unlicense-blue.svg
