import Navbar from "./Navbar";
import SepoliaAuctionJSON from "../Auctions-sepolia.json";
import OpSepoliaAuctionJSON from "../Auctions-op_sepolia.json"
import SepoliaNFTAuctionsJSON from "../NFTAuctions-sepolia.json";
import OpSepoliaNFTAuctionsJSON from "../NFTAuctions-op_sepolia.json";
import { useState } from "react";
import AuctionTile from "./AuctionTile";
import NFTTile from "./NFTTile";
import { SERVER_LOCATION, getNetwork } from "../utils";
import axios from "axios";

function ViewMyBids() {

    const [dataFetched, updateDataFetched] = useState(false);
    const [auctionData, updateAuctionData] = useState([]);
    const [nftAuctionData, updateNFTAuctionData] = useState([]);
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);
    const [wantsToView, updateWantsToView] = useState("auctions"); 
    const [switchView, updateSwitchView] =  useState("NFT Auctions");
    //const [currAddress, updateCurrAddress] = useState("0x");

    function toggleList() {
        if (wantsToView === "auctions") {
            updateWantsToView("nftAuctions");
            updateSwitchView("Physical Auctions");
        } else if (wantsToView === "nftAuctions") {
            updateWantsToView("auctions");
            updateSwitchView("NFT Auctions");
        } else {
            alert("Error toggling the view list");
        }
    }

    async function getMyAuctions() {
        let AuctionJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        } else {
            alert("Unsupported network!");
        }
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress()
        const auctionsContract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        const auctionList = await auctionsContract.retrieveListings();
        console.log("Physical Auctions:", auctionList);

        const auctionArray = [];
        
        const items = await Promise.all(auctionList.map(async i => {
            const metadata = await axios.get(i.metadataURI);
            const item = {
                auctionID: Number(i.auctionId),
                start_time: Number(i.start_time),
                end_time: Number(i.end_time),
                currentBid: Number(i.current_bid),
                buyItNow: ethers.utils.formatEther(i.buyItNowPrice),
                seller: i.seller,
                metadata: metadata,
                image: metadata.data.image[0],
                highestBidder: i.highest_bidder,
            }
            if (item.highestBidder.toLowerCase() === address.toLowerCase()) {
                auctionArray.push(item);
            }
        }))
        console.log("Auction Array:", auctionArray);
        updateAuctionData(auctionArray);
    }
    async function getMyNFTAuctions() {
        let NFTAuctionsJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        if (network.network === "sepolia testnet") {
            NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
        } else if (network.network === "optimism sepolia") {
            NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
        } else {
            alert("Unsupported network!");
        }
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);

        const nftAuctionsList = await nftAuctionsContract.retrieveNFTAuctions();
        console.log("nftAuctionsList", nftAuctionsList);
        const nftAuctionArray = [];
        
        const items = await Promise.all(nftAuctionsList.map(async i => {
            
            const metadata = await axios.get(`${SERVER_LOCATION}/getTokenMetaData?contractAddress=${i.tokenContractAddress}&tokenId=${i.tokenId}`, {
                headers: {
                    network: network.network
                }
            });
            
           //const infoFromContract = metadata;
           console.log("token info metadata", metadata);
            const item = {

                tokenId: Number(i.tokenId),
                description: metadata.data.raw.metadata.description,
                //website: "https://chosensanctuary.eth",
                seller: i.seller,
                image: metadata.data.image.originalUrl,
                //name: i.title,
                contractAddress: i.tokenContractAddress,
                highestBidder: i.highestBidder,
                paid: i.paid                              
            }
            console.log("Highest bidder:", item.highestBidder.toLowerCase());
            console.log("Current address:", address.toLowerCase());
            if (item.highestBidder.toLowerCase() === address.toLowerCase()){
                nftAuctionArray.push(item);
            }
            
        }));
        updateNFTAuctionData(nftAuctionArray);
    }

    async function setAllData() {
        await getMyAuctions();
        await getMyNFTAuctions();
        
    }

    if (!dataFetched) {
        //getMyAuctions();
        //getMyNFTAuctions();
        setAllData();
        updateDataFetched(true);
        console.log("NFT Auction data:", nftAuctionData);
    }

    return(
        <div>
            <Navbar></Navbar>
            <h1 style={{
                color: "white"
            }}>Hello from the "View My Bids" page</h1>
            <button onClick={toggleList}>Switch to {switchView}</button>
            <div style={{
                color: "white"
            }}>
                This page is currently under construction.  Please report any bugs you find!
            </div>
            <div style={{color: "white"}}>Physical Auctions
                {   
                    wantsToView === "auctions" &&
                    auctionData.map((value, index) => {
                        return (
                            <div>
                                <AuctionTile data={value} key={index}></AuctionTile>
                            </div>
                        )
                    })
                }
            </div>
            <div style={{color: "white"}}>NFT Auctions
                {
                    wantsToView === "nftAuctions" &&
                    nftAuctionData.map((value, index) => {
                        return (
                            <div>
                                <NFTTile data={value} key={index}></NFTTile>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export default ViewMyBids;