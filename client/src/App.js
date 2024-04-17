import './App.css';
import Navbar from './components/Navbar.js';
import Marketplace from './components/Marketplace';
import Profile from './components/Profile';
import SellNFT from './components/SellNFT';
import NFTPage from './components/NFTpage';
import About from './components/About'
import Auctions from './components/Auctions';
import AuctionListings from './components/AuctionListings';
import AuctionPage from './components/AuctionPage';
import User from './components/User';
import ReactDOM from "react-dom/client";
import NFTAuctionsMarket from './components/NFTAuctionsMarket.js';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { Component } from 'react';
import ViewMyBids from './components/ViewMyBids.js';




function App() {
  return (
    <div className="container">
        <Routes>
          <Route path="/" element={<Marketplace />}/>
          <Route path="/nftPage" element={<NFTPage />}/>        
          <Route path="/MyNFTs" element={<Profile />}/>
          <Route path="/sellNFT" element={<SellNFT />}/>
          <Route path="/About" element={<About />}></Route>
          <Route path="/Auctions" element={<Auctions />}></Route>
          <Route path="/AuctionListings"  element={<AuctionListings />}></Route>
          <Route path="/AuctionPage" element={<AuctionPage />}></Route>
          <Route path="/User" element={<User />}></Route>
          <Route path="/ViewMyBids" element={<ViewMyBids />}></Route>
          <Route path="/NFTAuctionsMarket" element={<NFTAuctionsMarket />}></Route>
        </Routes>
    </div>
  );
}


export default App;
