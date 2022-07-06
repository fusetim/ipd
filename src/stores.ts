import { writable } from 'svelte/store';
import { getGatewayBaseURL } from './utils';
import IpfsGateway from "./services/ipfs-gateway";


const popularGateway : Array<URL> = [
    new URL("https://dweb.link"),
    new URL("https://infura-ipfs.io"),
    new URL("https://gateway.ipfs.io"),
    new URL("https://cloudflare-ipfs.com"),
    new URL("https://cf-ipfs.com"),
    new URL("https://ipfs.infura.io"),
    new URL("https://gateway.pinata.cloud"),
    new URL("https://ipfs.fleek.co"),
];

export const gateway : Writeable<Array<[URL,bool]>> = writable(undefined, () => {
        init_gateway();
    return () => {
        console.log("Gateway list has been discarded!");
    }
})

const init_gateway = () => {
    let curLoc = new URL(window.location.href);
    let curGateway = getGatewayBaseURL(curLoc);
    let gateways : Array<URL> = [...popularGateway, curGateway];
    gateway.set(undefined);
    Promise.allSettled(gateways.map((baseURL,_i,_a) => {
        return IpfsGateway.get(baseURL + "api/v0/block/get?arg=bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m", null)
            .then((resp) => {
                console.log(baseURL + " is a path-gateway exposing API");
                gateway.update(old => { 
                    if (old !== undefined) {
                        return [...old, [baseURL, true]]
                    } else {
                        return [[baseURL,true]];
                    }
                });
            })
            .catch(function (error) {
                IpfsGateway.get(baseURL + "ipfs/bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m", null)
                .then((resp) => {
                    console.log(baseURL + "is a path-gateway (without API exposed)");
                    gateway.update(old => { 
                        if (old !== undefined) {
                            return [...old, [baseURL, false]]
                        } else {
                            return [[baseURL,false]];
                        }
                    });
                })
                .catch(function (error) {
                    console.log(baseURL + " is not a gateway.");
                });
            });
    })).then((results) => results.forEach((result) => {
        gateway.update(val => (val === undefined) ? null : val);
        console.log(result.status);
    }));
    console.log("Gateway list reloaded!");
}