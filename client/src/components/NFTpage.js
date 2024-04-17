import Navbar from "./Navbar";
import { Link, useParams } from 'react-router-dom';
import SepoliaMarketplaceJSON from "../Marketplace-sepolia.json";
import OpSepoliaMarketplaceJSON from "../Marketplace-op_sepolia.json";
import SepoliaNFTAuctionsJSON from "../NFTAuctions-sepolia.json";
import OpSepoliaNFTAuctionsJSON from "../NFTAuctions-op_sepolia.json";
import erc721ABI from "../erc721ABI.json";
import axios from "axios";
import { useState } from "react";
import { SERVER_LOCATION, GetIpfsUrlFromPinata, getNetwork } from "../utils";
import { isAdmin, liftBan } from "../adminAuth";

export default function NFTPage (props) {



//variables used in rendering
const [formParams, updateFormParams] = useState({ price: '', donationPercentage: '', collection: '', auctionLength: ''});
const [data, updateData] = useState({});
const [dataFetched, updateDataFetched] = useState(false);
const [message, updateMessage] = useState("");
const [currAddress, updateCurrAddress] = useState("0x");
const [bidFormParams, updateBidFormParams] = useState({buyItNow: '', bidPrice: '',endTime: '', paid: false});
const [currentBlock, updateBlockHeight] = useState(0);
const [saleStatus, updateSaleStatus] = useState("Fetching Sale Type");
const [wantsToSell, updateWantsToSell] = useState(false);
const [adminStatus, updateAdminStatus] = useState(false);

const bidStep = 0.001;
const [blocksPerDay, updateBlocksPerDay] = useState(7141);
const [sellButtonMessage, updateSellButtonMessage] = useState("List This NFT");
const [sellButtonBackgroundColor, updateSellButtonBackgroundColor] = useState("green");
const [wantsToAuction, updateWantsToAuction] = useState(false);
const [wantsFixedPrice, updateWantsFixedPrice] = useState(false);

//toggle wants fixed price
function toggleWantsFixedPrice() {
    if (!wantsFixedPrice) {
        updateWantsFixedPrice(true);
        updateWantsToAuction(false);
    } else if (wantsFixedPrice) {
        updateWantsFixedPrice(false);
    } else {
        alert("An error occurred, please try again!");
    }
}

//toggle wants to auction
function toggleWantsToAuction() {
    if (!wantsToAuction) {
        updateWantsToAuction(true);
        updateWantsFixedPrice(false);
    } else if (wantsToAuction) {
        updateWantsToAuction(false);
    } else {
        alert("An error occurred, please try again!");
    }
}

//toggle wants to sell
function toggleSaleButton() {
    if (wantsToSell) {
        updateWantsToSell(false);
        updateWantsFixedPrice(false);
        updateWantsToAuction(false);
        updateSellButtonMessage("List This NFT");
        updateSellButtonBackgroundColor("green");
    } else if (!wantsToSell) {
        updateWantsToSell(true);
        updateSellButtonMessage("Don't List This NFT");
        updateSellButtonBackgroundColor("red");
    } else {
        alert("An error occured, please try the button again!");
    }
}

//tweak this function for multiple networks
async function getTokenOwner(contractAddress, tokenId) {
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay)
    const baseURL = `${SERVER_LOCATION}/getTokenOwner?contractAddress=${contractAddress}&tokenId=${tokenId}`;
    const owner = await axios.get(baseURL, {
        headers: {
            network: network.network
        }
    }).catch((error) => {
        console.log("error", error);
        return;
    })
    return String(owner.data.toLowerCase());
}
//tweak this function for multiple networks
async function setTokenInfo(contractAddress, tokenId) {
    //alert(admin.toString());
    const networkData = await getNetwork();
    updateBlocksPerDay(networkData.blocksPerDay);
    const network = networkData.network;
    console.log("Current network", network);
    console.log("Set token info");
    const owner = await getTokenOwner(contractAddress, tokenId);
    const meta = await axios.get(`${SERVER_LOCATION}/getTokenMetaData?contractAddress=${contractAddress}&tokenId=${tokenId}`, {
        headers: {
            network: network
        }
    });
    console.log("meta", meta);
    const ethers = require("ethers");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const blockNumber = await provider.getBlockNumber();
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    const admin = await isAdmin(addr);
    console.log("admin status", admin);
    updateAdminStatus(admin);
    updateCurrAddress(addr);
    const canSell = owner === addr.toLowerCase();
    var listingType;
    var tokenInfo;
    
    let NFTAuctionsJSON;
    let MarketplaceJSON;
    if (network === "sepolia testnet") {
        NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
        MarketplaceJSON = SepoliaMarketplaceJSON;
    } else if (network === "optimism sepolia") {
        NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
        MarketplaceJSON = OpSepoliaMarketplaceJSON;
    }

    console.log("meta", meta);
    if (owner === NFTAuctionsJSON.address.toLowerCase()) {
        //console.log("This NFT is listed for auction!");
        listingType = "AUCTION";
        const contract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);
        console.log("connected to auctions contract");
        tokenInfo = await contract.getMostRecentListing(contractAddress, tokenId);
        console.log("Tokeninfo:", tokenInfo);
        const item = {
            //convert price from hex to number, then convert from wei to eth
            price: Number(tokenInfo.buyItNowPrice._hex)/ 1_000_000_000_000_000_000,
            currentBid: Number(tokenInfo.currentBid._hex)/ 1_000_000_000_000_000_000,
            endTime: Number(tokenInfo.end_time) - blockNumber,
            //convert donation percenate from hex to number
            donationPercentage: Number(tokenInfo.donationFee._hex),
            tokenId: tokenId,
            contractAddress: tokenInfo.tokenContractAddress,
            //convert listing id from hex to number
            listingId: Number(tokenInfo.nftAuctionId._hex),
            seller: tokenInfo.seller,
            owner: tokenInfo.seller,
            currentlyListed: listingType,
            image: meta.data.image.originalUrl,
            name: meta.data.name,
            description: meta.data.description,
            highestBidder: tokenInfo.highestBidder,
            metadataURI: meta.data.raw.tokenUri
        };
        updateData(item);
    } else if (owner === MarketplaceJSON.address.toLowerCase()) {
        //console.log("This NFT is a Fixed price listing!");
        listingType = "FIXED";
        const contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
        console.log("Connected to Fixed market contract!");
        tokenInfo = await contract.getMostRecentListing(contractAddress, tokenId);
        const item = {
            //convert price from hex to number, then convert from wei to eth
            price: Number(tokenInfo.price._hex)/ 1_000_000_000_000_000_000,
            //convert donation percenate from hex to number
            donationPercentage: Number(tokenInfo.donationPercentage._hex),
            tokenId: tokenId,
            contractAddress: tokenInfo.contractAddress,
            //convert listing id from hex to number
            listingId: Number(tokenInfo.listingId._hex),
            seller: tokenInfo.seller,
            owner: tokenInfo.owner,
            currentlyListed: listingType,
            image: meta.data.image.originalUrl,
            name: meta.data.name,
            description: meta.data.description,
            metadataURI: meta.data.raw.tokenUri
        };
        updateData(item);
    } else {
        console.log("This token is currently not listed");
        listingType = "NOT FOR SALE";
        updateSaleStatus(listingType);
        const item = {
            collection: meta.data.collection,
            tokenId: tokenId,
            contractAddress: meta.data.contractAddress,
            owner: owner,
            image: meta.data.image.originalUrl,
            name: meta.data.name,
            description: meta.data.description,
            currentlyListed: listingType,
            canSell: canSell,
            metadataURI: meta.data.raw.tokenUri
        };
        updateData(item);
    }
    console.log("Item to render", data);
    console.log("exiting setTokenInfo");

    //this should be the last line of the function
    updateDataFetched(true);
}

