const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hre.network.name;
  console.log(`Deploying to ${network}`);

  //marketplace
  console.log("Deploying marketplace contract");
  const Marketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.deployed();
  
  //auction
  console.log("Deploying Physical Auctions Contract");
  const Auction = await hre.ethers.getContractFactory("Auction");
  const auction = await Auction.deploy();
  await auction.deployed();
  
  
  //users
  console.log("Deploying User Database Contract");
  const Users = await hre.ethers.getContractFactory("Users");
  const users = await Users.deploy();
  await users.deployed();
  
  //nft auctions
  console.log("Deploying NFTAuctions contract");
  const NFTAuctions = await hre.ethers.getContractFactory("NFTAuctions");
  const nftAuctions = await NFTAuctions.deploy();
  await nftAuctions.deployed();


  //write nft marketplace data to json
  console.log("Writing Marketplace ABI");
  const data = {
    address: marketplace.address,
    abi: JSON.parse(marketplace.interface.format('json'))
  }
  
  //write physical auctions contract to json
  console.log("Writing Physical Auctions ABI");
  const auctionData = {
    address: auction.address,
    abi: JSON.parse(auction.interface.format('json'))
  }
  
  //write users contract to json
  console.log("Writing User Database ABI");
  const usersData = {
    address: users.address,
    abi: JSON.parse(users.interface.format('json'))
  }
  
  //nft auctions abi to json
  console.log("Writing NFTAuctions ABI");
  const nftAuctionsData = {
    address: nftAuctions.address,
    abi: JSON.parse(nftAuctions.interface.format('json'))
  }


  //write marketplace abi to a file
  console.log("Saving ABIs to json file");
  fs.writeFileSync(`./src/Marketplace-${network}.json`, JSON.stringify(data));

  //write phyical auctions abi to file
  fs.writeFileSync(`./src/Auctions-${network}.json`, JSON.stringify(auctionData));

  //write the Users ABI to users.json
  fs.writeFileSync(`./src/Users-${network}.json`, JSON.stringify(usersData));

  //write the nft auctions abi to a file
  fs.writeFileSync(`./src/NFTAuctions-${network}.json`, JSON.stringify(nftAuctionsData));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
