import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import SepoliaMarketplaceJSON from "../Marketplace-sepolia.json";
import OpSepoliaMarketplaceJSON from "../Marketplace-op_sepolia.json";
import { SERVER_LOCATION, getNetwork } from "../utils";
import cs_img2 from "../cs_img2.jpg";



import axios from "axios";
import { useState, useEffect } from "react";
import { useParams } from "react-router";


var sampleData = [
    
    {
        "name": "NFT#1",
        "description": "Please Login To View NFTs",
        "website":"https://chosensanctuary.com",
        "image":"../cs_img2.jpg",
        "price":"0.03ETH",
        "currentlySelling":"True",
        "address":"0xe81Bf5A757CB4f7F82a2F23b1e59bE45c33c5b13",
    }
    
];


export default function Marketplace() {

    const [data, updateData] = useState(sampleData);
    const [auctionData, updateAuctionData] = useState(sampleData);
    const [dataFetched, updateFetched] = useState(false);
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);
    useEffect(() => {
        getAllNFTs();
    }, []);



//retrieve nft data about a specific address
//tweak for multiple networks
async function getNFTData(address) {
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    let url = `${SERVER_LOCATION}/getNFTData/address?address=${address}`;
    let data = await axios.get(url, {
        headers: {
            network: network.network
        }
    }).catch((error) => {
        console.log("error:", error);
        return;
    });
    console.log("GETNFTDATA", data);
    return data;
}
//tweak for multiple networks
async function getNFTsHeldByAddress(address) {
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    console.log("Client network", network);
    //create an array to hold the user's nfts
    console.log("Address", address);  
    let url = `${SERVER_LOCATION}/getHeldByAddress/address?address=${address}`;  
    //make the get request
    const nfts_array = await axios.get(url, {
        headers: {
            network: network.network
        }
    }).catch((error) => {
    //return immediately in the event of an error
      console.log("error", error);
      return;
    });
    //console.log("address nft info", nfts_array);
    //we got the nfts, return them to whatever is calling them
    console.log("NFT ARRAY", nfts_array.data);
    return nfts_array.data.ownedNfts;
}


async function getAllNFTs() {
    let MarketplaceJSON;
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    console.log("Current network", network);
    if (network.network === "sepolia testnet") {
        MarketplaceJSON = SepoliaMarketplaceJSON;
    } else if (network.network === "optimism sepolia") {
        MarketplaceJSON = OpSepoliaMarketplaceJSON;
    } else {
        alert("Unsupported network!");
    }
    //create an array to hold the NFT objects
    const return_array = [];

    //import ethers
    const ethers = require("ethers");
    console.log("imported ethers");
    //After adding your Hardhat network to your metamask, this code will get providers and signers
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    console.log("talking to metamask");
    const signer = provider.getSigner();
    console.log("connected to wallet", signer);
    //Pull the deployed contract instance
    let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
    console.log("Connected to contract");
    const contractAddress = MarketplaceJSON.address;
    //fetch and log NFTs held by the contract
    console.log("Contract address: ", contractAddress);
    const listedNFTs = await getNFTData(contractAddress);
    console.log("Listed NFTs", listedNFTs);
    console.log("getting nfts held by address");
    let transaction = await getNFTsHeldByAddress(MarketplaceJSON.address);
    console.log("nftsHeldbyAddress", transaction);

    //Fetch all the details of every NFT from the contract and display
    const items = await Promise.all(transaction.map(async i => {
        //price is held in the token metadata
        //const price = i.metadata.price;

        let item = {
            //price,
            //convert the price to a readable number from hex
            tokenId: Number(i.tokenId),
            description: i.description,
            website: "https://chosensanctuary.eth",
            //seller: i.seller,
            image: i.image.originalUrl,
            name: i.name,
            contractAddress: i.contract.address,
        }
        console.log(`ITEM\n${JSON.stringify(item)}`);
        return_array.push(item);
    }))

    
    //console.log("global return array", return_array);
    //const params = useParams();

    const tokenHeight = await contract.getCurrentToken();
    const listHeight = await contract.getCurrentListHeight();
    console.log("Current token amount", Number(tokenHeight._hex));
    console.log("Current List Height", Number(listHeight._hex));
    updateData(return_array);
}

//Render the info Below
return (
    <div>
        <Navbar></Navbar>
        <div className="flex flex-col place-items-center mt-20">
            <div className="md:text-xl font-bold text-white">
                Welcome to the CS Marketplace
           </div>
            <div className="flex mt-5 justify-between flex-wrap max-w-screen-xl text-center">
                {data.map((value, index) => {
                    return <NFTTile data={value} key={index}></NFTTile>;
                })}
            </div>
        </div>            
    </div>
);

}