async function removeListing(listingId) {
    let MarketplaceJSON;
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    if (network.network === "sepolia testnet") {
        MarketplaceJSON = SepoliaMarketplaceJSON;
    } else if (network.network === "optimism sepolia") {
        MarketplaceJSON = OpSepoliaMarketplaceJSON;
    } else {
        alert("Unsupported network!");
    }
    console.log("connecting to ethers");
    const ethers = require("ethers");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
    contract.removeListing(listingId);
}

async function removeNFTAuction(listingId) {
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
    const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);
    const transaction = await nftAuctionsContract.removeListing(listingId);
    await transaction.wait();
    alert("You have successfully removed your listing");
}

async function payWinningBid() {
    //smart contract variable
    let NFTAuctionsJSON;
    //get the current network
    const network = await getNetwork();
    //make sure we have the correct blocks per day for time conversion
    updateBlocksPerDay(network.blocksPerDay);
    //if we're on ETH sepolia
    if (network.network === "sepolia testnet") {
        NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
    //if we're on OP sepolia
    } else if (network.network === "optimism sepolia") {
        NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
    //unsupported network
    } else {
        alert("Unsupported network!");
    }
    //log the end time
    console.log("End time:", data.endTime);
    //if there's still time on the auction
    if (data.endTime > 0) {
        //message to the user
        alert(`${data.endTime} Blocks left on this auction!\nPlease refresh the page and try again later!`);
        //abort the operation
        //return;
    }
    //import ethers
    const ethers = require("ethers");
    //talk to the wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    //get the user's signature
    const signer = provider.getSigner();
    //hook up to the smart contract
    const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);
    //parse the amount into WEI and convert it to a string
    const amount = ethers.utils.parseEther(data.currentBid.toString());
    //listingId, we use this to lookup and pay for the listing
    const listingId = data.listingId;
    const transaction = await nftAuctionsContract.bidOnNFT(listingId, amount, { value: amount });
    await transaction.wait();
    alert("Congratulations, you have paid for your token!");
}


