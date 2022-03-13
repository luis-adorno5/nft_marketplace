/* eslint-disable jest/valid-describe-callback */
const { expect } = require("chai");
const { ethers } = require("hardhat");

// eslint-disable-next-line jest/valid-describe-callback
describe("NFTMarketplace", async function(){
    let deployer, address1, address2, nft, marketplace;
    let feePercent = 1;
    let URI = "Sample URI";

    beforeEach(async function(){
        //Get Contract factories
        const NFT = await ethers.getContractFactory("NFT");
        const Marketplace = await ethers.getContractFactory("Marketplace");

        //Get Signers
        [deployer, address1, address2] = await ethers.getSigners();

        //Deploy Contracts
        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);
    });
    
    describe("Deployments", async function(){
        it("Should track name and symbol of the NFT collection.", async function(){
            expect(await nft.name()).to.equal("DApp NFT");
            expect(await nft.symbol()).to.equal("DAPP");
        });
        it("Should track the feeAccount and feePercent of the marketplace.", async function(){
            expect(await marketplace.feeAccount()).to.equal(deployer.address);
            expect(await marketplace.feePercent()).to.equal(feePercent);
        });
    });
    describe("Minting NFTs.", function(){
        it("Should track each minted nft.", async function(){
            //Address 1
            await nft.connect(address1).mint(URI);
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(address1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);
            //Address 2
            await nft.connect(address2).mint(URI);
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(address2.address)).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);
        });
    });

});