import fullLogo from '../full_logo.jpg';
import { Link } from "react-router-dom";
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { getChainId } from 'web3modal';

function Navbar() {
//variables used in rendering
const [connected, toggleConnect] = useState(false);
const location = useLocation();
const [currAddress, updateAddress] = useState('0x');
const [balance, updateBalance] = useState(0);
const [chainId, updateChain] = useState("");
const [selectedNetwork, updateSelectedNetwork] = useState("sepolia testnet");
const [connectedNetwork, updateConnectedNetwork] = useState("");
//connect to the user wallet
async function getAddress() {
  const ethers = require("ethers");
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const addr = await signer.getAddress();
  const currentBalance = await signer.getBalance();
  updateBalance(Number(currentBalance)/1_000_000_000_000_000_000);
  updateAddress(addr);
}

function updateButton() {
  const ethereumButton = document.querySelector('.enableEthereumButton');
  ethereumButton.textContent = "Connected";
}

async function connectWebsite() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    updateChain(chainId);
    await window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(() => {
        updateButton();
        console.log("here");
        getAddress();
        window.location.replace(location.pathname)
      });
}

async function getNetwork() {
  const chainId = await window.ethereum.request( {method: "eth_chainId"});

  const readableId = Number(chainId);

  if (readableId === 11155111) {
    updateConnectedNetwork("sepolia testnet");
  } else if (readableId === 11155420) {
    updateConnectedNetwork("optimism sepolia");
  } else if (readableId === 420) {
    updateConnectedNetwork("optimism goerli");
  }
  console.log("connected to:", chainId);
}


async function switchNetwork() {
  console.log("switching to:", selectedNetwork);
  const newChainId = getNetworkId(selectedNetwork);
  console.log("proposed chainId:", newChainId);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{chainId: newChainId}]
    });
    updateChain(newChainId);
    updateConnectedNetwork(selectedNetwork);
  } catch(err) {
    alert("Failed to switch network!");
    alert(err);
  }
}

function getNetworkId(networkString) {
  if (networkString === "sepolia testnet") {
    return `0x${(11155111).toString(16)}`;
  } else if (networkString === "optimism goerli") {
    return `0x${(420).toString(16)}`;
  } else if (networkString === "optimism sepolia") {
    return `0x${(11155420).toString(16)}`
  } else {
    alert("Failed to connect to custom network!");
  }
}



  useEffect(() => {
    if(window.ethereum === undefined)
      return;
    let val = window.ethereum.isConnected();
    if(val)
    {
      console.log("wallet connected");
      getAddress();
      toggleConnect(val);
      updateButton();
    }

    window.ethereum.on('accountsChanged', function(accounts){
      window.location.replace(location.pathname)
    });

    if (connectedNetwork === "") {
      getNetwork();
    }
  });

    return (
      <div className="navbar">
        <nav>
        <div>
          <p>Current Network {connectedNetwork}</p>
          <button onClick={switchNetwork}>Switch Network</button>
          <label for="networkSelect">Choose a Network:</label>
          <select className="network-selector" id="networkSelect" onChange={(e) => updateSelectedNetwork(e.target.value)}>
            <option value="sepolia testnet">Sepolia Testnet</option>
            <option value="optimism goerli">Optimism Goerli Testnet</option>
            <option value="optimism sepolia">Optimism Sepolia Testnet</option>
          </select>
        </div>
          <ul>
          <li>
            <Link to="/">
            <img src={fullLogo} alt=""/>
            </Link>
          </li>
          <li>
            <ul>
              {location.pathname === "/" ? 
              <li>
                <Link to="/About">About</Link>
              </li>
              :
              <li>
                <Link to="/About">About</Link>
              </li>              
              }
              {location.pathname === "/" ? 
              <li>
                <Link to="/ViewMyBids">View Your Bids</Link>
              </li>
              :
              <li>
                <Link to="/ViewMyBids">View Your Bids</Link>
              </li>              
              }
              {location.pathname === "/NFTAuctionsMarket" ?
              <li>
                <Link to="/NFTAuctionsMarket">NFT Auctions Market</Link>
              </li>
              :
              <li>
                <Link to="/NFTAuctionsMarket">NFT Auctions Market</Link>
              </li>
              }
              {location.pathname === "/" ? 
              <li>
                <Link to="/">NFT Marketplace</Link>
              </li>
              :
              <li>
                <Link to="/">NFT Marketplace</Link>
              </li>              
              }
              {location.pathname === "/sellNFT" ? 
              <li>
                <Link to="/sellNFT">Mint</Link>
              </li>
              :
              <li>
                <Link to="/sellNFT">Mint</Link>
              </li>              
              }   
              {location.pathname === "/Auctions" ? 
              <li>
                <Link to="/Auctions">Create An Auction</Link>
              </li>
              :
              <li>
                <Link to="/Auctions">Create an Auction</Link>
              </li>              
              }
                {location.pathname === "/AuctionListings" ? 
              <li>
                <Link to="/AuctionsListings">View Auctions</Link>
              </li>
              :
              <li>
                <Link to="/AuctionListings">View Auctions</Link>
              </li>              
              }      
              {location.pathname === "/profile" ? 
              <li>
                <Link to="/MyNFTs">View Your NFTs</Link>
              </li>
              :
              <li>
                <Link to="/MyNFTs">View Your NFTs</Link>
              </li>              
              }
              {
                location.pathname === "User" ?
                <li>
                <Link to="/User">User Settings</Link>
                </li>
                :
                <li>
                  <Link to="/User">User Settings</Link>
                </li>
              }
              <li>
                <button className="enableEthereumButton" onClick={connectWebsite}>{connected? "Connected":"Connect Wallet"}</button>
              </li>
                
              
            </ul>
          </li>
          </ul>
        </nav>
        <div className='text-white text-bold text-right mr-10 text-sm'>
          {currAddress !== "0x" ? "Connected to":"Not Connected. Please login to view NFTs"} {currAddress !== "0x" ? (currAddress.substring(0,15)+'...'):""}
        </div>
          {currAddress !== "0x" &&
            <div style={{
              color: "white",
              fontSize: "large",
              fontWeight: "bold",
            }}>Balance: {balance} ETH</div>}
      </div>
    );
  }

  export default Navbar;
