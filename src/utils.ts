export const getGatewayBaseURL = (gatewayURL : URL) => {
    let isHttps : bool = false;
    let domain : string;
    if (gatewayURL.host.includes(".ipfs.") || gatewayURL.host.includes(".ipns.")) {
        // We got a IPFS/IPNS subdomain gateway. We want to fallback to path-gateway URL.
        // We have to remove the first two sub-name in the FQDN.
        domain = gatewayURL.host.split(".").slice(2).join(".");
        isHttps = gatewayURL.protocol === "https" ? true : false;
    } else {
        // We got a ready-to-reuse IPFS path gateway URL.
        domain = gatewayURL.host;
        isHttps = gatewayURL.protocol === "https" ? true : false;
    }
    let baseURL : string;
    if (isHttps) {
        baseURL = "https://" + domain + "/";
    } else {
        baseURL = "http://" + domain + "/";
    }
    return new URL(baseURL);
};

export const fail_with = (msg) => {return (err) => {
    console.log(msg);
    console.error(err);
}};

export const all = async (source) => {
    const arr = []

    for await (const entry of source) {
      arr.push(entry)
    }

    return arr
}

export function downloadBlob(blob, name = 'file.txt') {
    // Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)
    const blobUrl = URL.createObjectURL(blob);
  
    // Create a link element
    const link = document.createElement("a");
  
    // Set link's href to point to the Blob URL
    link.href = blobUrl;
    link.download = name;
  
    // Append link to the body
    document.body.appendChild(link);
  
    // Dispatch click event on the link
    // This is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true, 
        view: window 
      })
    );
};
