import { SERVER_LOCATION } from "./utils";
import axios from "axios";

export async function reportItem(ipfsHash) {
    const body = {
        ipfsHash: ipfsHash
    }
    const resp = await axios.post(`${SERVER_LOCATION}/report`, body);
    console.log("resp", resp);
};

export async function getBanStatus(ipfsHash) {
    const resp = await axios.get(`${SERVER_LOCATION}/isBanned/ipfsHash?ipfsHash=${ipfsHash}`);
    return resp.data;
};

