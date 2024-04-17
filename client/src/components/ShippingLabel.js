import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";

function ShippingLabel({shippingInfo, closeModal}) {
    const [visible, setVisible] = useState(false);
    function openModal() {
        setVisible(true);
    }

    function closeModal() {
        setVisible(false);
    }

    async function htmlToCanvas(htmlElement) {
        const canvas = await html2canvas(htmlElement);
        return canvas;
    }
    
    async function printLabel() {
        console.log("print button clicked");
        console.log("print button shipping info", shippingInfo);
        const canvas = await htmlToCanvas(document.getElementById("shippingLabel"));
        

        const pdfDoc = await PDFDocument.create();
        const png = await pdfDoc.embedPng(canvas.toDataURL("image/png"));
        console.log("pngurl", png);

        const page = pdfDoc.addPage([canvas.width, canvas.height]);
        const fontSize = 30;
        page.drawImage(png, {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height
        });
        const bytes = await pdfDoc.save();
        const pdfBlob = new Blob([bytes, {type: "application/pdf"}]);
        const pdfURL = URL.createObjectURL(pdfBlob);

        const downloadLink = document.createElement("a");
        downloadLink.href = pdfURL;
        downloadLink.download = "shipping_label.pdf";
        downloadLink.click();
    }

    return (
        <div>
            <button style={{
                backgroundColor: "blue",
                height: 50,
                width: 100,
                borderRadius: 10
            }} onClick={openModal}>Print Label</button>

            {
                visible && (
                    <div style={{
                        justifyContent: "center",
                        marginLeft: "auto",
                        marginRight: "auto",
                        alignItems: "center",
                        display: "flex",
                        fontFamily: "Times New Roman",
                        fontSize: 20,
                        fontWeight: "bold"
                    }}onClick={closeModal}>
                        <div id="shippingLabel" style={{
                            backgroundColor: "white",
                            color: "black",
                            width: 500,
                            justifyContent: "center",
                            textAlign: "center",
                            borderRadius: 10,
                        }}>
                            <h2>{shippingInfo.name}</h2>
                            <h2>{shippingInfo.streetAddress}</h2>
                            <h2>{`${shippingInfo.city}  ${shippingInfo.stateOrProvince} ${shippingInfo.zipCode}`}</h2>
                            <h2 sytle={{paddingBottom: 5}}>{shippingInfo.country}</h2>
                            <hr style={{
                                borderBottom: "dotted 1px",
                                }}></hr>
                            <button style={{
                                backgroundColor: "red",
                                height: 50,
                                width: 100,
                                borderRadius: 10
                            }} onClick={closeModal}>Close</button>
                            <button style={{
                                backgroundColor: "green",
                                height: 50,
                                width: 50,
                                borderRadius: 10
                            }} onClick={printLabel}>Print</button>

                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default ShippingLabel;
