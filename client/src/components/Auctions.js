import Navbar from "./Navbar";
import SepoliaAuctionJSON from "../Auctions-sepolia.json";
import OpSepoliaAuctionJSON from "../Auctions-op_sepolia.json"
import { uploadFileToIPFS, uploadJSONToIPFS } from "../nftdotstorage";
import { getNetwork } from "../utils";

import { useState, useEffect } from "react";

//renders the "Auctions" page, used for creating auctions
//perhaps we should rename it
function Auctions() {
    //maximum a user can bid
    const maxBid = (9007199254740991).toString();
    //formParams...Global Variables to create the auction
    const [formParams, updateFormParams] = useState({
        name: '',
        end_time: 7,
        buyItNow: maxBid,
        donationFee: 25,
        description: '',
        image: ''
    });
    const [dataFetched, updateDataFetched] = useState(false);
    const [message, updateMessage] = useState("");
    const [imageArray, updateImageArray] = useState([]);    
    //Blocks per day...THIS SHOULD CHANGED BASED ON NETWORK!!!!
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);
    //log the imageArray each time it changes
    useEffect(() => {
        console.log("Images:", imageArray);
    }, [imageArray]);

    //intital setup function
    async function setThePage() {
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        updateDataFetched(true);
    }

    //this is called each time we upload a file
    async function OnChangeFile(e) {
        //pull the first item from the array
        var file = e.target.files[0];
        //split the string to extract the file extension
        const fileName = String(file.name).split(".");
        //extract the file extension
        const fileExtension = fileName[fileName.length-1];
        //boolean variable, whether or not we can continue
        var canContinue;
        //if we have any of the following filetypes, continue
        if (fileExtension === "jpg") {
            canContinue = true;
        } else if (fileExtension === "jpeg") {
            canContinue = true;
        } else if (fileExtension === "png") {
            canContinue = true;
        } else if (fileExtension === "gif") {
            canContinue = true;
        //none of the types above, we can't continue
        } else {
            canContinue = false;
        }
        //if we can continue
        if (canContinue) {
            try {
                //display the upload message
                updateMessage("Uploading image.. please don't click anything!")
                //upload the file to IPFS through nft.storage
                const response = await uploadFileToIPFS(file);
                //if the operation was successful
                if(response.success === true) {
                    //url of the file
                    const newURL = response.pinataURL;
                    //add the url to our imageArray
                    updateImageArray(previous => [...previous, newURL]);
                }
                //remove the "upload" message
                updateMessage("");
            }
            //in the event of an error, log the error
            catch(e) {
                console.log("Error during file upload", e);
            }
        //user uploaded the wrong file type, tell them to upload one of these
        } else {
            alert("Please upload a proper image type: jpg, jpeg, png, gif");
        }
    }
    //creates an auction using the smart contract
    async function createAuction() {
        //smart contract variable
        let AuctionJSON;
        //get the network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        console.log("Networkinfo:", network);
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        //unsupported network
        } else {
            alert("Unsupported network!");
        }
        //require an item description
        if (formParams.description === '') {
            alert("Please add a description!");
            return;
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //hook up to the contract
        const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //get the auction length in blocks
        const auctionBlockTime = formParams.end_time * blocksPerDay;
        console.log("Type of end_time:", typeof formParams.end_time, formParams.end_time);
        console.log("Type of blocksPerDay:", typeof blocksPerDay, blocksPerDay);
        console.log("Auction block time:", auctionBlockTime);
        //pull buyItNow from formParams
        const buyItNowPrice = ethers.utils.parseEther(formParams.buyItNow);
        //pull donationFee from formParams
        const donationFee = formParams.donationFee;
        //final item object that will become our auction
        const finalizedItem = {
            name: formParams.name,
            end_time: formParams.end_time,
            buyItNow: formParams.buyItNow,
            donationFee: formParams.donationFee,
            description: formParams.description,
            image: imageArray
        }
        //ipfs response
        const ipfsData = await uploadJSONToIPFS(finalizedItem);
        //url of the finalizedItem
        const ipfsHash = ipfsData.pinataURL;        
        //transaction to create the auction
        let transaction = await contract.createAuction(auctionBlockTime.toString(), buyItNowPrice, donationFee, ipfsHash);
        //wait for the transaction to complete
        await transaction.wait();
        //get the current auction height
        const auctionId = await contract.getListingHeight();
        console.log("auction height:", auctionId);
        //inform the user that the operation was successful
        alert("Auction created");
        window.location.replace(`/AuctionPage/${auctionId -1}`);
    }

    if (!dataFetched) {
        setThePage();
    }

    return(
        <div>
            <div>
                <Navbar></Navbar>
            </div>
            <div className="form-container">
            <div className="form">
                <h1 className="form-title">Auction a Physical Item</h1>
                    <label className="form-label">Item Name</label>
                    <input className="form-input" placeholder="Your Item Name"
                        onChange={e =>updateFormParams({...formParams, name: e.target.value})}></input>
                    <label className="form-label">Auction Length (Days)</label>
                    <input className="form-input" type="number"
                        placeholder="Minimum 1 Day"
                        defaultValue={7}
                        step={1}
                        min={1}
                        onChange={e =>updateFormParams({...formParams, end_time: e.target.value})}></input>
                    
                    <label className="form-label">Buy It Now Price (in ETH)</label>
                    <input className="form-input" type="number"
                        placeholder="Buy It Now Price"
                        step={0.001}
                        onChange={e =>updateFormParams({...formParams, buyItNow: e.target.value})}></input>                        
                    
                    <label>Donation Fee</label>
                    <input className="form-input" type="number"
                        placeholder="Donation Fee Percentage"
                        step={25}
                        max={100}
                        onChange={e => updateFormParams({...formParams, donationFee: e.target.value})}></input>
                    <label className="form-label">Item Description</label>
                    <textarea className="form-input" cols="40" rows="5" id="description" type="text" placeholder="Describe your item..." value={formParams.description} onChange={e => updateFormParams({...formParams, description: e.target.value})}></textarea>

                    <label className="form-label" htmlFor="image">Upload an Image</label>
                    <input type={"file"} onChange={OnChangeFile}></input>
                    <div className="form-label">{message}</div>
                    <div className="form-field">
                    <button onClick={createAuction}>Create Auction</button>
                    </div>
            </div>
        </div>
        </div>
        
    )
}

export default Auctions;