async function bidOnToken() {
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
    const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer)
    console.log("Wallet connected");
    ////get pricing info from params////
    if (bidFormParams.currentBid < data.price) {
        const bid = ethers.utils.parseEther(bidFormParams.currentBid);
        const nftAuctionId = data.listingId;
        console.log(`Attempting to bid ${bid} wei on Auction Listing ${nftAuctionId}`);
        const transaction = await nftAuctionsContract.bidOnNFT(nftAuctionId, bid);
        await transaction.wait();
        alert("Congratulations, you bid has been successfully placed!");
    } else if (bidFormParams.currentBid >= data.price) {
        console.log(`Attempting buyItNow for ${data.price} ETH`);
        const buyItNowPrice = ethers.utils.parseEther(bidFormParams.currentBid);
        const nftAuctionId = data.listingId;
        const transaction = await nftAuctionsContract.bidOnNFT(nftAuctionId, buyItNowPrice, {value: buyItNowPrice});
        await transaction.wait();
        alert(`Congratulations, you have successfully bought ${data.name} ${data.tokenId}!`);
    } else {
        console.log("action not currently supported");
    }
}


async function buyNFT(listingId) {
    let MarketplaceJSON;
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    if (network.network === "sepolia testnet") {
        MarketplaceJSON = SepoliaMarketplaceJSON;
    } else if (network.network === "optimism sepolia") {
        MarketplaceJSON = OpSepoliaMarketplaceJSON;
    } else {
        alert("Unsupported network!");
    }
    try {
        //import ethers
        const ethers = require("ethers");
        console.log("Imported ethers");
        //attempt to connect to user wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //user signs to authorize the connection
        const signer = provider.getSigner();
        //Pull the deployed contract instance
        let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
        console.log("Connected to wallet");
        //lookup the price of the token
        const salePrice = await contract.getListPrice(listingId);
        //convert price from hex to number for readability
        console.log("converted price to ether:", Number(salePrice._hex));
        updateMessage("Buying the NFT...(takes one block confirmation)");
        //call the contract to execute the sale
        let transaction = await contract.executeSale(listingId, {value:salePrice});
        //wait for the transaction to finish
        await transaction.wait();
        //inform the user that the operation was successful
        alert('You successfully bought the NFT!');
        updateMessage("");
    }
    //if an error occurs, display the error message to the user
    catch(e) {
        alert("You cannot purchase this NFT");
    }
}
///Resume HERE/////
async function listAnyNFT() {
    let MarketplaceJSON;
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    if (network.network === "sepolia testnet") {
        MarketplaceJSON = SepoliaMarketplaceJSON;
    } else if (network.network === "optimism sepolia") {
        MarketplaceJSON = OpSepoliaMarketplaceJSON;
    } else {
        alert("Unsupported network!");
    }
    try {
        //import ethers
        const ethers = require("ethers");
        console.log("importing ethers");
        //connect to wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        console.log("successfully connected to wallet");
        let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
        console.log("Pulled smart contract info");
        const tokenId = params.tokenId;
        console.log("found token id");
        const contractAddress = params.contractAddress;
        console.log("found contract address", contractAddress);
        const salePrice = ethers.utils.parseEther(formParams.price);
        console.log("Sale price", salePrice);
        //connect to the individual token contract
        const tokenContract = new ethers.Contract(contractAddress, erc721ABI, signer);
        console.log("Connected to contract");
        console.log("Connecting to NFT ABI");
        //get approval from the user to send the NFT
        const approved = await tokenContract.getApproved(tokenId);
        console.log("approved", approved);
        if (approved.toLowerCase() !== MarketplaceJSON.address.toLowerCase()) {
            await tokenContract.approve(MarketplaceJSON.address, tokenId);
            alert("Awaiting approval...please click 'ok' or refresh the page once the transaction goes through");
        }
       
        console.log("getting contract list price");
        updateMessage("Attempting to list your token");
        let transaction = await contract.listAnyNFTCustom(params.contractAddress, params.tokenId, formParams.donationPercentage ,salePrice);
        console.log("waiting for transaction");
        await transaction.wait();
        alert("Token Successfully listed with CS!");
        updateMessage("");
    }
    catch(error) {
        console.log("error", error);
        alert("An error occured", error);
        updateMessage("");
    }
}

