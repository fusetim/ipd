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
    new URL("https://infura-ipfs.io"),
    new URL("https://gateway.pinata.cloud"),
    new URL("https://ipfs.fleek.co"),
    new URL("https://4everland.io"),
    new URL("https://nftstorage.link"),
    new URL("https://jorropo.net"),
    new URL("https://ipfs.eternum.io"),
    new URL("https://hardbin.com"),
    new URL("https://ipfs.best-practice.se"),
    new URL("https://permaweb.eu.org"),
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
    Promise.allSettled(gateways.map(async (baseURL,_i,_a) => {
        return await IpfsGateway.get(baseURL + "ipfs/bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q", null)
            .then((resp) => {
                console.log(baseURL + " is a path-gateway exposing API");
                return baseURL;
            }, (error) => {
                console.log(baseURL + " is not a gateway.");
                return Promise.reject(error);
            });
    })).then((results) => {
        let gw = results.reduce((acc, res) => { 
            if (res.status === "fulfilled") {
                return [...acc, res.value]; 
            }
            return acc; 
        }, []);
        gateway.set(gw.length > 0 ? gw : null);
    });
    console.log("Gateway list reloaded!");
}