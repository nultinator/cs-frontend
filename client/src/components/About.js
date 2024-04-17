import Navbar from "./Navbar";
import { useState } from "react";
import { Link } from "react-router-dom";

function About() {
    const [data, updateData] = useState({});




    return (
    <div>
    <Navbar></Navbar>
    

    <div className="centered-container" style={{textAlign: "center"}}>
        <div className="text">
            <h1 style={{fontSize: 30}}>What is CS?</h1><br></br>
            <p>
                    CS is planned to be a cross of Web2 and Web3.
                At the moment, the platform supports Fixed Price NFT Sales, NFT Auctions, and Physical
                Goods Auctions.  We are currently live on the Ethereum Sepolia Testnet.
            
            </p><br></br>
            <h1 style={{fontSize: 30}}>What Can I Do With CS NFTs?</h1><br></br>
            <p>
                    The first tokens minted on CS will all be a part of the CS collection.
                These tokens follow the ERC-721 standard.  These tokens could potentially be used
                in the future for things such as DAO voting, art/news subscriptions and many other
                possibilities.
            
            </p><br></br>
            <h1 style={{fontSize: 30}}>What Can I do at CS right now?</h1><br></br>
            <p>
                    CS is live on Ethereum's Sepolia Testnet.  At the moment, you can do the following:
                    <ul>
                        <li>Mint NFTs</li>
                        <li>Sell NFTs</li>
                        <li>Auction NFTs</li>
                        <li>Auction physical goods</li>
                    </ul> 
            
            </p><br></br>
            <h1 style={{fontSize: 30}}>What is the Donation Fee?</h1><br></br>
            <p>
                    Donation fees depend on what you're doing.  If you are selling an NFT on the
                platform, CS takes a minimum of 25%.  If you wish to donate more, you can set your
                donation to 50%, 75%, or 100%.  If you are simply minting a token to your wallet,
                the minimum donation is 0.001 ETH (Sepolia ETH, we're still on testnet), you can donate
                more if you wish by simply entering a larger amount.  Auctions follow the same fee structure for
                both physical and digital goods.
            
            </p><br></br>
            <h1 style={{fontSize: 30}}>How Do I Mint a Token?</h1><br></br>
            <p>
                    You can check out our <Link to="/sellNFT" style={{color: "teal"}}>mint</Link> page
                and fill in the boxes.  Once you're finished filling them in, click either the
                "Create And List this NFT" button or the "Mint to Wallet" button.
            
            </p><br></br>
            <h1 style={{fontSize: 30}}>How Do I list an NFT for Auction?</h1>
            <p>
                    Click the <Link to="/Profile" style={{color: "teal"}}>View Your NFTs</Link> page
                and click the NFT you'd like to list for sale.  Fill the boxes and click the "Create Auction"
                button.
            </p><br></br>
            <h1 style={{fontSize: 30}}>How Do Auction Physical Goods?</h1>
            <p>
                    View the <Link to="/Auctions">Create an Auction</Link> page.  Fill the required boxes
                (Auction Length, Buy It Now, Donation Fee).  "Buy It Now" is optional.  Upload a picture of your
                item (optional).  Then click the "Create Auction" button. 
            </p>
            <h1 style={{fontSize: 30}}>Where Can I get Testnet ETH?</h1><br></br>
            <p>
                    We are live on Ethereum's Sepolia Testnet. You can head over to 
                Alchemy's <Link to="https://sepoliafaucet.com" style={{color: "teal"}}>Sepolia Faucet</Link>.
                You will need to create an <Link to="https://www.alchemy.com">Alchemy</Link> account in
                order to collect from the faucet.
            
            </p><br></br>
        </div>
    </div>
    </div>
    )
}

export default About;