async function auctionThisNFT() {
    let NFTAuctionsJSON;
    const network = await getNetwork();
    updateBlocksPerDay(network.blocksPerDay);
    console.log("BlocksPerDay:", blocksPerDay);
    if (network.network === "sepolia testnet") {
        NFTAuctionsJSON = SepoliaNFTAuctionsJSON;
    } else if (network.network === "optimism sepolia") {
        NFTAuctionsJSON = OpSepoliaNFTAuctionsJSON;
    } else {
        alert("Unsupported network!");
    }
    console.log("Create Auction button clicked!");
    const ethers = require("ethers");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const addr = signer.getAddress();


    const contractAddress = params.contractAddress;
    console.log("successfuly connected to wallet");

    const endTime = formParams.auctionLength * blocksPerDay;
    ///code to connect to contract goes here
    const tokenContract = new ethers.Contract(contractAddress, erc721ABI, signer);
    const buyItNow = formParams.price > 0 ? ethers.utils.parseUnits(formParams.price, "ether"): 0;
    const donationFee = formParams.donationPercentage.toString();
    const approved = await tokenContract.getApproved(tokenId);

    
    console.log(`approved ${approved}`);

    if (NFTAuctionsJSON.address.toLowerCase() !== approved.toLowerCase()) {
        console.log("CS needs permission to transfer your NFT!");
        const transaction = await tokenContract.approve(NFTAuctionsJSON.address, tokenId);
        await transaction.wait();
        alert("approval granted!");
    }
    
    ///
    const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);
    const listingTransaction = await nftAuctionsContract.createNFTAuction(contractAddress, tokenId, endTime, buyItNow.toString(), donationFee);
    await listingTransaction.wait();
    alert("You have successfully listed your token!");
    ///use form params
    const minimumBid = formParams.price;
    const donationPercentage = formParams.donationPercentage;
    console.log(`Minimum bid ${minimumBid}`);
    console.log(`Donation: ${donationPercentage}%`);
    console.log(`Auction length: ${endTime} blocks`);

}
    //params will be passed from the form into the contract
    const params = useParams();

    const tokenId = params.tokenId;
    const contractAddress = params.contractAddress;
    console.log("Contract address", params.contractAddress);
    console.log("params", params);
    console.log("Current Address", currAddress);
    console.log("Form params", formParams);
    console.log("Bid Form Params", bidFormParams);
    console.log("Block height before render", currentBlock);


    //if we have no data, retrieve the data
    if(!dataFetched) {
        setTokenInfo(params.contractAddress, params.tokenId);
    }
    if(typeof data.image == "string") {
        data.image = GetIpfsUrlFromPinata(data.image);
    }
    if(data.currentlyListed === "FIXED") {
        //if the token is currently listed for fixed price sale, render the following jsx
        return(
            
            <div className="nft-page">
                <Navbar></Navbar>
                <div className="nft-page-card">
                    {
                        adminStatus &&
                        <div>
                            <button className="report-button" onClick={async () => {
                                const resp = await liftBan(data.metadataURI);
                                console.log("liftBan result:", resp);
                            }}>Remove Ban</button>
                            <Link to={data.metadataURI}><div>{data.metadataURI}</div></Link>
                        </div>
                    }
                <img src={data.image} alt="Failed To Load Image"/>
                    <div>
                        <div>
                            Token: {params.collection} #{params.tokenId}
                        </div>
                        <div>
                            Name: {data.name}
                        </div>
                        <div>
                            Listing Id: {data.listingId}
                        </div>
                        <div>
                            Description: {data.description}
                        </div>
                        <div>
                            Price: <span>{data.price + " ETH"}</span>
                        </div>
                        <div>
                            Donation Percentage: <span classname="">{data.donationPercentage + "%"}</span>
                        </div>
                        <div>
                            Total Donation from Sale: <span classname="">{Number(data.donationPercentage) * (data.price/100)} ETH</span>
                        </div>

                        <div>
                            Contract Address: <span>{data.contractAddress}</span>
                        </div>
                        <div>
                            Current Seller: <span>{data.seller}</span>
                        </div>
                        <div>For Sale: <span>{data.currentlyListed}</span></div>
                        <div>
                        { currAddress !== data.seller?
                            <button onClick={() => buyNFT(data.listingId)}>Buy this NFT</button>
                            :<button onClick={() => removeListing(data.listingId)}>Remove Listing</button>

                        }
                        

                    
                        <div>{message}</div>
                        </div>
                    </div>
                </div>
            </div>
                )
            //if it is listed for auction, render this instead
            } else if (data.currentlyListed === "AUCTION") {
                    return(
                        <div className="nft-page">
                            <Navbar></Navbar>
                            <div className="nft-page-card">
                                {
                                    adminStatus &&
                                    <div>
                                        <button className="report-button" onClick={async () => {
                                            const resp = liftBan(data.metadataURI);
                                            console.log("liftBan result:", resp);
                                        }}>Remove Ban</button>
                                        <Link to={data.metadataURI}><div>{data.metadataURI}</div></Link>
                                    </div>
                                }
                            <img src={data.image} alt="Failed To Load Image" className="nft-page" />
                                <div className="nft-page-details">
                                    <div>
                                        Token: {params.collection} #{params.tokenId}
                                    </div>
                                    <div>
                                        Name: {data.name}
                                    </div>
                                    <div>
                                        Listing Id: {data.listingId}
                                    </div>
                                    <div>
                                        Description: {data.description}
                                    </div>
                                    <div>
                                        {
                                            data.endTime - currentBlock > 0?

                                            <div>Time Left: {data.endTime} Blocks (approximately {Math.round(((data.endTime - currentBlock)/blocksPerDay))} Days)</div>:
                                            <div>Time Left: {"Auction Ended"}</div>
                                        }
                                    </div>
                                    <div>
                                        Buy It Now: <span>{data.price + " ETH"}</span>
                                    </div>
                                    <div>
                                        Current Bid: <span>{data.currentBid + " ETH"}</span>
                                    </div>
                                    <div>
                                        Donation Percentage: <span classname="">{data.donationPercentage + "%"}</span>
                                    </div>
                                    <div>
                                        Total Donation from Sale: <span classname="">{Number(data.donationPercentage) * (data.price/100)} ETH</span>
                                    </div>
            
                                    <div>
                                        Contract Address: <span>{data.contractAddress}</span>
                                    </div>
                                    <div>
                                        Current Seller: <span>{data.seller}</span>
                                    </div>
                                    {
                                        data.highestBidder.toLowerCase() === currAddress.toLowerCase()?

                                        <div>
                                        Highest Bidder: <span style={{backgroundColor: "green"}}>{data.highestBidder} (You!)</span>
                                        </div>:<div>Highest Bidder: <span style={{backgroundColor: "red"}}>{data.highestBidder} (Not You)</span></div>

                                    }
                                    
                                    <div>For Sale: <span>{data.currentlyListed}</span></div>
                                    <div>
                                    { currAddress !== data.seller?
                                    
                                        <div className="set-for-sale">
                                        <label>Please Enter Your Bid (ETH)</label><br></br>
                                        <input type="number" placeholder="0.001 ETH" step={bidStep} value={bidFormParams.currentBid} onChange={e => updateBidFormParams({...bidFormParams, currentBid: e.target.value})}></input>
                                        <button onClick={() => bidOnToken(contractAddress, data.listingId, tokenId)}>Submit Bid</button>
                                        </div>
                                        :<button onClick={() => removeNFTAuction(data.listingId)}>Remove Listing</button>
            
                                    }
                                    
                                    {
                                        currAddress === data.highestBidder  &&

                                        <div>
                                            <button onClick={payWinningBid}>Pay Now</button>
                                        </div>
                                    }                               
                                    <div>{message}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                            )
            }
            ///token is not listed for sale, render the following jsx
            else {
                return(
                    <div className="nft-page">
                        <Navbar></Navbar>
                        <div className="nft-page-card">
                            {
                                adminStatus &&
                                <div>
                                    <button className="report-button" onClick={async () => {
                                        const resp = await liftBan(data.metadataURI);
                                        console.log("liftBan result:", resp);
                                    }}>Remove Ban</button>
                                    <Link to={data.metadataURI}><div>{data.metadataURI}</div></Link>
                                </div>
                            }
                            <img src={data.image} alt="Failed To Load Image" className="nft-page"></img>
                            <div className="nft-page-details">
                                <div>
                                    Collection: {params.collection} #{params.tokenId}
                                </div>
                                <div>
                                    Name: {data.name}
                                </div>
                                <div>
                                    Token Id: {params.tokenId}
                                </div>
                                <div>
                                    Description: {data.description}
                                </div>
                                <div>
                                    Contract Address: <span>{params.contractAddress}</span>
                                </div>
                                <div>
                                    Current Owner: <span>{data.owner}</span>
                                </div>
                                <div>
                                    {                                     
                                        data.canSell && wantsToSell?
                                        <div>
                                        <div className="set-for-sale">
                                            <button style={{backgroundColor: sellButtonBackgroundColor}} onClick={toggleSaleButton}>{sellButtonMessage}</button>
                                            
                                        </div>
                                        {
                                            wantsFixedPrice &&
                                            <div className="set-for-sale">
                                                <button style={{backgroundColor: "green"}} onClick={listAnyNFT}>Everything's Good, List My NFT!</button>
                                                <label htmlFor="price">Price/Buy It Now (in ETH...optional for auctions)</label><br></br>
                                                <input type="number" placeholder="Min 0.001 ETH" step="0.001" value={formParams.price} onChange={e => updateFormParams({...formParams, price: e.target.value})}></input>
                                                <label htmlFor="price">Donation Percentage (the percentage of the sale you wish to donate)</label><br></br>
                                                <input type="number" placeholder="25%" step="25" min="25" max="100" value={formParams.donationPercentage} onChange={e => updateFormParams({...formParams, donationPercentage: e.target.value})}></input>
                                            </div>
                                        }
                                        {
                                            wantsToAuction &&
                                            <div className="set-for-sale">
                                                <button style={{backgroundColor: "green"}} onClick={auctionThisNFT}>Everything's Good, Auction this NFT!</button>
                                                <label htmlFor="price">Price/Buy It Now (in ETH...optional for auctions)</label><br></br>
                                                <input type="number" placeholder="Min 0.001 ETH" step="0.001" value={formParams.price} onChange={e => updateFormParams({...formParams, price: e.target.value})}></input>
                                                <label htmlFor="price">Donation Percentage (the percentage of the sale you wish to donate)</label><br></br>
                                                <input type="number" placeholder="25%" step="25" min="25" max="100" value={formParams.donationPercentage} onChange={e => updateFormParams({...formParams, donationPercentage: e.target.value})}></input>
                                                <label htmlFor="price">Auction Length (If this is a fixed price sale, leave this blank)</label><br></br>
                                                <input type="number" placeholder="7" step="1" min="1" max="100" value={formParams.auctionLength} onChange={e => updateFormParams({...formParams, auctionLength: e.target.value})}></input>
                                            </div>
                                        }
                                        {
                                            !wantsFixedPrice && !wantsToAuction &&
                                            <div>
                                                <label>Sale Type</label>
                                                <ul>
                                                    <li><button onClick={toggleWantsFixedPrice}>Create Fixed Price Sale</button></li>
                                                    <li><button onClick={toggleWantsToAuction}>Create Auction</button></li>
                                                </ul>
                                            </div>
                                        }
                                        
                                        </div>: <button onClick={toggleSaleButton} style={{backgroundColor: sellButtonBackgroundColor}}>{sellButtonMessage}</button>

                                    }                                                              
                                <div>{message}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                        )
                    }
}