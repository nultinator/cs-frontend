//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//the imports below are for selling existing NFTs
import "@openzeppelin/contracts/access/Ownable.sol";

contract Users {

    //this contract is used to created a database of users
    using Counters for Counters.Counter;

    Counters.Counter private _userIds;

    mapping (uint256 => User) usersList;

    struct User {
        address walletAddress;
        string ipfsHash;
        string pubKey;
        string privKey;
    }

    event UserInfoChange(
        address walletAddress,
        string ipfsHash
    );
    event FoundUser(
        address walletAddress,
        string ipfsHash
    );

    //user info is held in an IPFS hash, the information should be encrypted on the frontend
    function createNewUser(string memory ipfsHash, string memory pubkey, string memory privkey) public {
        //if the wallet address has an existing profilem it cannot create a new one
        require(!userExists(msg.sender), "A profile for this wallet address already exists");
        uint256 userId = _userIds.current();
        //create the new user
        usersList[userId] = User(
            msg.sender,
            ipfsHash,
            pubkey,
            privkey            
        );
        //increment userIds so we are ready for the next user
        _userIds.increment();
        
        //emit the successful UserInfoChange event
        emit UserInfoChange(
            usersList[userId].walletAddress,
            usersList[userId].ipfsHash
        );
    }
    //sets a new keypair to the user (these are used for shipping data stored on ifps)
    //user can reset their keypair at anytime, this keypair is not connected to the wallet
    function addEncryptionKeys(uint256 userId, string memory pubKey, string memory privKey) public {
        require(msg.sender == usersList[userId].walletAddress, "you can only change your own data");
        //set the new keypair
        usersList[userId].pubKey = pubKey;
        usersList[userId].privKey = privKey;
        //emit the successful event that info has been changed
        emit UserInfoChange(
            usersList[userId].walletAddress,
            usersList[userId].ipfsHash
        );
    }
    //determine if a user already exists
    function userExists(address walletAddress) public view returns (bool) {
        //current amount of users
        uint256 totalUsers = _userIds.current();
        bool exists = false;
        //iterate through the users
        for (uint i=0; i<totalUsers; i++) {
            //if the user exists, change the "exists" variable to true
            if (usersList[i].walletAddress == walletAddress) {
                exists = true;
            }
            //if the user exists, exit the loop
            if (exists) {
                break;
            }
        }
        //return the boolean
        return exists;
    }

    //lookup the userId for a specific wallet address
    function getUserId(address walletAddress) public view returns (uint256) {
        //total amount of users
        uint256 totalUsers = _userIds.current();
        //the user NEEDS to exist in the current database
        require(userExists(walletAddress), "user is not in the current database");
        //iterate through the users list and return the userId
        for (uint i=0; i<totalUsers; i++) {
            if (usersList[i].walletAddress == walletAddress) {
                return i;
            }
        } revert("user does not exist!");
    }

    //lookup a user in the database by their userId
    function getUserById(uint256 userId) public view returns (User memory) {
        require(msg.sender == usersList[userId].walletAddress, "you can only access your own info");
        return usersList[userId];
    }
    //lookup a user's pubKey
    function getUserPubKey(uint256 userId) public view returns (string memory) {
        return usersList[userId].pubKey;
    }
    //lookup a user's privKey, only the owner of the private key can call this function
    function getUserPrivkey(uint256 userId) public view returns (string memory) {
        require(msg.sender == usersList[userId].walletAddress, "You can only access your own private key");
        return usersList[userId].privKey;
    }
    //update the ipfs hash which holds the user info
    function updateUserInfo(uint256 userId, string memory ipfsHash) public {
        require(usersList[userId].walletAddress == msg.sender, "You can only update your own info");
        usersList[userId].ipfsHash = ipfsHash;
        emit UserInfoChange(
            usersList[userId].walletAddress,
            usersList[userId].ipfsHash
        );
    }
    //retrieve the ipfs hash containing the user's shipping info
    function ipfsHashForUser(uint256 userId) public view returns (string memory) {
        return usersList[userId].ipfsHash;
    }
    //retrieve an account's profile info, only the account owner can do this
    function retrieveUserInfo(uint256 userId) public view returns (User memory) {
        require(msg.sender == usersList[userId].walletAddress, "You can only access your own profile!");
        return usersList[userId];
    }
}
