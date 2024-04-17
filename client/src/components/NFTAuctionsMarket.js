import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import SepoliaNFTAuctionsJSON from "../NFTAuctions-sepolia.json";
import OpSepoliaNFTAuctionsJSON from "../NFTAuctions-op_sepolia.json";
import { SERVER_LOCATION, getNetwork } from "../utils";
import { getBanStatus } from "../report";
import axios from "axios";
import { useState, useEffect } from "react";
import { useParams } from "react-router";

export default function NFTAuctionsMarket() {

    const [data, updateData] = useState([]);
    const [banned, updateBanned] = useState([]);
    const [viewBanned, updateViewBanned] = useState(false);
    const [auctionData, updateAuctionData] = useState([]);
    const [dataFetched, updateDataFetched] = useState(false);
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);


    function toggleBannedItems() {
        console.log("viewbanned clicked");
        if (!viewBanned) {
            updateViewBanned(true);
            updateData(banned);
        } else {
            updateViewBanned(false);
            displayAuctionData();
        }
    }


    async function getNFTAuctions() {
        let NFTAuctionsJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        if (network.network === "sepolia testnet") {
            NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
        } else if (network.network === "optimism sepolia") {
            NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
        }
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = await provider.getSigner()
        const auctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);

        const tokens = await auctionsContract.retrieveNFTAuctions();
        return tokens
    }

    //works on eth-sepolia, needs tested on opt-sepolia
    async function getNFTsHeldByAddress(address) {
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        console.log("network", network);
        //create an array to hold the user's nfts
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
        //we got the nfts, return them to whatever is calling them
        return nfts_array.data.ownedNfts;
    }

    async function displayAuctionData() {
        let NFTAuctionsJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        console.log("network", network);
        if (network.network === "sepolia testnet") {
            NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
        } else if (network.network === "optimism sepolia") {
            NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
        } else {
            alert("Unsupported network!");
        }
        const bannedArray = [];
        const return_array = [];
        let nftAuctionData = await getNFTsHeldByAddress(NFTAuctionsJSON.address);
        console.log("Nfts held by auction smart contract address", nftAuctionData);
        const items = await Promise.all(nftAuctionData.map(async i => {
        let item = {
            contractAddress: i.contract.address,
            tokenId: Number(i.tokenId),
            name: i.name,
            description: i.description,
            image: i.image.originalUrl,
            metadata: i.raw.tokenUri
        }
        const banned = await getBanStatus(item.metadata);
        if (!banned) {
            return_array.push(item);
        } else {
            bannedArray.push(item);
        }
    }));
        updateData(return_array);
        updateBanned(bannedArray);
    }

    if (!dataFetched) {
        displayAuctionData();
        updateDataFetched(true);
        console.log("Data", data);
    }

    return(
        <div>
            <Navbar></Navbar>

            {
                viewBanned &&
                <div>
                    {
                        banned.map((value, index) => {
                            return <NFTTile data={value} key={index}></NFTTile>
                        })
                    }
                </div>
            }
            <div>
                {data.map((value, index) => {
                    return <NFTTile data={value} key={index}></NFTTile>;
                })}

            </div>
            <button className="report-button" onClick={toggleBannedItems}>View Banned</button>
        </div>
    )
}