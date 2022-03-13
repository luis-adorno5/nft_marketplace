/* eslint-disable jest/valid-describe-callback */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

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
    describe("Making marketplace items.", function(){
        beforeEach(async function(){
            //Mint NFT
            await nft.connect(address1).mint(URI);
            //address1 approves Marketplace to spend NFT
            await nft.connect(address1).setApprovalForAll(marketplace.address, true);
        });
        it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event.", async function() {
            //For sale at marketplace for 1 ether.
            await expect(marketplace.connect(address1).makeItem(nft.address, 1, toWei(1)))
                .to.emit(marketplace, "Offered")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(1),
                    address1.address
                )
                //Check to see if Marketplace is the new owner of the NFT
                expect(await nft.ownerOf(1)).to.equal(marketplace.address);
                //Item count on the marketplace should be 1
                expect(await marketplace.itemCount()).to.equal(1);
                //Get item from items mapping then check the fields to ensure they are correct.
                const item = await marketplace.items(1);
                expect(item.itemId).to.equal(1);
                expect(item.nft).to.equal(nft.address);
                expect(item.tokenId).to.equal(1);
                expect(item.price).to.equal(toWei(1));
                expect(item.sold).to.equal(false);


        });
        it("Should fail of the price is set to 0", async function(){
            await expect(
                marketplace.connect(address1).makeItem(nft.address, 1, 0)
                ).to.be.revertedWith("Price must be greater than 0!!!");
        });
    });

});