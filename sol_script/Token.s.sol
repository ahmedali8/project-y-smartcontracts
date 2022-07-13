// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "forge-std/Script.sol";

contract TokenScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // deploy our contract

        vm.stopBroadcast();
    }
}
