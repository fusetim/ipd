import axios from "axios";
import { fail_with } from "../utils";
import * as Block from 'multiformats/block';
import { sha256 } from "multiformats/hashes/sha2";
import * as dagPB from '@ipld/dag-pb';

// implement a method to execute all the request from here.
const apiRequest = (method, url, options) => {
    const headers = {
//        "Sec-Fetch-Dest": "empty",
//        "Sec-Fetch-Mode": "cors",
//        "Sec-Fetch-Site":"cross-site"
    };
    //using the axios instance to perform the request that received from each http method
    return axios({
        method,
        url,
        timeout: 20000,
        headers,
        ...options
      }).then(res => {
        return Promise.resolve(res.data);
      })
      .catch(err => {
        return Promise.reject(err);
      });
};

// function to execute the http get request
const get = (url, options = {}) => apiRequest("get",url,options);

// function to execute the http delete request
const deleteRequest = (url, options = {}) =>  apiRequest("delete", url, options);

// function to execute the http post request
const post = (url, request, options = {}) => apiRequest("post", url, {request, ...options});

// function to execute the http put request
const put = (url, options = {}) => apiRequest("put", url, options);

// function to execute the http path request
const patch = (url, options = {}) =>  apiRequest("patch", url, options);

const getBlockAndVerify = async function (baseURL, expectedCID) {
    console.log("Fetching Block for "+expectedCID+" from "+baseURL);
    const resp = await get(baseURL + "ipfs/"+expectedCID.toV1().toString()+"?format=raw", {responseType: "arraybuffer"})
                                .catch(fail_with("Can't retrieve block for " + expectedCID.toV1().toString() + " with " + baseURL));
    console.log("Recieved Block for "+expectedCID.toV1().toString()+" from "+baseURL);
    const resp_bytes = new Uint8Array(resp);
    console.log(resp_bytes);
    const block = await Block.decode({ bytes: resp_bytes, codec: dagPB, hasher: sha256});
    
    console.log("CID for Block  "+expectedCID.toV1().toString()+" from "+baseURL+" is "+block.cid.toV1().toString());

    if (block.cid.toV1().toString() === expectedCID.toV1().toString()) {
      console.log("CID for Block "+expectedCID+" from "+baseURL+" matched ("+block.cid.toV1().toString()+")");
      return dagPB.decode(resp_bytes);
    } else {
      console.warn("CID for Block "+expectedCID.toV1().toString()+" from "+baseURL+" mismatched ("+block.cid.toV1().toString()+")");
      throw new Error("CID Mismatched!");
    }
  };

// expose your method to other services or actions
const IpfsGateway = {
    get,
    delete: deleteRequest,
    post,
    put,
    patch,
    getBlockAndVerify
};
export default IpfsGateway;
