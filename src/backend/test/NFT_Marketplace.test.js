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
    describe("Purchasing marketplace items.", function(){
        let price = 2;
        beforeEach(async function(){
            //Address 1 mints an NFT
            await nft.connect(address1).mint(URI);
            //Approve the marketplace to sell the nft
            await nft.connect(address1).setApprovalForAll(marketplace.address, true);
            //Address 1 makes their nft a marketplace item
            await marketplace.connect(address1).makeItem(nft.address, 1, toWei(price));
        });
        it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event.", async function(){
            const sellerInitialEthBalance = await address1.getBalance();
            const feeAccountInitialEthBal = await deployer.getBalance();
            //Get the items totalPrice 
            let totalPriceInWei = await marketplace.getTotalPrice(1);
            //Address 2 purchases an item
            await expect(marketplace.connect(address2).purchaseItem(1, {value: totalPriceInWei}))
                .to.emit(marketplace, "Bought")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(price),
                    address1.address,
                    address2.address
                );
            const sellerFinalEthBalance = await address1.getBalance();
            const feeAccountFinalEthBal = await deployer.getBalance();
            //Seller should receive payment for the price of the NFT sold.
            expect(+fromWei(sellerFinalEthBalance)).to.equal(+price + +fromWei(sellerInitialEthBalance));
            //Fee calculation
            let fee = (feePercent/100)*price;
            //Fee Account should receive fee
            expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee+ +fromWei(feeAccountInitialEthBal))
            //The buyer should now own the nft
            expect(await nft.ownerOf(1)).to.equal(address2.address);
            //NFT traded should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true);
        });
        it("Should fail for invalid id's, sold items and when not enough ether is paid.", async function(){
            let totalPriceInWei = await marketplace.getTotalPrice(1);
            await expect(
                marketplace.connect(address2).purchaseItem(2, {value: totalPriceInWei})
            ).to.be.revertedWith("Item doesn't exist!");
            await expect(
                marketplace.connect(address2).purchaseItem(4, {value: totalPriceInWei})  
            ).to.be.revertedWith("Item doesn't exist!");
            await expect(
                marketplace.connect(address2).purchaseItem(1, {value: toWei(price)})  
            ).to.be.revertedWith("Not enough ether to cover item price and market fee!");
            //Address2 purchases item 1
            await marketplace.connect(address2).purchaseItem(1, {value: totalPriceInWei});
            await expect(
                marketplace.connect(address1).purchaseItem(1, {value: totalPriceInWei})  
            ).to.be.revertedWith("Item already sold!");
        });
    });
});

