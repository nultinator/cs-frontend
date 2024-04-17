import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import axios from "axios";
import { useState } from "react";
import NFTTile from "./NFTTile";
import { SERVER_LOCATION, getNetwork } from "../utils";

export default function Profile() {
    const [data, updateData] = useState([]);
    const [dataFetched, updateFetched] = useState(false);
    const [address, updateAddress] = useState("0x");
    const [totalPrice, updateTotalPrice] = useState("0");
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);

    const approvedImageFiles = ["png", "jpg", "jpeg", "gif"];
    const dummyAddress = "0x0000000000000000000000000000000000000000";


    //tweak this function for multiple networks
    async function getNFTsHeldByAddress(address) {
        const networkData = await getNetwork();
        updateBlocksPerDay(networkData.blocksPerDay);
        const network = networkData.network;
        //create an array to hold the user's nfts
        let nfts_array = [];        
        console.log("Fetching nfts");
        const url = `${SERVER_LOCATION}/getHeldByAddress/address?address=${address}`   
        console.log("trying", url);
        console.log("network", network);
        //make the get request
        nfts_array = await axios.get(url, {
            headers: {
                network: network
            }
        }).catch((error) => {
        //return immediately in the event of an error
          console.log("error", error);
          return;
        });
        console.log("address nft info", nfts_array);
        //we got the nfts, return them to whatever is calling them
        return nfts_array.data.ownedNfts;
    }
    
    //get the user's nft data for the display
    async function getNFTData(tokenId) {
        //import ethers
        const ethers = require("ethers");
        console.log("imported ethers");
        //attempt to connect to user wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log("Connecting to wallet");
        //user signs and authorizes the connection
        const signer = provider.getSigner();
        //get the user's address
        const addr = await signer.getAddress();
        console.log("connected to", addr);
        //get list of tokens held by the user
        let tokens = await getNFTsHeldByAddress(addr);
        console.log("Tokens in wallet:", tokens);
        //declare a constant and await the result of the process below
        const items = await Promise.all(tokens.map(async i => {
            //properties of each token that we will use in our UI
            const tokenURI = await i.tokenUri;
            let meta = i.raw.metadata;
            let name = i.name;
            let item = {
                //need to convert from hex to standard number format
                tokenId: Number(i.tokenId),
                //should be a string with an approved file extension
                image: i.image.originalUrl,
                //should be a string
                name: i.name,
                //should be a string
                description: i.description,
                //should be a string beginning with "0x"
                contractAddress: i.contract.address,
                //sale status, this token is held by the user's wallet, it is NOT for sale
                paid: "NOT FOR SALE",
            }
            //mutable variable to see if we can display
            var canDisplay = true;
            //if the item name is not a string, can't display
            if (typeof item.name !== "string") {
                canDisplay = false;
            } else if (typeof item.tokenId !== "number") {
                canDisplay = false;
            //if the image is null, can't display
            } else if (item.image === null) {
                canDisplay = false;
            //if the image type is string, check for an approved file extension
            } else if (typeof item.image === "string") {
                const imageStringArray = item.image.split(".");
                const fileExtension = imageStringArray[imageStringArray.length-1];
                //if the file extension is not in our list of approved, can't display
                if (!approvedImageFiles.includes(fileExtension)) {
                    canDisplay = false;
                }
            //if the item description is not a string, can't display
            } else if (typeof item.description !== "string") {
                canDisplay = false;
            //if the contract address of the token is a dummy address, can't display
            } else if (item.contractAddress === dummyAddress) {
                canDisplay = false;
            //nft is displayable, log this information
            } else {
                console.log("NFT data is proper");
            }
            //if we can display, add the item to our array
            if (canDisplay) {
                return item;
            //if we can't, add null to the promised array
            } else {
                return null;
            }
        }));
        //drop all nulls from the array
        const filteredItems = items.filter(element => element !== null);
        //we have our data, now to give it to React
        updateData(filteredItems);
        updateFetched(true);
        updateAddress(addr);
    }


    const params = useParams();
    const tokenId = params.tokenId;
    const contractAddress = params.contractAddress;
    console.log("Profile Page params", params);
    if(!dataFetched)
        getNFTData(tokenId);
    //return and render the jsx below to the user
    return (
        <div className="profile">
            <Navbar></Navbar>
            <div>
                <div>
                <div>
                    <h2>Wallet Address: {address}</h2>  
                </div>
            </div>
            <div>
                    <div>
                        <h2>No. of NFTs: {data.length}</h2>
                    </div>
                    <div>
                        <h2>Total Value: {totalPrice} ETH</h2>
                    </div>
            </div>
            <div>
                <h1 className="profile-heading">Your NFTs</h1>
                <div className="profile">
                    {data.map((value, index) => {
                    return (
                    <div>
                        <NFTTile data={value} key={index}></NFTTile>
                    </div>);
                    })}
                </div>
                <div>
                    {data.length == 0 ? "Oops, No NFT data to display (Is your wallet connected?)":""}
                </div>
            </div>
            </div>
        </div>
    )
    }
