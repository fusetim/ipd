<script lang="ts">
  import { onMount } from 'svelte';
  import DownloadZone from './lib/DownloadZone.svelte';
  import { gateway } from './stores';
  import IpfsGateway from "./services/ipfs-gateway";
  import { CID } from 'multiformats/cid'
  import { base64url } from 'multiformats/bases/base64';
  import { UnixFS } from 'ipfs-unixfs';

  //import * as IPFS_ROOT_TYPES from 'ipfs-core-types/src/root';
  import { decrypt_with_x25519 } from "@kanru/rage-wasm";
  import { fail_with, all } from "./utils";
  
  let root_cid = undefined;
  let content = undefined;
  let encryption_key = undefined;
  let metadata = undefined;

  const parseHash = (hash : string) => {
    let part = hash.substring(1).split(".");
    if(part.length >= 2){
      root_cid = part[0];
      encryption_key = "AGE-SECRET-KEY-" + part[1];
      console.log("Encryption-Key: %s", encryption_key);
      return true;
    }
    return false;
  };

  const lookupMetadata = () => {
    const rootCID = CID.parse(root_cid, base64url.decoder)
    return Promise.any($gateway.filter((gwi) => gwi[1]).map((gwi) => 
      IpfsGateway.getBlockAndVerify(gwi[0], rootCID).then(async (root) => {
        console.log("Exploring root dag!");
        // Traverse root block to find metadata block. 
        let found = [false, false]; 

        for (const link of root.Links) {
          console.log("SOMETHING? %s %s", link.Name, link.Hash);
          if(link.Name === "metadata") {
            found = [true, found[1]];
            console.log("metadata cid: %s", link.Hash.toV1().toString());
            await IpfsGateway.getBlockAndVerify(/*ipfs,*/ gwi[0], link.Hash).then(async (metadata_block) => {
              console.log("Reading metadata file");
              const unixfile = UnixFS.unmarshal(metadata_block.Data);
              console.log("Metadata file content: \n%s", new TextDecoder().decode(unixfile.data));
              const edata = await decrypt_with_x25519(encryption_key, unixfile.data)
                            .catch(fail_with("Unable to decrypt metadata!"));
              console.log("Data decrypted!");
              console.log(edata);
              const data = JSON.parse(new TextDecoder().decode(edata))
              console.log("Data parsed!");
              metadata = data;
            }).catch(fail_with("Oopsie, fail to retrieved metadata"));
            console.log("Metadata retrieved!");
          } else if (link.Name === "content") {
            found = [found[0], true];
            content = {cid :link.Hash.toV1().toString(), size: link.Tsize};
            console.log("Content cid: %s", content.cid);
          } else {
            console.log("unknown file at root: %s (cid: %s)", link.Name, link.Hash.toString());
          }
        }
        if (found != [true, true]) {
          console.log("Something is wrong about this file.");
          if (!found[0]) {
            console.log("/metadata not found...");
            metadata = null;
          }
          if (!found[1]) {
            console.log("/content not found...");
            content = null;
          }
        } else {
          console.log("Everything is ready!");
        }
      }
    ))).catch((err) => {
      metadata = null;
      content = null;
      console.log("No gateway with API exposed has returned.");
      console.error(err);
    });
  };

  onMount(async () => {
    console.log("onMount - parsing hash");
    if (parseHash(window.location.hash)) {

      const unsub_gateway = gateway.subscribe((val) => {
        if (val === null) {
          console.log("No gateway!!!!");
          content=null;
          metadata=null;
        } else if (val != null) {
          lookupMetadata();
          console.log("Fetching metadata...");
        }
      });
      setTimeout(() => {
        unsub_gateway();
      }, 100000);
    } else {
      console.log("Parsing failed!");
      content=null;
      metadata=null;
      encryption_key=null;
    }
  })
</script>

<main>
  <h1>FuseTim's<br />Inter-Planetary<br />Downloader</h1>

  {#if (metadata != null && content != null)}
    <DownloadZone content={content} metadata={metadata} encryption_key={encryption_key} />
  {:else if (metadata !== null && content !== null)}
    <h2>Loading...</h2>
  {:else}
    <div>
      <h2>Unavailable</h2>
      <p style="max-width=36em;">
        The file requested is unavailable. <br> Maybe it is too recent and yet
        unknown by public gateway and/or your node, maybe the pinning node are
        offline or all gateways are down (check your network connexion), or all
        pins has been removed.
        <br>
        <strong>encryption_key:</strong> {encryption_key}
        <br>
        <strong>metadata:</strong> {metadata}
        <br>
        <strong>content_cid:</strong> {content.cid}
        <br>
        <strong>content_size:</strong> {content.decrypted_size}
      </p>
    </div>
  {/if}
</main>

<footer>
  <p><strong>Note</strong> 
  <br>
  This website security is entirely related to which gateway you use to load it. 
  Use gateway you trust!
  <br>
  <strong>DMCA</strong> 
  <br>
  This website does not host any files nor links to any files. <br> Contact the gateways to remove illegal contents.
  </p>
</footer>

<style>
  footer p {
    text-align: center;
  }

  :root {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
    justify-items: center;
    display: flex;
    flex-direction: column;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 2.5rem;
    font-weight: 100;
    line-height: 1.1;
    margin: 1rem auto;
    max-width: 14rem;
  }

  p {
    max-width: 14rem;
    margin: 1rem auto;
    line-height: 1.35;
  }

  @media (min-width: 480px) {
    h1 {
      max-width: none;
    }

    p {
      max-width: none;
    }
  }
</style>
