

//this key should be moved to the backend server
//user should post to the server
//server pins the file
//server sends response back
//currently the server is cut out of the mix
const key = "REDACTED";

const axios = require('axios');
const FormData = require('form-data');

export const uploadJSONToIPFS = async(JSONBody) => {
    const url = `https://api.nft.storage/upload`;
    //making axios POST request to Pinata ⬇️
    return axios 
        .post(url, JSONBody, {
            headers: {
                "Authorization": `Bearer ${key}`,
            }
        })
        .then(function (response) {
           return {
               success: true,
               pinataURL: "https://ipfs.io/ipfs/" + response.data.value.cid
           };
        })
        .catch(function (error) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }

    });
};

export const uploadFileToIPFS = async(file) => {
    const url = `https://api.nft.storage/upload`;
    //making axios POST request to Pinata ⬇️
    
    let data = new FormData();
    data.append('file', file);

    const metadata = JSON.stringify({
        name: 'testname',
        keyvalues: {
            exampleKey: 'exampleValue'
        }
    });
    data.append('ipfsMetadata', metadata);

    return axios 
        .post(url, data, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                "Authorization": `Bearer ${key}`,
            }
        })
        .then(function (response) {
            console.log("image uploaded", response.data.IpfsHash)
            return {
               success: true,
               pinataURL: "https://ipfs.io/ipfs/" + response.data.value.cid + "/" + file.name
           };
        })
        .catch(function (error) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }

    });
};