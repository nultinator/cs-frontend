import {
    BrowserRouter as Router,
    Link,
  } from "react-router-dom";
import { reportItem } from "../report";

//this component takes in data and displays it as an AuctionTile
function AuctionTile(data) {
  //log the data we're taking in
  console.log("Auction tile data", data);
    const newTo = {
      pathName: "/AuctionPage/" + data.data.auctionID
    }
    //variable holding image info
    const imageInfo = data.data.metadata.data.image;
    //variable to hold ipfs url
    var ipfsURL;
    //if our imageInfo is a string, use it as the ipfs url
    if (typeof imageInfo === "string") {
      ipfsURL = imageInfo;
    //if our imageInfo is an object, pull the first url from the object
    } else if (typeof imageInfo === "object") {
      ipfsURL = imageInfo[0];
    //if it is not one of the above, fail to render and long the imageInfo
    } else {
      console.log("Image failed:", imageInfo);
      return;
    }

    return (
      <div className="auction-tile">
          <img src={ipfsURL} alt="" crossOrigin="anonymous" />
          <div>
          <div><strong>Auction {data.data.auctionID}</strong></div>
          <div><strong>{data.data.name}</strong></div>
            <div>Current Bid: {data.data.currentBid/1_000_000_000_000_000_000} ETH</div>
            <div>Buy It Now: {data.data.buyItNow} ETH</div>
              <div>Item Description:</div>
              <p>
                {data.data.metadata.data.description}
              </p>
              <Link to={newTo.pathName}><button>View Info</button></Link>
              <button className="report-button" onClick={() => {reportItem(data.data.metadataURI);}}>Report</button>


          </div>
      </div>
  )
}

export default AuctionTile;