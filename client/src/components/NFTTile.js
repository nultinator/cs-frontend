import { Link } from "react-router-dom";
import { GetIpfsUrlFromPinata } from "../utils";
import { getBanStatus, reportItem } from "../report";

function NFTTile (data) {
    //log the raw data being fed to this prop
    console.log("Raw tile info", data);
    //try to create a link to the NFTPage component for said item
    try {
        const newTo = {
        pathname:"/nftPage/"+ data.data.contractAddress + "/"+ data.data.tokenId
        }
    //log the complete tile data to be rendered
    console.log("NFT TILE: ", data);
    
    console.log("Image:", data.data.image);



    return (
        <div className="nft-tile">
            <img src={data.data.image} alt={data.data.name} crossOrigin="anonymous"/>
            <div>
                <h2 className="nft-tile-header">{data.data.name}</h2>
                <div>
                    <ul>
                        <li>Description: {data.data.description}</li>
                    </ul>
                </div>
                <Link to={newTo}><button>View Info</button></Link>

                <button className="report-button" onClick={()=> reportItem(data.data.metadata)}>Report</button>

            </div>
        </div>
    )
    } catch (e) {
        console.log("Error: ", e);
        return;
    }
    
}

export default NFTTile;
