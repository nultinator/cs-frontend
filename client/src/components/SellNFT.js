import Navbar from "./Navbar";
import { useState } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../nftdotstorage";

import SepoliaMarketplaceJSON from '../Marketplace-sepolia.json';
import OpSepoliaMarketplaceJSON from "../Marketplace-op_sepolia.json";
import { getNetwork } from "../utils";

export default function SellNFT () {
    //constants... pay attention, there's a lot going on here
    const [formParams, updateFormParams] = useState(
        { 
            name: '', 
            description: '', 
            donationPercentage: '', 
            price: '', 
            image: null
        });
    //import ethers to interact with the user's wallet
    const ethers = require("ethers");
    //message, this is displayed when uploading files...blank by default, changes based on our actions
    const [message, updateMessage] = useState('');
    //blocks per day, we may or may not need this, added during a large update
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);
    
    //this function disables the mint button
    async function disableButton() {
        //get the list button using its id
        const listButton = document.getElementById("list-button");
        //disable the button
        listButton.disabled = true;
        //change the background
        listButton.style.backgroundColor = "grey";
        //set the opacity
        listButton.style.opacity = 0.3;
    }
    //this function re-eneables the list button
    async function enableButton() {
        //get the list button using its id
        const listButton = document.getElementById("list-button");
        //enable the button
        listButton.disabled = false;
        //set the color
        listButton.style.backgroundColor = "#A500FF";
        //set the opacity
        listButton.style.opacity = 1;
    }

    //This function uploads the NFT image to IPFS
    async function OnChangeFile(e) {
        //variable to hold our file
        var file = e.target.files[0];
        //split the file using "." as a separator
        const fileName = String(file.name).split(".");
        //take the last element of the file array
        const fileExtension = fileName[fileName.length-1];
        //variable to decide whether or not we can continue
        var canContinue;
        //all of the following file types are allowed
        if (fileExtension === "jpg") {
            canContinue = true;
        } else if (fileExtension === "jpeg") {
            canContinue = true;
        } else if (fileExtension === "png") {
            canContinue = true;
        } else if (fileExtension === "gif") {
            canContinue = true;
        //if it is not one of the approved file types, we can't continue
        } else {
            canContinue = false;
        }
        if (canContinue) {
            try {
                //disable the mint button
                disableButton();
                //display the following message
                updateMessage("Uploading image.. please don't click anything!");
                //store the file on IPFS
                const response = await uploadFileToIPFS(file);
                //if the upload was successful
                if(response.success === true) {
                    //re-enable the button
                    enableButton();
                    //clear the message
                    updateMessage("");
                    //pull the image uri from the response
                    const imageURI = response.pinataURL;
                    console.log("Uploaded image to Pinata: ", imageURI);
                    //add the image uri to the form params
                    formParams.image = imageURI;
                    console.log("Form params after upload", formParams);
                }
            }
            //log any errors
            catch(e) {
                console.log("Error during file upload", e);
            }
        //the user uploaded the wrong file type, alert them and tell them the acceptable types           
        } else {
            alert("Please upload a proper image type: jpg, jpeg, png, gif");
        }
    }

    //This function uploads the metadata to IPFS
    async function uploadMetadataToIPFS() {
        //Make sure that none of the fields are empty
        if( !formParams.name || !formParams.description || !formParams.price || !formParams.image) {
            updateMessage("Please fill all the fields!")
            alert("Not all fields were filled!");
            return -1;
        }
        //attempt the following
        try {
            //upload the metadata JSON to IPFS
            const response = await uploadJSONToIPFS(formParams);
            //if our information was successfully uploaded
            if(response.success === true) {
                //return the url of our metadata
                return response.pinataURL;
            }
        }
        //upload failed, log the error
        catch(e) {
            console.log("error uploading JSON metadata:", e)
        }
    }
    
    //mint an NFT directly to the user's wallet
    async function mintNFT(e) {
        //prevent default behavior so we can do the following
        e.preventDefault();
        //variable for our marketplace smart contract
        let MarketplaceJSON;
        //get the current network
        const network = await getNetwork();
        //set blocksPerDay based on the network
        updateBlocksPerDay(network.blocksPerDay);
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            MarketplaceJSON = SepoliaMarketplaceJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            MarketplaceJSON = OpSepoliaMarketplaceJSON;
        //unsupported network, alert the user so they can connect to the right one
        } else {
            alert("Unsupported network!");
        }
        //Upload data to IPFS
        try {
            //upload our metadata
            const metadataURL = await uploadMetadataToIPFS();
            //if the upload failed, exit this minting function
            if(metadataURL === -1) {
                return;
            }
            //connect to the user's wallet
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            //user signs to authorize the connection
            const signer = provider.getSigner();
            //disable the mint button
            disableButton();
            //display this message
            updateMessage("Uploading NFT (takes one block confirmation).. please don't click anything!");
            //hook up to the contract
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            //parse the price so that Solidity can understand it
            var listingPrice = ethers.utils.parseUnits(formParams.price, 'ether');
            //convert the listing price to a string
            listingPrice = listingPrice.toString();
            //actually create the NFT
            let transaction = await contract.createTokenUnlisted(metadataURL, listingPrice, { value: listingPrice});
            //wait until the operation finishes
            await transaction.wait();
            //inform the user of a succussful result
            alert("Congratulations, you have successfully minted an NFT through Chosen Sanctuary!!!");
            //get our token Id
            const tokenId = await contract.getCurrentToken();
            //reset the page to normal
            enableButton();
            updateMessage("");
            updateFormParams({ name: '', description: '', price: ''});
            //navigate with window.replace to the token page
            window.location.replace(`/nftPage/${MarketplaceJSON.address}/${Number(tokenId)}`);
        }
        //if an error occurs, display the error to the user
        catch(e) {
            alert( "Upload error", e);
            console.log("Error", e);
        }
    }
    //render the jsx below to the page
    return (
        <div>
        <Navbar></Navbar>
        <div className="form-container">
            <form className="form">
            <h3 className="form-title">Make A Donation and Mint an NFT!</h3>
                <div className="form-field">
                    <label className="form-label" htmlFor="name">NFT Name</label>
                    <input className="form-input" id="name" type="text" placeholder="Name your NFT" onChange={e => updateFormParams({...formParams, name: e.target.value})} value={formParams.name}></input>
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="description">NFT Description</label>
                    <textarea className="form-input" cols="40" rows="5" id="description" type="text" placeholder="CS Collection" value={formParams.description} onChange={e => updateFormParams({...formParams, description: e.target.value})}></textarea>
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="price">Donation Amount (in ETH)</label>
                    <input className="form-input" type="number" placeholder="Min 0.001 ETH" min="0.001" step="0.001" value={formParams.price} onChange={e => updateFormParams({...formParams, price: e.target.value})}></input>
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor="image">Upload Image (&lt;500 KB)</label>
                    <input className="form-input" type={"file"} accept=".jpg, .jpeg, .png, .gif" onChange={OnChangeFile}></input>
                </div>
                <br></br>
                <div className="form-label">{message}</div>
                <div className="form-field">
                <button onClick={mintNFT} id="list-button">Mint Your NFT!</button>
                </div>
            </form>
        </div>
        </div>
    )
}