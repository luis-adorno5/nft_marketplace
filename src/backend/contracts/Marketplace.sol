//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "@openzeppelin/contracts/security/ReentrencyGuard.sol";

contract Marketplace is ReentrancyGuard {
    address payable public immutable feeAccount; //Account that receives fees
    uint256 public immutable feePercent; //Fee percentage on sales
    uint256 public itemCount;

    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }
}
