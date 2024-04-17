//SPDX-License-Identifier: Unlicense


pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
//the imports below are for selling existing NFTs
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract NFTAuctions {
    //donation address
    address constant donationAddress = 0xf587BC0397DdCE74687789857D0Af56523f993F3;

    //dummy address, we use this when we have no bids
    address constant nullAddress = 0x0000000000000000000000000000000000000000;
    //maxBid, the largest number our JS client can handle
    uint256 constant maxBid = 9007199254740991;
    //Save the contract address so it is easier to pay it
    address payable contractAddress =  payable(address(this));
    using Counters for Counters.Counter;

    Counters.Counter private _nftAuctionIds;
    //struct to hold information we need on an auction
    struct AuctionItem {
        address tokenContractAddress;
        uint256 tokenId;
        uint256 nftAuctionId;
        uint256 end_time;
        uint256 currentBid;
        address payable highestBidder;
        address payable seller;
        bool paid;
        uint256 buyItNowPrice;
        bool sellerHasBeenPaid;
        uint256 donationFee;
    }
    event NFTAuctionCreated(
        uint256 end_time
    );

    event NFTAuctionCancelled(
        address tokenContractAddress,
        uint256 tokenId
    );

    event BidSuccessful(
        uint256 end_time,
        uint256 currentBid,
        address highestBidder
    );
    event PaymentSuccessful(
        uint256 currentBid
    );

    mapping(uint256 => AuctionItem) private nftAuctionsList;

    function createNFTAuction(address tokenContractAddress, uint256 tokenId, uint256 end_time, uint256 buyItNow, uint256 donationFee) public returns (AuctionItem memory) {
        _nftAuctionIds.increment();
        uint256 nftAuctionId = _nftAuctionIds.current();
        //calculate the auction end blockheight
        uint256 scheduledEnd = block.number + end_time;
        IERC721 nft = IERC721(tokenContractAddress);
        nftAuctionsList[nftAuctionId] = AuctionItem(
            //token contract address
            tokenContractAddress,
            //token id
            tokenId,
            //auction id
            nftAuctionId,
            //end time
            scheduledEnd,
            //current bid---there are none yet, set to zero
            0,
            //highest bidder---no bids yet, set to null address
            payable(nullAddress),
            //wallet calling this function is the seller
            payable(msg.sender),
            //item has not been paid for, this bool is false
            false,
            //buy it now price
            buyItNow,
            //seller has not been paid, this bool will be false
            false,
            //donation fee
            donationFee
        );
        nft.transferFrom(msg.sender, address(this), tokenId);
        emit NFTAuctionCreated(end_time);
    }

    function bidOnNFT(uint256 nftAuctionId, uint256 bidAmount) public payable {
        require(nftAuctionsList[nftAuctionId].seller != msg.sender, "You can't bid on your own auctions!");
        //if the auction has ended, the caller MUST be the highest bidder
        if (block.number > nftAuctionsList[nftAuctionId].end_time) {
            require(msg.sender == nftAuctionsList[nftAuctionId].highestBidder);
            //reset the buyItNow price
            nftAuctionsList[nftAuctionId].buyItNowPrice = nftAuctionsList[nftAuctionId].currentBid;
        //this code executes if the auction is still live
        } else {
            //the bid MUST be higher than the current bid
            require(nftAuctionsList[nftAuctionId].currentBid < bidAmount, "Please bid higher than the current bid!");
            //set the new highest bid
            nftAuctionsList[nftAuctionId].currentBid = bidAmount;
            //set the new highest bidder
            nftAuctionsList[nftAuctionId].highestBidder = payable(msg.sender);
        }

        //if the bid amount as greater than or equal to the buyItNowPrice
        if (bidAmount >= nftAuctionsList[nftAuctionId].buyItNowPrice) {
            uint256 fullPrice = nftAuctionsList[nftAuctionId].buyItNowPrice;
            uint256 donationPercent = nftAuctionsList[nftAuctionId].donationFee;
            uint256 donationCut;

            if (donationPercent == 25) {
                donationCut = fullPrice/4;
            } else if (donationPercent == 50) {
                donationCut = fullPrice/2;
            } else if (donationPercent == 75) {
                donationCut = (fullPrice/4) * 3;
            } else {
                donationCut = fullPrice;
            }
            uint256 sellerCut = fullPrice - donationCut;
            payable(donationAddress).transfer(donationCut);
            payable(nftAuctionsList[nftAuctionId].seller).transfer(sellerCut);
            nftAuctionsList[nftAuctionId].end_time = block.number;
            nftAuctionsList[nftAuctionId].paid = true;

            IERC721 nft = IERC721(nftAuctionsList[nftAuctionId].tokenContractAddress);
            nft.transferFrom(address(this), msg.sender, nftAuctionsList[nftAuctionId].tokenId);
        }
        emit BidSuccessful(
            nftAuctionsList[nftAuctionId].end_time,
            nftAuctionsList[nftAuctionId].currentBid,
            nftAuctionsList[nftAuctionId].highestBidder
            );
    }

    

    function payWinningBid(uint256 nftAuctionId) public payable {
        require(block.number > nftAuctionsList[nftAuctionId].end_time, "This auction has not ended!");
        require(nftAuctionsList[nftAuctionId].highestBidder == msg.sender, "Only the highest bidder can pay!");
        require(nftAuctionsList[nftAuctionId].paid == false, "This item has already been paid for!");
        uint256 donationPercent = nftAuctionsList[nftAuctionId].donationFee;
        uint256 fullPrice = nftAuctionsList[nftAuctionId].currentBid;
        uint256 donationCut;
        if (donationPercent == 25) {
            donationCut = fullPrice/4;
        } else if (donationPercent == 50) {
            donationCut = fullPrice/2;
        } else if (donationPercent == 75) {
            donationCut = (fullPrice/4) * 3;
        } else {
            donationCut = fullPrice;
        }
        uint256 sellerCut = fullPrice - donationCut;
        payable(donationAddress).transfer(sellerCut);
        payable(nftAuctionsList[nftAuctionId].seller).transfer(sellerCut);
        nftAuctionsList[nftAuctionId].paid = true;
        IERC721 nft = IERC721(nftAuctionsList[nftAuctionId].tokenContractAddress);
        nft.transferFrom(address(this), msg.sender, nftAuctionsList[nftAuctionId].tokenId);
        emit PaymentSuccessful(nftAuctionsList[nftAuctionId].currentBid);
    }

    function retrieveNFTAuctions() public view returns(AuctionItem[] memory) {
        uint256 nftAuctionCount = _nftAuctionIds.current();
        AuctionItem[] memory tokens = new AuctionItem[](nftAuctionCount);
        uint256 index = 0;
        for (uint256 i=0; i<nftAuctionCount; i++) {
            AuctionItem storage currentItem = nftAuctionsList[index];
            tokens[index] = currentItem;
            index += 1;
        }
        return tokens;
    }

    function getMostRecentListing(address tokenContractAddress, uint256 tokenId) public view returns(AuctionItem memory) {
        uint256 listHeight = _nftAuctionIds.current();
        AuctionItem memory mostRecent;
        for(uint256 i=0; i<=listHeight; i++) {
            if (nftAuctionsList[i].tokenContractAddress == tokenContractAddress && nftAuctionsList[i].tokenId == tokenId) {
                mostRecent = nftAuctionsList[i];
            }
        }
        return mostRecent;
    }

    function removeListing(uint256 nftAuctionId) public payable {
        IERC721 nft = IERC721(nftAuctionsList[nftAuctionId].tokenContractAddress);
        address tokenOwner = nftAuctionsList[nftAuctionId].seller;
        require(msg.sender == tokenOwner, "You are not the owner of this token!");
        require(nftAuctionsList[nftAuctionId].sellerHasBeenPaid == false, "This item has already been paid for!");
        require(nftAuctionsList[nftAuctionId].currentBid == 0, "Cannot remove, we already have bidders!");
        uint256 tokenId = nftAuctionsList[nftAuctionId].tokenId;
        nft.transferFrom(address(this), tokenOwner, tokenId);
        emit NFTAuctionCancelled(nftAuctionsList[nftAuctionId].tokenContractAddress, tokenId);
    }

    event Received(address sender, uint256 value);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}