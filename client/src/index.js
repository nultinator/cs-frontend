import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import SellNFT from './components/SellNFT';
import Marketplace from './components/Marketplace';
import Profile from './components/Profile';
import NFTPage from './components/NFTpage';
import About from './components/About';
import Auctions from './components/Auctions';
import AuctionListings from './components/AuctionListings';
import AuctionPage from './components/AuctionPage';
import User from './components/User';
import ViewMyBids from './components/ViewMyBids';
import NFTAuctionsMarket from './components/NFTAuctionsMarket';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketplace />}/>
        <Route path="/sellNFT" element={<SellNFT />}/> 
        <Route path="/nftPage/:contractAddress/:tokenId" element={<NFTPage />}/>  
        <Route path="/:contractAddress/:tokenId" element={<NFTPage />}/>      
        <Route path="/MyNFTs" element={<Profile />}/>
        <Route path="/About" element={<About />}></Route> 
        <Route path="/Auctions" element={<Auctions />}></Route>
        <Route path="/AuctionListings" element={<AuctionListings />}></Route>
        <Route path="/AuctionPage/:auctionId" element={<AuctionPage />}></Route>
        <Route path="/:auctionId" element={<AuctionPage />}></Route>
        <Route path="/User" element={<User />}></Route>
        <Route path="/ViewMyBids" element={<ViewMyBids />}></Route>
        <Route path="/NFTAuctionsMarket" element={<NFTAuctionsMarket />}></Route>


      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
