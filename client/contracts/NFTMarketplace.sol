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

contract NFTMarketplace is ERC721URIStorage {
    using Counters for Counters.Counter;
    //_listingId variable keeps track of the items listed
    Counters.Counter private _listingIds;
    //_tokenIds is the most recent minted token
    Counters.Counter private _tokenIds;
    //keep a count of the number of items sold on the marketplace
    Counters.Counter private _itemsSold;
    //owner is the address that created the contract
    address payable owner;
    //the address below is the wallet that owns chosensanctuary.eth
    address constant donationAddress = 0xf587BC0397DdCE74687789857D0Af56523f993F3;

    //This is the full price of the NFT
    uint256 listPrice = 0.001 ether;
    //The default donation is 25% of the listing price
    uint256 minDonationPercentage = 25;
    

    //original struct to create a listed token
    struct ListedToken {
        address contractAddress;
        uint256 listingId;
        uint256 tokenId;
        address payable owner;
        address payable seller;
        uint256 donationPercentage;
        uint256 price;
        bool currentlyListed;
    }
    //original struct for successful token listing
    event TokenListedSuccess (
        address contractAddress,
        uint256 indexed tokenId,
        address owner,
        address seller,
        uint256 price,
        bool currentlyListed
    );

    event SuccessfulMint(
        address contractAddress,
        uint256 tokenId
    );



    mapping(uint256 => ListedToken) private idToListedToken;
    //mapping(uint256 => ListedToken) private listingIds;



    constructor() ERC721("Chosen Sanctuary", "CS") {

        owner = payable(msg.sender);
    }
    //this function is leftover from the original Alchemy prototype, should be removed
    function createToken(string memory tokenURI, uint256 donationPercentage, uint256 price) public payable returns (uint) {
        _tokenIds.increment();
        _listingIds.increment();
        uint256 newTokenId = _tokenIds.current();
        uint256 newListingId = _listingIds.current();

        if(donationPercentage < 25) {
            donationPercentage = minDonationPercentage;
        }

        //mint an nft with the new token id to the address calling createToken()
        _safeMint(msg.sender, newTokenId);
        //map token to the tokenURI
        _setTokenURI(newTokenId, tokenURI);
        //helper function to update Global variable and emit an event
        createListedToken(address(this), newTokenId, newListingId, donationPercentage, price);
        return newTokenId;
    }
    //mint a chosensnactuary NFT to the sender's wallet
    function createTokenUnlisted(string memory tokenURI, uint256 price) public payable returns (uint) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        //mint an nft with the new token id to the address calling createToken()
        _safeMint(msg.sender, newTokenId);
        //map token to the tokenURI
        _setTokenURI(newTokenId, tokenURI);
        //helper function to update Global variable and emit an event
        createUnListedToken(newTokenId, price);
        payable(donationAddress).transfer(price);

        emit SuccessfulMint(address(this), newTokenId);
        //return newTokenId;
    }
    //sell an existing NFT
    function createListedToken(address contractAddress, uint256 tokenId, uint256 listingId, uint256 donationPercentage, uint256 price) private {
        //require(msg.value >= listPrice, "Hopefully sending correct price");
        require(price > 0, "Token price must be a positive number");
        IERC721 nft = IERC721(contractAddress);

        idToListedToken[listingId] = ListedToken(
            contractAddress,
            listingId,
            tokenId,
            payable(address(this)),
            payable(msg.sender),
            donationPercentage,
            price,
            true
        );

        nft.transferFrom(msg.sender, address(this), tokenId);
        //emit the even of a successful transfer
        //frontend parses this message and updates the end user
        emit TokenListedSuccess(
            contractAddress,
            tokenId,
            address(this),
            msg.sender,
            price,
            true
        );
    }


    function listAnyNFT(address contractAddress, uint256 tokenId, uint256 price) public payable returns (uint) {
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        //createListedToken(contractAddress, tokenId, listingId, price);
        idToListedToken[listingId].currentlyListed = true;
        //address payable(user_address) = payable(msg.sender);

        return listingId;
    }
    //transfers an NFT to the smart contract and lists it for sale
    function listAnyNFTCustom(address contractAddress, uint256 tokenId, uint256 donationPercentage, uint256 price) public payable returns (uint) {
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        createListedToken(contractAddress, tokenId, listingId, donationPercentage, price);
        //idToListedToken[listingId].currentlyListed = true;
        
        return listingId;
    }
    //private function called by the contract when someone calls the public mint function
    function createUnListedToken(uint256 tokenId, uint256 price) private {
        require(msg.value >= listPrice, "Hopefully sending correct price");
        require(price > 0, "Token price must be a positive number");

        idToListedToken[tokenId] = ListedToken(
            address(this),
            0,
            tokenId,
            payable(address(this)),
            payable(msg.sender),
            minDonationPercentage,
            price,
            false
        );

        //emit the even of a successful transfer
        //frontend parses this message and updates the end user
        emit TokenListedSuccess(
            address(this),
            tokenId,
            address(this),
            msg.sender,
            price,
            false
        );
    }

    /* THE TWO FUNCTIONS BELOW ARE ESSENTIALLY DOING THE SAME THING, ONE SHOULD BE DEPRECATED */

    //return all historical listings from the contract
    function getAllNFTs() public view returns (ListedToken[] memory) {
        uint nftCount = _tokenIds.current();
        ListedToken[] memory tokens = new ListedToken[](nftCount);
        uint currentIndex = 0;
        uint currentId;

        for (uint i=0; i < nftCount; i++) {
            currentId = i + 1;
            ListedToken storage currentItem = idToListedToken[currentId];
            tokens[currentIndex] = currentItem;
            currentIndex += 1;
        }

        return tokens;
    }
    //also returns historical listings
    function retrieveTokenListings() public view returns (ListedToken[] memory) {
        uint nftCount = _listingIds.current();
        ListedToken[] memory tokens = new ListedToken[](nftCount);
        uint currentIndex = 0;
        uint currentId;

        for (uint i=0; i < nftCount; i++) {
            currentId = i + 1;
            ListedToken storage currentItem = idToListedToken[currentId];
            tokens[currentIndex] = currentItem;
            currentIndex += 1;
        }

        return tokens;
    }

    //retrieve the current user's listings...THIS FUNCTION NEEDS TO BE REMOVED
    function getMyNFTs() public view returns (ListedToken[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        for (uint i=0; i < totalItemCount; i++) {
            if (idToListedToken[i+1].owner == msg.sender || idToListedToken[i+1].seller == msg.sender) {
                itemCount += 1;
            }
        }
        //once you have the count of relevant NFTs, create an array and store
        ListedToken[] memory items = new ListedToken[](itemCount);
        for (uint i=0; i < totalItemCount; i++) {
            if (idToListedToken[i+1].owner == msg.sender || idToListedToken[i+1].seller == msg.sender) {
                uint currentId = i + 1;
                ListedToken storage currentItem = idToListedToken[currentId];
                items[currentIndex] = items[currentIndex + 1];
            }
        }
        return items;
    }
    //function called when buyer buys an NFT
    function executeSale(uint256 listingId) public payable {
        //variables needed for the sale
        IERC721 nft = IERC721(idToListedToken[listingId].contractAddress);
        uint256 tokenId = idToListedToken[listingId].tokenId;
        uint donationCut;
        uint price = idToListedToken[listingId].price;
        uint donationPercentage = idToListedToken[listingId].donationPercentage;
        //calculate the donation fee based on the donationPercentage variable
        if (donationPercentage == 25) {
            donationCut = price / 4;
        } else if (donationPercentage == 50) {
            donationCut = price / 2;
        } else if (donationPercentage == 75) {
            donationCut = (price / 4) * 3;
        } else if (donationPercentage == 100) {
            donationCut = price;
        }
        //seller receives the price minus the donationCut
        uint sellerCut = price - donationCut;
        address seller = idToListedToken[listingId].seller;
        //make sure that the buyer is paying the proper price
        require(msg.value == price, "please submit the asking price");
        //update token details
        idToListedToken[listingId].currentlyListed = false;
        idToListedToken[listingId].seller = payable(msg.sender);
        //add another sale to the total of items sold
        _itemsSold.increment();
        //transfer the token to the buyer
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
        //send the seller their profit
        //send the donation to CS
        payable(donationAddress).transfer(donationCut);
        payable(seller).transfer(sellerCut);
    }

    function updateListPrice(uint256 _listPrice) public payable {
        require(owner == msg.sender, "Only the owner can update the list price");
        listPrice = _listPrice;
    }

    
    function removeListing(uint256 listingId) public payable {
        IERC721 nft = IERC721(idToListedToken[listingId].contractAddress);
        address tokenOwner = idToListedToken[listingId].seller;
        require(msg.sender == tokenOwner, "Only the seller remove the listing");        
        uint256 tokenId = idToListedToken[listingId].tokenId;
        idToListedToken[tokenId].currentlyListed = false;
        nft.safeTransferFrom(address(this), tokenOwner, tokenId);
    }
    
    function getListPrice(uint256 listingId) public view returns (uint256) {
        return idToListedToken[listingId].price;
    }

    function getLatestIdToListedToken() public view returns (ListedToken memory) {
        uint256 currentTokenId = _tokenIds.current();
        return idToListedToken[currentTokenId];
    }

    function getListedTokenForId(uint256 listingId) public view returns (ListedToken memory) {
        return idToListedToken[listingId];
    }


    function getMostRecentListing(address contractAddress, uint256 tokenId) public view returns (ListedToken memory) {
        uint256 listHeight = _listingIds.current();
        ListedToken memory mostRecent;
        for (uint i=0; i<=listHeight; i++) {
            if (idToListedToken[i].contractAddress == contractAddress && idToListedToken[i].tokenId == tokenId) {
                mostRecent = idToListedToken[i];
            }
        }
        return mostRecent;
    }

    function getURIforListing(uint256 listingId) public view returns (string memory) {
        IERC721Metadata nft = IERC721Metadata(idToListedToken[listingId].contractAddress);

        uint256 tokenId = idToListedToken[listingId].tokenId;

        return nft.tokenURI(tokenId);
    }

    function getCurrentToken() public view returns (uint256) {
        return _tokenIds.current();
    }
    function getCurrentListHeight() public view returns (uint256) {
        return _listingIds.current();
    }

    
}