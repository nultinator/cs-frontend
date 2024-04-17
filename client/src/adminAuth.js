import { SERVER_LOCATION } from "./utils";
import axios from "axios";
import { ethers } from "ethers";

export async function isAdmin(address) {
    const resp = await axios.get(`${SERVER_LOCATION}/isAdmin/address?address=${address}`);
    return resp.data;
};

export function hello() {
    return "hello";
}

export async function liftBan(item) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = await provider.getSigner();
    const message = "Hello World!";
    const signature = await signer.signMessage(message);
    //const url = `${SERVER_LOCATION}/removeBan`
    const url = `${SERVER_LOCATION}/removeBan/signature?signature=${encodeURIComponent(signature)}&ipfsHash=${encodeURIComponent(item)}`
    console.log("LIFTBAN URL:", url);
    const resp = await axios.get(url);
    return resp;
}