require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
const fs = require('fs');
// const infuraId = fs.readFileSync(".infuraid").toString().trim() || "";

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/nAhiCHKvZkhkp4A7PkkCIBON0-BXW26d`,
      //accounts: [process.env.privateKey]
    },
    matic: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/nAhiCHKvZkhkp4A7PkkCIBON0-BXW26d",
      //accounts: [process.env.privateKey]
    },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/fnMf0fAnFcLpDfuehBug4QJacu_FlsTm",
      accounts: [ "REDACTED" ]
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/_QJrhfW7DpQnqJQiwZBB7YnEaHTKwzzM",
      accounts: [ "REDACTED"]
    },
    op_sepolia: {
      url: "https://opt-sepolia.g.alchemy.com/v2/sW6UvkW8vEOR23guFd0eypcHIU9lOXMR",
      accounts: [ "REDACTED" ],
      gasPrice: 8000000000
    }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};