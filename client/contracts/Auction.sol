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

contract Auction {
    //donation address, this should be changeable with "owner"
    address constant donationAddress = 0xf587BC0397DdCE74687789857D0Af56523f993F3;
    //dummy address, we use this when we have no bids
    address constant nullAddress = 0x0000000000000000000000000000000000000000;
    //maxBid, the largest number our JS client can handle
    uint256 constant maxBid = 9007199254740991;
    //save the contract address so it is easier to pay it
    address payable contractAddress =  payable(address(this));

    using Counters for Counters.Counter;
    //create a counter to keep track of individual auction listings
    Counters.Counter private _auctionIds;    
    //Auction Item Struct: Holds important information about each auction
    struct AuctionItem {
        uint256 auctionId;
        uint256 end_time;
        uint256 current_bid;
        string metadataURI;
        address payable highest_bidder;
        address payable seller;
        bool paid;
        uint256 buyItNowPrice;
        bool received;
        bool paidToSeller;
        uint256 donationFee;
        string shippingInfo;
    }
    //events to emit when stuff happens
    event AuctionCreated (
        uint256 end_time
    );

    event BidSuccessful (
        uint256 end_time,
        uint256 current_bid,
        address highestBidder
    );

    event InfoChangeSuccessful (
        uint256 end_time,
        uint256 current_bid,
        string metadataURI,
        address highest_bidder,
        address seller,
        bool paid,
        uint256 buyItNowPrice
    );

    //create a list to hold our auctions
    mapping(uint256 => AuctionItem) private auctionsList;

    function createAuction(uint256 end_time, uint256 buyItNow, uint256 dontationFee, string memory metadataURI) public returns (AuctionItem memory) {
        //give the auction a unique auctionId number
        uint256 auctionId = _auctionIds.current();
        //schedule the end of the auction, current blocktime plus the length of the auction
        uint256 scheduledEnd = block.number + end_time;
        require(dontationFee >= 25, "Your donation fee must be a minimum of 25%");
        auctionsList[auctionId] = AuctionItem(
            //auctionId number
            auctionId,
            //when the auction will end
            scheduledEnd,
            //Current bid, we start at zero
            0,
            //metadata Uri, required to hold both image and description
            metadataURI,
            //Since there is no current bid, we have no high bidder
            payable(nullAddress),
            //wallet calling the function is the seller
            payable(msg.sender),
            //the item has not been paid for yet so the bool "paid" should be false
            false,
            //buyItNow price will be set from the user end
            buyItNow,
            //item is just being listed for sale, received will be false
            false,
            //the seller has not been paid so paidToSeller will be false
            false,
            //save the donation fee
            dontationFee,
            //create an empty string for shipping info
            ""
            );
        //inform the caller that the auction has been successfully created
        emit AuctionCreated(end_time);
        //increment _auctionsIds so we're ready for the next listing
        _auctionIds.increment();
        //return the auction to the caller so the information can be used client side
        return auctionsList[auctionId];
    }

    function createAuctionWithImage(uint256 end_time, string memory imageURI, uint256 buyItNow, uint256 donationFee) public returns (AuctionItem memory) {
        //give this auction a unique id number
        uint256 auctionId = _auctionIds.current();
        //schedule the end of the auction, current blocktime plus the length of the auction in blocks
        uint256 scheduledEnd = block.number + end_time;
        require(donationFee >= 25, "Your donation fee must be at least 25%");

        auctionsList[auctionId] = AuctionItem(
            //auctionId number
            auctionId,
            //when the auction will end
            scheduledEnd,
            //Current bid, we start at zero
            0,
            //save the URL of the image
            imageURI,
            //Since there is no current bid, we have no high bidder
            payable(nullAddress),
            //wallet calling the function is the seller
            payable(msg.sender),
            //buyItNow will be false for now
            false,
            //buyItNow price will be the maximum value in Solidity
            buyItNow,
            //item is just being listed for sale, received will be false
            false,
            //the seller has not been paid, paidToSeller will be false
            false,
            //save the donation fee
            donationFee,
            //create an empty string for shipping info
            ""
            );
        //inform the caller that the auction has been successfully created
        emit AuctionCreated(end_time);
        //increment _auctionIds so we're ready for the next one
        _auctionIds.increment();
        //return the auction to the caller so the information can be used client side
        return auctionsList[auctionId];
    }

    
    function bidOnItem(uint256 auctionId, uint256 bidAmount) public payable {
        //you cannot bid lower than the current bid
        require(auctionsList[auctionId].current_bid < bidAmount, "You must bid higher than the current price");
        //the seller cannot bid on their own items
        require(auctionsList[auctionId].seller != msg.sender, "You can't bid on your own auctions!");
        //raise the current bid to the caller's bid amount
        auctionsList[auctionId].current_bid = bidAmount;
        //change the highest bidder to that just set a new bid amount
        auctionsList[auctionId].highest_bidder = payable(msg.sender);
        //if the bid amount is greater or equal to the buyItNowPrice, execute logic below
        if (bidAmount >= auctionsList[auctionId].buyItNowPrice) {
            //pay for the item
            uint256 fullPrice = auctionsList[auctionId].buyItNowPrice;
            uint256 donationPercent = auctionsList[auctionId].donationFee;
            uint256 donationCut;

            if (donationPercent == 25) {
                donationCut = fullPrice / 4;
            } else if (donationPercent == 50) {
                donationCut = fullPrice / 2;
            } else if (donationPercent == 75) {
                donationCut = (fullPrice / 4) * 3;
            } else {
                donationCut = fullPrice;
            }
            uint256 sellerCut = fullPrice - donationCut;
            contractAddress.transfer(sellerCut);
            payable(donationAddress).transfer(donationCut);
            //change the end_time of the auction, the item has been sold
            auctionsList[auctionId].end_time = block.number;
            //remember that the buyer has paid for the item
            auctionsList[auctionId].paid = true;

        }

        emit BidSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].highest_bidder
            );
    }

    function closeOutItem(uint256 auctionId) public payable {
        //the item must be paid for
        require(auctionsList[auctionId].paid == true, "You haven't paid for your item yet!");
        //the auction must be finished
        require(auctionsList[auctionId].end_time <= block.number, "The auction hasn't ended yet!");
        //only the buyer can mark the item received
        require(msg.sender == auctionsList[auctionId].highest_bidder, "Only the buyer can approve this action");
        //update the status, the user has received the item
        auctionsList[auctionId].received = true;
        //inform the caller that the status has been updated
        emit InfoChangeSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].metadataURI,
            auctionsList[auctionId].highest_bidder,
            auctionsList[auctionId].seller,
            auctionsList[auctionId].paid,
            auctionsList[auctionId].buyItNowPrice
        );
    }

    function payWinningBid(uint256 auctionId) public payable {
        require(auctionsList[auctionId].end_time < block.number, "The auction has not ended yet!");
        require(msg.sender == auctionsList[auctionId].highest_bidder, "Only the winner can buy the item!");

        uint256 fullPrice = auctionsList[auctionId].current_bid;
        uint256 donationPercent = auctionsList[auctionId].donationFee;
        uint256 donationCut;

        if (donationPercent == 25) {
            donationCut = fullPrice / 4;
        } else if (donationPercent == 50) {
            donationCut = fullPrice / 2;
        } else if (donationPercent == 75) {
            donationCut = (fullPrice / 4) * 3;
        } else {
            donationCut = fullPrice;
        }
        uint256 sellerCut = fullPrice - donationCut;
        contractAddress.transfer(sellerCut);
        payable(donationAddress).transfer(donationCut);
        //change the end_time of the auction, the item has been sold
        auctionsList[auctionId].end_time = block.number;
        //remember that the buyer has paid for the item
        auctionsList[auctionId].paid = true;

        emit InfoChangeSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].metadataURI,
            auctionsList[auctionId].highest_bidder,
            auctionsList[auctionId].seller,
            auctionsList[auctionId].paid,
            auctionsList[auctionId].buyItNowPrice
        );
    }

    function addShippingInfo(uint256 auctionId, string memory shippingInfo) public {
        require(auctionsList[auctionId].highest_bidder == msg.sender, "You are not the highest bidder");
        require(auctionsList[auctionId].paid == true, "You have not paid for the item yet!");
        auctionsList[auctionId].shippingInfo = shippingInfo;
    }

    //withdraw profits from an auction
    function withdrawAuctionProfits(uint256 auctionId) external payable {
        //make sure that the item has been paid for
        require(auctionsList[auctionId].paid == true, "The buyer hasn't paid yet!");
        //if the seller has already been paid, the contract will refuse to pay them again
        require(auctionsList[auctionId].paidToSeller == false, "You have already been paid!");
        //only the seller can withdraw their profits
        require(msg.sender == auctionsList[auctionId].seller, "You aren't the seller of this item");
        //update the seller's withdrawal status
        auctionsList[auctionId].paidToSeller = true;
        //withdrawalAmount is the current_bid, the price that was paid for the item
        uint256 withdrawalAmount = auctionsList[auctionId].current_bid;
        //pay the seller
        auctionsList[auctionId].seller.transfer(withdrawalAmount);
        //inform the caller of a successful payment
        emit InfoChangeSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].metadataURI,
            auctionsList[auctionId].highest_bidder,
            auctionsList[auctionId].seller,
            auctionsList[auctionId].paid,
            auctionsList[auctionId].buyItNowPrice
        );
    }

    //retrieve the list of all auctions that have been created
    function retrieveListings() public view returns (AuctionItem[] memory) {
        uint256 listHeight = _auctionIds.current();
        AuctionItem[] memory listings = new AuctionItem[](listHeight);
        for (uint i=0; i<listHeight; i++) {
            listings[i] = auctionsList[i];
        }
        return listings;
    }

    function updatePicture(uint256 auctionId, string memory metadataURI) public {
        //only the seller can change information about the auction
        require(auctionsList[auctionId].seller == msg.sender, "Only the seller can change the auction details");
        //update the image of the item
        auctionsList[auctionId].metadataURI = metadataURI;

        emit InfoChangeSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].metadataURI,
            auctionsList[auctionId].highest_bidder,
            auctionsList[auctionId].seller,
            auctionsList[auctionId].paid,
            auctionsList[auctionId].buyItNowPrice
        );
    }

    function updateAuctionMetadata(uint256 auctionId, string memory newMetadataURI) public {
        require(auctionsList[auctionId].seller == msg.sender, "Only the seller can change the picture!");
        auctionsList[auctionId].metadataURI = newMetadataURI;
        emit InfoChangeSuccessful(
            auctionsList[auctionId].end_time,
            auctionsList[auctionId].current_bid,
            auctionsList[auctionId].metadataURI,
            auctionsList[auctionId].highest_bidder,
            auctionsList[auctionId].seller,
            auctionsList[auctionId].paid,
            auctionsList[auctionId].buyItNowPrice
        );

    }

    //retrieve a specific auction
    function retrieveIndividualListing(uint256 auctionId) public view returns (AuctionItem memory) {
        uint256 listheight = _auctionIds.current();
        //you can only retrieve auctions that are in the list
        require(auctionId <= listheight, "This listing doesn't exist yet");
        //return the auction
        return auctionsList[auctionId];
    }

    function getListingHeight() public view returns (uint256) {
        return _auctionIds.current();
    }

    event Received(address sender, uint256 value);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}