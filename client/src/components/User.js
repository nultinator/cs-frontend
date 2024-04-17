import { useState } from 'react';
import Navbar from './Navbar.js';
import SepoliaUsersJSON from '../Users-sepolia.json';
import OpSepoliaUsersJSON from "../Users-op_sepolia.json";
import SepoliaMarketplaceJSON from "../Marketplace-sepolia.json";
import OpSepoliaMarketPlaceJSON from "../Marketplace-op_sepolia.json";
import SepoliaNFTAuctionJSON from "../NFTAuctions-sepolia.json";
import OpSepoliaNFTAuctionJSON from "../NFTAuctions-op_sepolia.json";
import SepoliaAuctionJSON from "../Auctions-sepolia.json";
import OpSepoliaAuctionJSON from "../Auctions-op_sepolia.json";
import { getNetwork, SERVER_LOCATION } from "../utils.js";
import { uploadJSONToIPFS, uploadFileToIPFS } from '../nftdotstorage.js';
import axios from 'axios';
import { encrypt, decrypt, PrivateKey, PublicKey } from "eciesjs";
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import AuctionTile from './AuctionTile.js';
import NFTTile from './NFTTile.js';


function User() {
    const [data, updateData] = useState({
        walletAddress: '0x',
        userId: '',
        ipfsHash: '',
    });
    const [formParams, updateFormParams] = useState({
        name: '',
        streetAddress: '',
        city: '',
        stateOrProvince: '',
        zipCode: '',
        country: '',
    });
    const [shippingInfo, updateShippingInfo] = useState({
        name: '',
        street: '',
        city: '',
        stateOrProvince: '',
        zipCode: '',
        country: '',
    });
    const [headerMessage, updateHeaderMessage] = useState("Finding Your Info");
    const [dataFetched, updateDataFetched] = useState(false);
    const [userExists, updateUserExists] = useState(false);
    const [wantsToUpdate, updateWantsToUpdate] = useState(false);
    const [wantsTxHistory, updateWantsTxHistory] = useState(false);
    const [auctionHistory, updateAuctionHistory] = useState([]);
    const [nftAuctionHistory, updateNFTAuctionHistory] = useState([]);
    const [nftMarketHistory, updateNFTMarketHistory] = useState([]);

    //user calls this function to say they want to view their history
    function toggleTxHistory() {
        if (!wantsTxHistory) {
            updateWantsTxHistory(true);
        } else if (wantsTxHistory) {
            updateWantsTxHistory(false);
        } else {
            alert("Please refresh the page and try again");
        }
    }

    async function getUserPurchaseHistory() {
        const auctionArray = await getUserAuctionHistory();
        updateAuctionHistory(auctionArray);
        const nftAuctionArray = await getNFTAuctionHistory();
        updateNFTAuctionHistory(nftAuctionArray);
    }

    //get all purchase history on the current network
    async function getUserAuctionHistory() {
        let AuctionJSON;
        const network = await getNetwork();
        if (network.network === "sepolia testnet") {
            AuctionJSON = SepoliaAuctionJSON;
        } else if (network.network === "optimism sepolia") {
            AuctionJSON = OpSepoliaAuctionJSON;
        } else {
            alert("Unsupported Network, please select one of the supported networks!");
            return;
        }
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        const currentBlock = await provider.getBlockNumber();
        const auctionsContract = new ethers.Contract(AuctionJSON.address, AuctionJSON.abi, signer);
        const auctionsList = await auctionsContract.retrieveListings();
        const auctionArray = [];
        const auctionItems = await Promise.all(auctionsList.map(async i => {
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
                paid: i.paidToSeller,
                isSeller: i.seller.toLowerCase() === address.toLowerCase()
            }
            //filter this by whether or not the auction has ended
            if (currentBlock > item.end_time && item.highestBidder.toLowerCase() === address.toLowerCase()) {
                auctionArray.push(item);
            } else if (item.seller) {
                auctionArray.push(item);
            }
        }));
        console.log("Auction Array:", auctionArray);
        return auctionArray.reverse();
    }

    async function getNFTAuctionHistory() {
        let NFTAuctionsJSON;
        const network = await getNetwork();
        if (network.network === "sepolia testnet") {
            NFTAuctionsJSON = SepoliaNFTAuctionJSON;
        } else if (network.network === "optimism sepolia") {
            NFTAuctionsJSON = OpSepoliaNFTAuctionJSON;
        } else {
            alert("Unsupported Network! Please switch networks");
        }
        const ethers = require("ethers");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        const currentBlock = await provider.getBlockNumber();
        const nftAuctionsContract = new ethers.Contract(NFTAuctionsJSON.address, NFTAuctionsJSON.abi, signer);
        const nftAuctionsList = await nftAuctionsContract.retrieveNFTAuctions();
        console.log("NFT auctions:", nftAuctionsList);
        let cleanedArray = [];
        await Promise.all(nftAuctionsList.map(async i => {
            const metadata = await axios.get(`${SERVER_LOCATION}/getTokenMetaData?contractAddress=${i.tokenContractAddress}&tokenId=${i.tokenId}`, {
                headers: {
                    network: network.network
                }
            });
            let item = {

                    tokenId: Number(i.tokenId),
                    description: metadata.data.raw.metadata.description,
                    //website: "https://chosensanctuary.eth",
                    seller: i.seller,
                    image: metadata.data.image.originalUrl,
                    endTime: Number(i.end_time),
                    contractAddress: i.tokenContractAddress,
                    highestBidder: i.highestBidder,
                    paid: i.paid,
                    isSeller: i.seller.toLowerCase() === address.toLowerCase()
                }
                if (item.highestBidder.toLowerCase() === address.toLowerCase() && currentBlock >= item.endTime) {
                    cleanedArray.push(item);
                } else if (item.seller) {
                    cleanedArray.push(item);
                }
                
            }));
            console.log("Cleaned array", cleanedArray);
            return cleanedArray.reverse();
    }
        //clean the list
        //return the array
    
    //this function retrieves all info about the user and displays on the page
    async function getUser() {
        //variable smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
        //unsupported network
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //get the user's signature
        const signer = provider.getSigner();
        //connect to the contract variable
        const contract =  new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        //get the user's wallet address
        const walletAddress = await signer.getAddress();
        //update the state of the wallet address in the display
        data.walletAddress = walletAddress;
        //check if the user exists
        const exists = await checkUserExists();
        console.log("Exists", exists);
        //if the user exists
        if (exists) {
            updateHeaderMessage("Found your account");
            console.log("attempting to fetch user id");
            //get the userId
            const userId = Number(await contract.getUserId(data.walletAddress));
            console.log("User id:", userId);
            //fetch the rest of the info using the userId
            const userInfo = await contract.retrieveUserInfo(userId);
            console.log("User info", userInfo);
            //rendering info, these are used for state
            const renderingInfo = {
                userId: userId,
                pubKey: userInfo.pubKey,
                privKey: userInfo.privKey,
                ipfsHash: userInfo.ipfsHash,
            }
            //update the user data with the rendering info
            updateData(renderingInfo);
            //the user has not finished setting up their shipping info
            if (userInfo.ipfsHash === "") {
                updateHeaderMessage("You need to finish setting up your account!");
            //the user is fully setup
            } else {
                console.log("Looking up your ipfs data");
                //fetch the shipping info
                const shippingInfo = await axios.get(renderingInfo.ipfsHash);
                console.log("Shipping info:", shippingInfo);
                //store the data type of shippingInfo
                const dataType =  typeof shippingInfo.data.name;
                console.log("dataType:", dataType);
                //if the dataType is NOT a string, we need to decrypt
                if (dataType !== "string") {
                    //alert("Data is encrypted");
                    //decrypt the name
                    const decryptedName = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.name)).toString();
                    console.log("Decrypted name:", decryptedName);
                    //decrypt the streetAddress
                    const decryptedStreet = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.streetAddress)).toString();
                    console.log("Decrypted street:", decryptedStreet);
                    //decrypt the city
                    const decryptedCity = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.city)).toString();
                    console.log("Decrypted city:", decryptedCity);
                    //decrypt the state/province
                    const decryptedStateOrProvince = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.stateOrProvince)).toString();
                    console.log("Decrypted State/Province:", decryptedStateOrProvince);
                    //decrypt the zipcode
                    const decryptedZipCode = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.zipCode)).toString();
                    console.log("Decrypted zip:", decryptedZipCode);
                    //decrypt the country
                    const decryptedCountry = decrypt(userInfo.privKey, Buffer.from(shippingInfo.data.country)).toString();
                    console.log("Decrypted country:", decryptedCountry);
                    //create a JSON object from the decrypted info
                    const decryptedInfo = {
                        name: decryptedName,
                        street: decryptedStreet,
                        city: decryptedCity,
                        stateOrProvince: decryptedStateOrProvince,
                        zipCode: decryptedZipCode,
                        country: decryptedCountry,
                    }
                    //update state with the decrypted info
                    updateShippingInfo(decryptedInfo);
                //info is already stored as plaintext
                } else {
                    //update state with the plaintext
                    updateShippingInfo(shippingInfo.data);
                }
            }
        //the account doesn't exist
        } else {
            updateHeaderMessage("This account does not exist");
        }
    }
    //create a random keypair
    function generateKeyPair() {
        //new private key from eciesjs
        const signingKey = new PrivateKey();
        console.log("Private key from generateKeyPair:", signingKey.toHex());
        const privKey = signingKey.toHex();
        const pubKey = signingKey.publicKey.toHex();
        //return the hex values of the privKey and pubKey
        return { privKey: privKey, pubKey: pubKey }
    }
    
    //this function is used ONLY to test eciesjs
    //if this function fails, check eciesjs documentation for updates
    function encryptionTest() {
        //create a new keypair
        const keyPair = generateKeyPair();
        const pubKey = keyPair.pubKey;
        const privKey = keyPair.privKey;
        //log the random keypair
        console.log("Pubkey:", pubKey);
        console.log("Private key:", privKey);
        //text to encrypt
        const plaintext = "Hello Encryption!";
        //log the text before encryption
        console.log("Plaintext:", plaintext);
        //encrypt the text
        const encryptedText = encrypt(pubKey, plaintext);
        //log the encrypted text
        console.log("Encrypted Text:", encryptedText.toString());
        //decrypt the text
        const decryptedText = decrypt(keyPair.privKey, encryptedText).toString();
        //log the decrypted text
        console.log("Decrypted text:", decryptedText);
        if (decryptedText === plaintext) {
            alert("Encryption is working!");
        } else {
            alert("Data Encryption is not currently working, you can upload plaintext info or try again later");
        }
    }

    //this function replaces the user's existing keypair
    async function setNewKeyPair() {
        //variable smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
        //unsupported network
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //get the user signature
        const signer = provider.getSigner();
        //get the user's address
        const addr = signer.getAddress();
        //create a new keypair
        const keyring = generateKeyPair();
        data.walletAddress = addr;
        //connect to the contract variable
        const contract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        //make a transaction to update the keypair
        let transaction = await contract.addEncryptionKeys(data.userId, keyring.pubKey.toString(), keyring.privKey.toString());
        //wait for the transaction to complete
        await transaction.wait();
        //inform the user that the operation was successful
        alert("You have successfully added a keypair");
    }

    async function checkUserExists() {
        //variable smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
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
        //get the user's wallet address
        const addr = signer.getAddress();
        //update the user data
        data.walletAddress = addr;
        //connect to the contract variable
        const contract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        //call the userExists() method from the contract
        const exists = await contract.userExists(addr);
        updateUserExists(exists);
        if (exists) {
            updateHeaderMessage("Found your account");
        }
        //return the exists (bool) variable
        return exists;
    }

    async function createProfile() {
        //variable smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
        //unsupported network
        } else {
            alert("Unsupported network!");
        }
        //import ethers
        const ethers = require("ethers");
        //talk to the wallet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //get the signature from the user
        const signer = provider.getSigner();
        //connect to the contract variable
        const contract =  new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
        //create a new random keypair for the user
        const keypair = generateKeyPair();
        //make a transaction to create a profile
        let transaction = await contract.createNewUser(data.ipfsHash, keypair.pubKey, keypair.privKey);
        //wait for the transaction to complete
        await transaction.wait();
        //tell the user that the operation was successful
        alert("You have successfully created a new profile!");
    }

    async function uploadAccountInfo() {
        //variable smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
        //unsupported network, alert the user
        } else {
            alert("Unsupported network!");
        }
        console.log("Uploading new account details");
        try {
            console.log("creating encrypted params");
            console.log("Params to encrypt:", formParams);
            //encrypt the name
            const encryptedName = encrypt(data.pubKey, formParams.name);
            console.log("Encrypted Name", encryptedName);
            //encrypt the street address
            const encryptedStreetAddress = encrypt(data.pubKey, formParams.streetAddress);
            console.log("Encrypted street address", encryptedStreetAddress);
            //encrypt the city
            const encryptedCity = encrypt(data.pubKey,formParams.city);
            console.log("Encrypted city", encryptedCity);
            //encrypt the state/province
            const encryptedStateOrProvince = encrypt(data.pubKey, formParams.stateOrProvince);
            console.log("Encrypted State/Provice:", encryptedStateOrProvince);
            //encrypt the zipcode
            const encryptedZipCode = encrypt(data.pubKey, formParams.zipCode);
            console.log("Encrypted Zip", encryptedZipCode);
            //encrypt the country
            const encryptedCountry = encrypt(data.pubKey, formParams.country);
            console.log("Encrypted country:", encryptedCountry);
            //create a JSON object from the variables we encrypted
            const encryptedParams = {
                name: encryptedName,
                streetAddress: encryptedStreetAddress,
                city: encryptedCity,
                stateOrProvince: encryptedStateOrProvince,
                zipCode: encryptedZipCode,
                country: encryptedCountry,
            }
            //encryption was a success, log the success to the console
            console.log("created encrypted params");
            //upload the encrypted params to IPFS
            const ipfsInfoHash = await uploadJSONToIPFS(encryptedParams);
            //log the ipfs hash
            console.log("ipfs hash", ipfsInfoHash);
            //take onnly the url of the hash
            data.ipfsHash = ipfsInfoHash.pinataURL;
            //import ethers to interact with the contract
            const ethers = require("ethers");
            //talk to the wallet
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            //have the user sign
            const signer = provider.getSigner();
            //connect to the smart contract variable
            const contract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
            //make a transaction toupdate the user info within the contract
            let transaction = await contract.updateUserInfo(data.userId, data.ipfsHash);
            //wait for the transaction to complete
            await transaction.wait();
            //inform the user that the update was successful
            alert("You have successfully changed your profile info!");
        } catch(e) {
            //tell the user that the operation failed
            alert("Failed to encrypt your data!");
            //log the error to the console
            console.log("ERROR", e);
            return;
        }
    }

    async function uploadPlainAccountInfo() {
        //variable for the smart contract
        let UsersJSON;
        const network = await getNetwork();
        //if we're on ETH sepolia
        if (network.network === "sepolia testnet") {
            UsersJSON = SepoliaUsersJSON;
        //if we're on OP sepolia
        } else if (network.network === "optimism sepolia") {
            UsersJSON = OpSepoliaUsersJSON;
        //unsupported network, alert the user
        } else {
            alert("Unsupported network!");
        }
        //log the account details to the console
        console.log("Uploading new account details");
        try {
            console.log("creating unencrypted params");
            //upload the file to IPFS
            const ipfsInfoHash = await uploadJSONToIPFS(formParams);
            console.log("ipfs hash", ipfsInfoHash);
            //pull the url of the file
            data.ipfsHash = ipfsInfoHash.pinataURL;
            //import ethers
            const ethers = require("ethers");
            //talk to the wallet
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            //have the user sign
            const signer = provider.getSigner();
            //connect to the contract variable
            const contract = new ethers.Contract(UsersJSON.address, UsersJSON.abi, signer);
            //make a transaction to update the user info
            let transaction = await contract.updateUserInfo(data.userId, data.ipfsHash);
            //wait for the transaction to finish
            await transaction.wait();
            //tell the user that the operation was a success
            alert("You have successfully changed your profile info!");
        } catch(e) {
            //tell the user that the operation failed
            alert("Failed to update your data, please try again");
            //log the error for debugging purposes
            console.log("ERROR", e);
            return;
        }
    }

    async function userSelectAccountInfo() {
        const resp = window.confirm("Would you like to encrypt your account info?");
        if (resp) {
            await uploadAccountInfo();
        } else {
            const newResp = window.confirm("Are you sure you'd like to upload your shipping info as plaintext? (not recommended)");
            if (newResp) {
                await uploadPlainAccountInfo();
            } else {
                return;
            }
        }
    }

    function updateInfoClicked() {
        updateWantsToUpdate(true);
    }    
    
    
    
    if (!dataFetched) {
        getUser();
        console.log(getUserPurchaseHistory());
        updateDataFetched(true);
    }
    

    return (
        <div>
        <Navbar></Navbar>
        <div className="user-page">
            <div className='form-container'>{headerMessage}</div>
            {
                !wantsTxHistory?
                <div className='form-container'>
                    <button onClick={toggleTxHistory}>Purchase History</button>
                </div>:
                <div>
                    <button onClick={toggleTxHistory}>Close Purchase History</button>
                    <button onClick={getUserPurchaseHistory}>Fetch Purchases</button>
                    <div>
                        <div>Your Purchases</div>
                        <div>
                            <div>Physical Goods</div>
                            {
                                auctionHistory.length > 0?

                                auctionHistory.map((value, index) => {
                                    return (
                                        <div>
                                            <AuctionTile data={value} key={index}></AuctionTile>
                                            {
                                                value.isSeller?
                                                
                                                <div>Order Type: Sell</div>:<div>Order Type Type: Buy</div>
                                            }
                                            <div>Paid For: {value.paid.toString()}</div>
                                        </div>
                                    )
                                }):<div>No Purchase History!</div>
                            }
                        </div>
                        <div>Digital Goods</div>
                        <div>
                            {
                                nftAuctionHistory.map((value, index) => {
                                    return (
                                        <div>
                                            <NFTTile data={value} key={index}></NFTTile>
                                            {
                                                value.paid === true?
                                                <div>Paid: {value.paid.toString()}</div>:
                                                <div>You Still need to Pay for this item!</div>
                                            }
                                            {
                                                value.isSeller?
                                                <div>Order Type: Sell</div>:<div>Order Type: Buy</div>
                                            }
                                        </div>
                                    )
                                })
                            }
                        </div>

                    </div>
                </div>
            }
            {
                !userExists?
                <button onClick={createProfile}>Create New Profile</button>
                :<div>User Id: {data.userId.toString()}</div>
            }
            {
                userExists &&
                <div>
                    <h2>IPFS Hash: <Link to={data.ipfsHash}>{data.ipfsHash}</Link></h2>
                </div>
            }

            {
                wantsToUpdate &&
                <div className="user-update-card">
                    <label>Name: {shippingInfo.name}</label>
                    <input type="text" placeholder="Name"
                        onChange={e => updateFormParams({...formParams, name: e.target.value})}></input>
                    <label>Street Address: {shippingInfo.street}</label>
                    <input type="text" placeholder="Street Address"
                        onChange={e => updateFormParams({...formParams, streetAddress: e.target.value})}></input>
                    <label>City: {shippingInfo.city}</label>
                    <input type="text" placeholder="City"
                        onChange={e => updateFormParams({...formParams, city: e.target.value})}></input>
                    <label>State or Province: {shippingInfo.stateOrProvince}</label>
                    <input type="text" placeholder="State or Province"
                        onChange={e => updateFormParams({...formParams, stateOrProvince: e.target.value})}></input>
                    <label>ZIP Code: {shippingInfo.zipCode}</label>
                    <input type="text" placeholder="ZIP Code"
                        onChange={e => updateFormParams({...formParams, zipCode: e.target.value})}></input>  
                    <label>Country: {shippingInfo.country}</label>
                    <input type="text" placeholder="Country"
                        onChange={e => updateFormParams({...formParams, country: e.target.value})}></input>
                
                    <button onClick={userSelectAccountInfo}>Encrypt and Upload Account Info</button>
                    <button onClick={uploadPlainAccountInfo}>Upload Plaintext Account Info</button>
                    <button  onClick={setNewKeyPair}>Set New KeyPair</button>
                </div>                    
                }
                {
                    !wantsToUpdate &&
                    <button onClick={updateInfoClicked}>Update Info</button>
                }
                <button onClick={encryptionTest}>Encryption Test</button>              

        </div>
        </div>
    );
}

export default User;