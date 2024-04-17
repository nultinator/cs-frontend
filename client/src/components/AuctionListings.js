import Navbar from "./Navbar";
import SepoliaAuctionJSON from "../Auctions-sepolia.json";
import OpSepoliaAuctionJSON from "../Auctions-op_sepolia.json";
import { getBanStatus } from "../report";
import axios from "axios";

import { useState, useEffect } from "react";
import AuctionTile from "./AuctionTile";
import { Link } from "react-router-dom";
import { getNetwork } from "../utils";
function AuctionListings() {
    const [data, updateData] = useState([]);
    const [banned, updateBanned] = useState([]);
    const [viewBanned, updateViewBanned] = useState(false);
    const [dataFetched, updateFetched] = useState(false);
    const [blocksPerDay, updateBlocksPerDay] = useState(7141)
    //update the display each time retrieveListings runs
    useEffect(() => {
        retrieveListings();
    }, []);

    //toggleBanned
    function toggleBannedItems() {
        if (!viewBanned) {
            updateViewBanned(true);
            updateData(banned);
        } else {
            updateViewBanned(false);
            retrieveListings();
        }
    }
    //retrieve listings
    async function retrieveListings() {
        //variable to connect to the smart contract
        let AuctionJSON;
        //get the connected network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay)
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        //unsupported network
        } else {
            alert("Unsupported network, please select one of the supported networks!");
        }
        //log the network
        console.log("network", network);
        const return_array = [];
        const bannedArray = [];
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //get the current block height
        const currBlockHeight = await provider.getBlockNumber()
        console.log("Current block", currBlockHeight)
        //connect to the contract using the AuctionJSON contract variable
        const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //get the listings
        const transaction = await contract.retrieveListings();
        //smart contract output
        console.log("Retrieve Listings", transaction);
        //Promise.all to await and return all listings
        const items = await Promise.all(transaction.map(async i => {
            //1 second timeout
            setTimeout(1000);
            //metadataURI
            if (i.metadataURI !== "") {
                const metadata = await axios.get(i.metadataURI);
                console.log("Fetching metadata", metadata);
                let item = {
                    auctionID: Number(i.auctionId),
                    start_time: Number(i.start_time),
                    end_time: Number(i.end_time),
                    seller: i.seller,
                    metadataURI: i.metadataURI,
                    metadata: metadata,
                    name: metadata.data.name,
                    image: metadata.data.image,
                    currentBid: Number(i.current_bid),
                    buyItNow: ethers.utils.formatEther(i.buyItNowPrice)    
                }
                const banned = await getBanStatus(item.metadataURI);
                console.log("Ban status:", banned);
                if (!banned) {
                    return_array.push(item);
                } else {
                    bannedArray.push(item);
                }
            } else {
                console.log("metadata not found!");
                let item = {
                    auctionID: Number(i.auctionId),
                    start_time: Number(i.start_time),
                    end_time: Number(i.end_time),
                    seller: i.seller,
                    metadataURI: "",
                    metadata: "",
                    name: "",
                    image: "",
                    currentBid: Number(i.current_bid),
                    buyItNow: ethers.utils.formatEther(i.buyItNowPrice)
    
                }
                //log the item
                console.log("Item", item)
                if (item.end_time > currBlockHeight) {
                    //add it to the return array
                    return_array.push(item);
                }
                console.log("return array");
                return return_array;
            }
        }));
        //update the data with the reverse of the return array
        //we want to view newest items FIRST!!!
        console.log("Return array to update data with:", return_array);
        updateData(return_array.reverse());
        updateBanned(bannedArray);
    }

    


    return(
        <div>
            <Navbar></Navbar>
            <h1>Hello from The Auction Listings Page</h1>
            <div className="centered-container">
                <h2>Live Auctions</h2>
                {
                    viewBanned &&
                    <div>
                        {
                            banned.map((value, index) => {
                                <div>
                                    <AuctionTile data={value} key={index}></AuctionTile>
                                </div>
                            })
                        }
                    </div>
                }
                <div>
                    {data.map((value, index) => {
                    return (
                    <div>
                        <AuctionTile data={value} key={index}></AuctionTile>
                    </div>);
                    })}
                    <button className="report-button" onClick={toggleBannedItems}>View Banned</button>
                </div>
                <div>
                    {data.length === 0 ?
                    <div>
                    There are currently not items listed for sale... 
                    <Link to="/Auctions">Create One!</Link>
                    </div>
                    :
                    ""}
                </div>
            </div>
        </div>
    );
}

export default AuctionListings;