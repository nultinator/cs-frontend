//import ethers from "ethers";

export const SERVER_LOCATION = "http://localhost:5000/api";

export const GetIpfsUrlFromPinata = (pinataUrl) => {
    console.log("Pinata url", pinataUrl);
    var IPFSUrl = pinataUrl.replace("https://gateway.pinata.cloud/", "https://ipfs.io/");
    //const lastIndex = IPFSUrl.length;
    //IPFSUrl = "https://ipfs.io/ipfs/"+IPFSUrl[lastIndex-1];
    return IPFSUrl;
};

export async function getNetwork() {
    const ethers = require("ethers");

    const chainId = await window.ethereum.request( {method: "eth_chainId"});
  
    const readableId = Number(chainId);
  
    if (readableId === 11155111) {
      //alert("You are currently connected on Sepolia!");
      return {
        network: "sepolia testnet",
        blocksPerDay: 7141
      }
    } else if (readableId === 11155420) {
      return {
        network: "optimism sepolia",
        blocksPerDay: 43_000
      }
    } else if (readableId === 420) {
      //alert("You are currently connected on Optimism Goerli!");
      return "optimism goerli";
    } else {
        alert("Unsupported network!");
    }
  }
