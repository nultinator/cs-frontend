import { useParams } from 'react-router-dom';
import SepoliaAuctionJSON from "../Auctions-sepolia.json";
import OpSepoliaAuctionJSON from "../Auctions-op_sepolia.json";
import SepoliaUsersJSON from "../Users-sepolia.json";
import OpSepoliaUsersJSON from "../Users-op_sepolia.json";
import { getNetwork } from '../utils';
import { isAdmin } from '../adminAuth';
import { encrypt, decrypt, PrivateKey } from 'eciesjs';

import erc721ABI from "../erc721ABI.json";
import axios from "axios";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../nftdotstorage";
import ShippingLabel from './ShippingLabel';

import { useEffect, useState } from "react";
import Navbar from './Navbar';

export default function AuctionPage (props) {
    //use a dummy address to know whether or not we have bidders
    const dummyAddress = "0x0000000000000000000000000000000000000000";
    //you must bid at least 0.001 ether higher than the last bid
    const bidStep = 0.001;

    //formParams, we use these to handle information we're passing from the form to the backend
    const [formParams, updateFormParams] = useState({
        currentBid: '',
        donationPercentage: '',
        seller: '',
        end_time: '',
        buyItNow: '',
        paid: false,
    });
    const [isAdmin, updateIsAdmin] = useState(false);
    //highest possible number in JS
    const maxBid = 9007199254740991;
    //same params from the router so we can render dynamic pages
    const params = useParams();
    //data used for the display
    const [data, updateData] = useState({});
    //tells the system whether or not the data to render has been fetched
    const [dataFetched, updateDataFetched] = useState(false);
    //update message, pretty self explanatory
    const [message, updateMessage] = useState("");
    //store the user's address in a variable for the display
    const [currAddress, updateCurrAddress] = useState("0x");
    //message displayed on the button
    const [buttonMessage, updateButtonMessage] = useState("Bid Now");
    //store the current blocktime so we can render it
    const [currentBlock, updateBlockHeight] = useState(0) ;
    //url of any image the user uploads
    const [fileURL, setFileURL] = useState(null);
    //image array code will go here
    const [imageArray, setImageArray] = useState([]);
    const [imageIndex, setImageIndex] = useState(0);
    //end of image array
    //buyItNow price, maxBid unless the listing has a buyItNow price
    //shipping info modal
    const [showShippingInfoModal, setShowShippingInfoModal] = useState(false);
    const [shippingInfo, setShippingInfo] = useState(null);
    const [wantsToUpdatePhoto, updatePhoto] = useState(false);
    const [blocksPerDay, updateBlocksPerDay] = useState(7141);

    useEffect(() => {
        console.log("Images:", imageArray);
    }, [imageArray]);

    
    function togglePhotoInfo() {
        if (wantsToUpdatePhoto) {
            updatePhoto(false);
        } else {
            updatePhoto(true);
        }
    }

    function incrementImage() {
        //if we're at the end of the array
        if (imageIndex === imageArray.length-1) {
            //go back to the beginning
            setImageIndex(0);
        //if we're not
        } else {
            //move on to the next index
            let newIndex = imageIndex + 1;
            setImageIndex(newIndex);
        }
    }

    function decrementImage() {
        //if we're at the beginning of the array
        if (imageIndex === 0) {
            //loop to the end
            setImageIndex(imageArray.length - 1)
        //if we're not
        } else {
            //move to the previous index
            let newIndex = imageIndex - 1;
            setImageIndex(newIndex);
        }
    }
    

    async function OnChangeFile(e) {
        var file = e.target.files[0];
        //check for file extension
        try {
            //update the message on the page
            updateMessage("Uploading image.. please don't click anything!")
            const response = await uploadFileToIPFS(file);
            //if the upload was successful
            if(response.success === true) {
                updateMessage("")
                console.log("Uploaded image to Pinata: ", response.pinataURL)
                //setFileURL(response.pinataURL);
                const newURL = response.pinataURL;
                setFileURL(newURL);
                setImageArray(previous => [...previous, newURL]);
            }
            //in the event of an error, log the error
        } catch(e) {
            console.log("Error during file upload", e);
        }
    }

    function removePhoto(index) {
        console.log("removePhoto Clicked!");
        setImageArray(imageArray => imageArray.filter((_, i) => i !== index));
    }

    //user calls this to mark the item as received
    async function itemReceived() {
        //smart contract variable
        let AuctionJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //get the user's wallet address
        const addr = await signer.getAddress();
        //hook up to the smart contract
        const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //clpse out the item
        const transaction = await contract.closeOutItem(data.auctionID);
        //wait for the operation to perform successfully
        await transaction.wait();
        alert("You have successfully closed out this auction");
    }
    

    async function itemNotReceived() {
        console.log("Sorry you haven't received your item yet!");
        alert("Sorry you haven't received your item!")
    }

    //allow seller to withdraw profit
    async function withdrawProfits() {
        //smart contract variable
        let AuctionJSON;
        //get the network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
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
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //hook up to the contract
        const contract = await new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //call the withdrawal function from the contract
        const transaction = await contract.withdrawAuctionProfits(data.auctionID);
        console.log("Called withdraw function");
        //wait for the transaction to finish
        await transaction.wait();
        alert("You have successfully withdrawn your profits!!!");
    }

    //change the photo of an auction
    async function changePhoto() {
        console.log("changePhoto clicked");
        //smart contract variable
        let AuctionJSON;
        //get the network we're on
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //get the user's wallet address
        const addr = await signer.getAddress();
        //update the state of the address
        updateCurrAddress(addr);
        //get the current block height
        const currBlockHeight = await provider.getBlockNumber();
        //update the state of the block height
        updateBlockHeight(currBlockHeight);
        //hook up to the smart contract
        const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //use the fileURL from formParams
        const imageURI = fileURL;
        console.log("imageURI", imageURI);
        //json object of the metadata
        const updatedItem = {
            name: data.name,
            auctionID: data.auctionID,
            end_time: data.end_time,
            buyItNow: data.buyItNow,
            donationFee: data.donationFee,
            description: data.description,
            image: imageArray
        };
        //metadataURI object...this is NOT the actual url
        const metadataURI = await uploadJSONToIPFS(updatedItem);
        console.log("new metadataURI", metadataURI);
        //call updatePicture from the contract
        console.log("auctionId:", data.auctionID);
        console.log("metadataURI:", metadataURI.pinataURL);
        //update the contract metadata
        const transaction = await contract.updateAuctionMetadata(data.auctionID, metadataURI.pinataURL);
        //wait for the transaction to finish
        await transaction.wait();
        alert("You have Successfully changed the picture!");
    }



    //pull an individual listing from the contract
    async function retrieveThisListing(auctionID) {
        //smart contract variable
        let AuctionJSON;
        //get the network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay)
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //have the user sign
        const signer = provider.getSigner();
        //get the user's address
        const addr = await signer.getAddress();
        //const admin = await isAdmin(addr);
        //console.log("Admin Status:", admin);
        //update the state of the address
        updateCurrAddress(addr);
        //get the current block height
        const currBlockHeight = await provider.getBlockNumber();
        //update the block height state
        updateBlockHeight(currBlockHeight);
        //hook up to the smart contract
        const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        //retrieve the listing
        const auctionListing = await contract.retrieveIndividualListing(auctionID);
        //get the metadata
        const meta = await axios.get(auctionListing.metadataURI);
        //information to display about the item
        const item = {
            auctionID: Number(auctionListing.auctionId),
            images: meta.data.image,
            name: meta.data.name,
            description: meta.data.description,
            end_time: Number(auctionListing.end_time),
            seller: auctionListing.seller,
            highestBidder: auctionListing.highest_bidder,
            currentBid: Number(auctionListing.current_bid/1_000_000_000_000_000_000),
            buyItNow: Number(auctionListing.buyItNowPrice/1_000_000_000_000_000_000),
            paid: auctionListing.paid.toString(),
            received: auctionListing.received,
            donationFee: Number(auctionListing.donationFee),
            shippingInfo: auctionListing.shippingInfo,
        }
        //set our image array to contain the images of the item
        setImageArray(item.images);
        console.log("Item to render:", item);
        //if user is already the highest bidder, display "raise bid" on the button
        if (addr === item.highestBidder) {
            updateButtonMessage("Raise Bid");
        }
        updateData(item);
        //if the data hasn't been fetched, fetch the data
        if (dataFetched === false) {
            //get the current blocktime
            const blockHeight = await provider.getBlockNumber();
            //convert it to a human readable number
            data.blockHeight = Number(blockHeight);
            console.log("Block Height", Number(blockHeight));
            //update the display data with the item we created earlier
        }
        return item;
    }

    async function payWinningBid() {
        //smart contract variable
        let AuctionJSON;
        //get the network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
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
        //attempt to pay the winning bid...there's a LOT of logic here
        try {
            //if the user is not the highest bidder, fail
            if (String(data.highestBidder).toLowerCase() !== String(currAddress).toLowerCase()) {
                alert("Only the highest bidder can pay for the item!");
                return;
            }
            //import ethers
            const ethers = require("ethers");
            //talk to the wallet
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            //have the user sign
            const signer = provider.getSigner();
            //get the user's wallet address
            const addr = await signer.getAddress();
            //hook up to the smart contract
            const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
            //amount: the amount in ether converted into wei
            const amount = ethers.utils.parseEther(data.currentBid.toString());
            //make the transaction
            const transaction = await contract.payWinningBid(data.auctionID, {value: amount});
            //wait for the transaction to finish
            await transaction.wait();
            //inform the user of a successful result
            alert("You have successfully paid for your item!");
        //something failed, log the error
        } catch (e) {
            console.log("Error", e);
        }
    }

    //bid on an item
    async function bidOnItem() {
        //smart contract variable
        let AuctionJSON;
        //get the network
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
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
        //attempt the following
        try {
            //import ethers
            const ethers = require("ethers");
            //don't let sellers bid their own items
            if (String(data.seller).toLowerCase() === String(currAddress).toLowerCase()) {
                alert("You cannot bid on your own item!");
                return;
            }
            //talk to the wallet
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            //have the user sign
            const signer = provider.getSigner();
            //hook up to the contract
            const contract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
            //convert the current bid to Wei from ETH
            const amount = ethers.utils.parseEther(formParams.currentBid);
            //create a transaction variable
            var transaction;
            //if the current bid is greater than or equal to buyItNow price
            if (data.buyItNow <= formParams.currentBid) {
                console.log("Attempting Buy It Now");
                //bid on the item and pay for it
                transaction = await contract.bidOnItem(data.auctionID, amount, {value: amount});
            } else {
                //simply bid on the item
                transaction = await contract.bidOnItem(data.auctionID, amount);
            }
            //wait for the transaciton to finish
            await transaction.wait();
            //inform the user of a successful bid
            alert(`You've successfully bid ${amount/1_000_000_000_000_000_000} ETH!`);
          //catch an error  
        } catch (e) {
            //display the error message and return immediately
            alert(e);
            return;
        }
    }

    //this function possibly needs rewritten
    async function shareShippingInfo() {
        let UsersJSON;
        let AuctionJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay);
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
            UsersJSON = SepoliaUsersJSON;
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
            UsersJSON = OpSepoliaUsersJSON;
        } else {
            alert("Unsupported network!");
        }
        //connect to wallet
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const addr = signer.getAddress();
        //connect to contract
        const usersContract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        console.log("connected to users contract");
        //buyer information
        const myUserId = await usersContract.getUserId(addr);
        console.log("userId", myUserId);
        const myInfo = {};
        myInfo.userId = Number(myUserId);
        myInfo.privateKey = await usersContract.getUserPrivkey(myInfo.userId);
        const myIPFSHash = await usersContract.ipfsHashForUser(myInfo.userId);
        console.log("Imported keypair");
        myInfo.ipfsHash = myIPFSHash;
        console.log("Found IPFS hash", myInfo.ipfsHash);
        const encryptedShippingInfo = await axios.get(myInfo.ipfsHash);
        console.log("encrypted shipping info", encryptedShippingInfo.data);
        myInfo.name = decryptData(encryptedShippingInfo.data.name, myInfo.privateKey);
        myInfo.streetAddress = decryptData(encryptedShippingInfo.data.streetAddress, myInfo.privateKey);
        myInfo.city = decryptData(encryptedShippingInfo.data.city, myInfo.privateKey);
        myInfo.stateOrProvince = decryptData(encryptedShippingInfo.data.stateOrProvince, myInfo.privateKey);
        myInfo.zipCode = decryptData(encryptedShippingInfo.data.zipCode, myInfo.privateKey);
        myInfo.country = decryptData(encryptedShippingInfo.data.country, myInfo.privateKey);
        console.log("myInfo:", myInfo);
        //seller information
        const sellerInfo = {};
        const sellerId = await usersContract.getUserId(data.seller);
        sellerInfo.userId = Number(sellerId);
        sellerInfo.publicKey = await usersContract.getUserPubKey(sellerInfo.userId);
        console.log("seller info", sellerInfo);
        //encrypt the shipping info using the seller's public key
        const sharedShippingInfo = {
            name: encryptData(myInfo.name, sellerInfo.publicKey),
            streetAddress: encryptData(myInfo.streetAddress, sellerInfo.publicKey),
            city: encryptData(myInfo.city, sellerInfo.publicKey),
            stateOrProvince: encryptData(myInfo.stateOrProvince, sellerInfo.publicKey),
            zipCode: encryptData(myInfo.zipCode, sellerInfo.publicKey),
            country: encryptData(myInfo.country, sellerInfo.publicKey),
        }
        //upload the encrypted info to IPFS
        const shippingIPFSHash = (await uploadJSONToIPFS(sharedShippingInfo)).pinataURL;
        console.log("shared info ipfs hash", shippingIPFSHash);
        //connect to the auctions contract
        const auctionsContract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        console.log("successfuly connected to the auctions contract");
        let transaction = await auctionsContract.addShippingInfo(data.auctionID, shippingIPFSHash);
        await transaction.wait();
        alert("you have successfully shared your shipping info!")
    }
    //this function possibly needs rewritten
    async function viewShippingLabel() {
        let AuctionJSON;
        let UsersJSON;
        const network = await getNetwork();
        updateBlocksPerDay(network.blocksPerDay)
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
            UsersJSON = SepoliaUsersJSON;
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
            UsersJSON = OpSepoliaUsersJSON;
        } else {
            alert("Unsupported network!");
        }
        //connect to wallet
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const addr = signer.getAddress();
        //connect to users contract
        const usersContract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        console.log("connected to users contract");
        const myInfo = {};
        myInfo.userId = Number(await usersContract.getUserId(addr));
        myInfo.privateKey = await usersContract.getUserPrivkey(myInfo.userId);
        console.log("myInfo", myInfo);
        //connect to the auctions contract
        const auctionsContract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        console.log("connected to auctions contract");
        //get the shipping info
        const encryptedShippingInfo = (await axios.get(data.shippingInfo)).data;
        console.log("encrypted shipping info", encryptedShippingInfo);
        const plaintextShippingInfo = {
            name: decryptData(encryptedShippingInfo.name, myInfo.privateKey),
            streetAddress: decryptData(encryptedShippingInfo.streetAddress, myInfo.privateKey),
            city: decryptData(encryptedShippingInfo.city, myInfo.privateKey),
            stateOrProvince: decryptData(encryptedShippingInfo.stateOrProvince, myInfo.privateKey),
            zipCode: decryptData(encryptedShippingInfo.zipCode, myInfo.privateKey),
            country: decryptData(encryptedShippingInfo.country, myInfo.privateKey),
        };
        setShowShippingInfoModal(true);
        setShippingInfo(plaintextShippingInfo);
        console.log("plaintext shipping info", plaintextShippingInfo);
    }
    //this function probably needs rewritten after the database update
    function decryptData(phrase, privateKey) {
        const bytes = Buffer.from(phrase)
        console.log("bytes data", bytes);
        const signingKey = new PrivateKey.fromHex(privateKey);
        console.log("read private key", signingKey.secret);
        const plaintext = decrypt(signingKey.secret, bytes).toString();
        console.log("plaintext", plaintext);
        return plaintext;
    }
    //this function probably needs rewritten after the database update
    function encryptData(phrase, pubKey) {
        const data = Buffer.from(phrase);
        return encrypt(pubKey, data);
    }

    //if data hasn't been fetched yet
    if (!dataFetched) {
        //log the auctionId to make sure it's the right one
        console.log(retrieveThisListing(params.auctionId));
        //the default bid is the current bid plus the bidStep
        formParams.currentBid = (data.currentBid + bidStep).toFixed(3).toString();
        updateDataFetched(true);
        }
    

return (
    <div>
        <Navbar></Navbar>

        <h1>Hello From the individual Auctions Page</h1>
        <div className='auctions-container'>
            <h1>Auction {data.auctionID}</h1>
            <div className='auctions-container-name'>{data.name}</div>
            
            <img alt="fetching images" src={imageArray[imageIndex]}></img>
            <button onClick={decrementImage}>Previous</button>
            <button onClick={incrementImage}>Next</button>

            <div>Item description: {data.description}</div>
            <div>Current Bid: {data.currentBid} ETH</div>
            <div>Donation Fee {data.donationFee}%</div>
            {
                data.buyItNow !== maxBid &&
                <div>Buy It Now: {data.buyItNow} ETH </div>
            }
            {
                (data.end_time - currentBlock)/blocksPerDay > 1&&
                <div>Auction Ends At Block: {data.end_time} (approximately {(data.end_time - currentBlock)/blocksPerDay} Days)</div>
            }
            {
                (data.end_time - currentBlock)/blocksPerDay < 1 && (data.end_time - currentBlock) > 0?
                <div>
                    Auction Ends At Block: {data.end_time} (approximately {Math.round(((data.end_time - currentBlock)/blocksPerDay)*24)} Hours)
                </div>    
                :<div>
                    <ul>
                        {
                            data.paid === "false" && (data.end_time - currentBlock < 0) &&
                            <div> Auction Ended
                                <button onClick={payWinningBid}>Pay for Item</button>
                            </div>
                        }
                        <li> 
                           
                            

                        </li>
                    
                    </ul>
                </div>
            }

            <div>Seller: {data.seller} </div>
            <div>Paid For: {data.paid}</div>
            {
                data.highestBidder !== dummyAddress &&
            <div>High Bidder: {data.highestBidder}</div>
            
            }

            {
                String(data.seller).toLowerCase() !== currAddress.toLowerCase() && data.paid === "false" &&
                <div className='auctions-container'>
                    <input style={{
                    borderRadius: 3,
                    color: "black",
                }} type="number" placeholder={(data.currentBid+bidStep).toFixed(3)} step={bidStep} min={(data.currentBid + bidStep).toFixed(3)} value={formParams.currentBid} onChange={e => updateFormParams({...formParams, currentBid: e.target.value})}></input>
                    <br></br>            
                    <button onClick={bidOnItem}>{buttonMessage}</button>
                </div>
            }
            {
                String(data.seller).toLowerCase() === String(currAddress).toLowerCase() &&
                <div>
                <button onClick={togglePhotoInfo}>Change Photo</button>
                {
                        wantsToUpdatePhoto &&
                        <div>
                            <div className='form'>
                                <label>Upload a Photo</label><br></br>
                                <div className='auctions-continer'>
                                    <label className='form-label'>File Upload</label>
                                    <input type={"file"} onChange={OnChangeFile}></input>
                                    <div className='form-label'>{message}</div>
                                </div>
                            </div>
                                <div className='image-upload-array'>
                                    <div>Photos To Upload</div>
                                    {
                                        imageArray.length > 0 && imageArray.map((imageURL, index) => 
                                        <div>
                                            <p>{imageURL}</p>
                                            <img key={index} src={imageURL}></img>
                                            <button onClick={() => removePhoto(index)}>Remove Photo</button>
                                        </div>
                                        )
                                    }
                                    <button onClick={changePhoto}>Submit Photo(s)</button>
                                </div>
                        </div>
                }
                    <button onClick={viewShippingLabel}>Shipping Label</button>
                </div>
            }

            {
                
                data.paid === "true" && currAddress === data.highestBidder &&

                
                    data.shippingInfo === "" &&
                        <div className='auctions-container'>Would you like to share your info?
                        <li><button style={{
                        backgroundColor: "blue",
                        height: 50,
                        width: 100,
                        borderRadius: 10,
                    }} onClick={shareShippingInfo}>Share Your Info</button>
                        </li>
                <h3>Have you Received This Item?</h3>
                <li><button onClick={itemReceived}>Yes</button></li>

                <li><button onClick={itemNotReceived}>No</button></li>
                </div>
            }
            

            {
                data.received && data.seller.toLowerCase() === currAddress.toLowerCase() &&
                <li><button onClick={withdrawProfits}>withdraw</button>

                </li>
            }

            {
                showShippingInfoModal &&
                <ShippingLabel shippingInfo={shippingInfo}></ShippingLabel>
            }
            
        </div>
        
    </div>
    )
}

