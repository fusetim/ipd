<script lang="ts">
  import { gateway } from "../stores";
  import IpfsGateway from "../services/ipfs-gateway";
  import { decrypt_with_x25519 } from "@kanru/rage-wasm";
  import { downloadBlob, fail_with } from "../utils";
  import * as Block from 'multiformats/block';
  import * as raw from 'multiformats/codecs/raw';
  import { sha256 } from 'multiformats/hashes/sha2';
  import { CID } from 'multiformats/cid';

  const state_strings : Array<string> = [
    "Start the download",
    "Downloading...", // 1
    "Decrypting...",
    "Checking...", // 3
    "Downloaded!",
    "Retry..." //5
  ];

  const error_strings : Array<string> = [
    "An error occured...",
    "No gateway selected!", // 1
    "Download failed (check console)!",
    "Decryption failed (check console)!", // 3
    "Checksum does not match :/ (check console)!"
  ];

  export let content;
  export let encryption_key : string;
  export let metadata;

  let progress;
  let state: int = 0;
  let error: int = -1;
  let state_showed: string = state_strings[state];
  let selected_gateway: int;
  let blob = undefined;

  const download = () => {
    const baseURL : String = $gateway[selected_gateway];
    console.log("Starting download using %s...", baseURL);
    progress = 0.0;
    IpfsGateway.get(baseURL+"ipfs/"+content.cid, {
      timeout: 50000,
      responseType: "arraybuffer",
      decompress: true,
      onDownloadProgress: (pe : ProgressEvent) => {
        console.log("lenComp: %s; loaded: %d; total: %d", pe.lengthComputable, pe.loaded, pe.total);
        const total = pe.lengthComputable ? pe.total : parseInt(metadata.encrypted_size);
        progress = pe.loaded * 100.0 / total;
        console.log("Progress: %d %", progress);
      }
    }).then(decrypt, (err) => {
      state = 5;
      error = 2;
      console.error("Download failed due to following error:");
      console.error(err);
    });
  };

  const decrypt = async function(data: Uint8Array) {
    state = 2;
    progress = undefined;
    console.log("Starting decryption...");
    /*console.log(data);
    console.log(new TextDecoder().decode(data));*/
    //const block = await Block.encode({value: data, codec: raw, hasher: sha256});
    //console.log("CID: %s", block.cid);
    //console.log("encryption key: `%s`", encryption_key);
    const data_bytes = new Uint8Array(data);

    await decrypt_with_x25519(encryption_key, data_bytes)
      .then(verify, (err) => {
        state = 5;
        error = 3;
        console.error("Decryption failed due to following error:");
        console.error(err);
      });
  };

  const verify = async function(data: Uint8Array) {
    state = 3;
    console.log("Starting verifying...");
    const block = await Block.encode({value: data, codec: raw, hasher: sha256})
    .catch((err) => {
      state = 5;
      error = 0;
      console.error("Block encoding failed due to following error:");
      console.error(err);
    });
    console.log("cid: %s",block.cid);

    const contentHash = CID.parse(metadata.hash).toV1()
    console.log("Does it match?");
    if (block.cid.toV1().toString() === contentHash.toString()) {
      console.log("Yes it matches!");
      state = 4;
      await blobify(data);
    } else {
      state = 5;
      error = 4;
      console.error("Hash mismatched :\nexpected: %s\ngot: %s", contentHash.toString(), block.cid.toV1().toString());
    }
  };

  const blobify = async function(data: Uint8Array) {
    console.log("Blobifying");
    blob = new Blob([data]);
    console.log("Launching download!");
    downloadBlob(blob, metadata.filename);
  };

  const actionRequest = () => {
    switch (state) {
      case 0:
        state = 1;
        if (selected_gateway < 0) {
          state = 5;
          error = 1;
        }
        download();
        break;
      case 1:
      case 2:
      case 3:
        break;
      case 4:
        downloadBlob(blob, metadata.filename);
        break;
      default:
        state = 0;
        error = -1;
        progress = undefined;
        break;
    }
  };

  $: state_showed = progress === undefined ? state_strings[state] : state_strings[state] + " ("+progress+"%)";
  $: if ($gateway !== undefined && selected_gateway < 0) {
    selected_gateway = 0;
  }
</script>

<div class="download-card">
  <h2>{metadata.filename}</h2>
  <div class="download-info">
    <!--<span><strong>Download size:</strong>   {content.size} bytes</span>-->
    <span><strong>Encrypted size:</strong>  {metadata.encrypted_size} bytes</span>
    <span><strong>Size on disk:</strong>    {metadata.decrypted_size} bytes</span>
    <span><strong>Encrypted CID:</strong>   {content.cid}</span>
    <span><strong>Content CID:</strong> {metadata.hash}</span>
  </div>
  <span style="font-size:small;margin-left:1em;text-align: start;">Choose a gateway (or mirror):</span>
  <select
    class="gateway-selector"
    bind:value={selected_gateway}
    disabled={state !== 0}
  >
    {#if $gateway != null}
      {#each $gateway as gw, i}
        <option value={i}>{gw}</option>
      {/each}
    {:else if $gateway !== null}
      <option value="-1">Loading...</option>
    {:else}
      <option value="-999">No gateway available.</option>
    {/if}
  </select>

  {#if state === 1}
    {#if progress !== undefined}
    <progress value={progress} max=100>{progress} %</progress>
    {:else}
      <progress>En cours...</progress>
    {/if}
  {/if}
  <button on:click={actionRequest}>{state_showed}</button>
  {#if state === 5}
    <p class="error-message">{error_strings[error]}</p>
  {/if}
</div>

<style>
  h2 {
    margin: 0.25em 0em;
    font-size: 1.5em;
    font-weight: normal;
  }

  .error-message {
    color: #ff2200;
    font-weight: 500;
    font-size: small;
    margin: 0.5em 1em 0em 1em;
  }

  .download-card {
    display: flex;
    flex-direction: column;
    flex: 4 1 max-content;
    align-self: center;
    justify-items: start;
    align-items: stretch;
    padding: 1em 2em 2em 2em;
    margin: 2em;
    max-width: 48em;
    min-width: 24em;
    border-radius: 2em;
    background: #c7d8e440;
  }

  .download-info {
    display: flex;
    flex-direction: column;
    flex-basis: content;
    justify-items: start;
    align-items: flex-start;
    margin: 1em 1em;
  }

  .gateway-selector {
    margin: 0em 1em 1em 1em;
  }

  progress {
    appearance: none;
    background-color: #c7d8e440;
    margin: 0em 0.75em 0.5em 0.75em;
    padding: 0;
    height: 0.25em;
    border-radius: 0.25em;
  }

  ::-moz-progress-bar {
    background-color: #ff3e00;
  }

  :indeterminate::-moz-progress-bar {
    animation-name: backgroundColorPalette;
    animation-duration: 5s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }

  ::-webkit-progress-bar {
    background-color: #c7d8e440;
    margin: 0em 0.75em 0.5em 0.75em;
    padding: 0;
    height: 0.25em;
    border-radius: 0.25em;
  }

  ::-webkit-progress-value {
    background-color: #ff3e00;
  }

  :indeterminate::-webkit-progress-value {
    animation-name: backgroundColorPalette;
    animation-duration: 5s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }

  @keyframes backgroundColorPalette {
    0% {
      background: #ee6055;
    }
    25% {
      background: #60d394;
    }
    50% {
      background: #aaf683;
    }
    75% {
      background: #ffd97d;
    }
    100% {
      background: #ff9b85;
    }
  }

  button {
    font-family: inherit;
    font-size: inherit;
    padding: 1em 2em;
    margin: 0em 0.75em;
    color: #ff3e00;
    background-color: rgba(255, 62, 0, 0.1);
    border-radius: 1em;
    border: 2px solid rgba(255, 62, 0, 0);
    outline: none;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  button:focus {
    border: 2px solid #ff3e00;
  }

  button:active {
    background-color: rgba(255, 62, 0, 0.2);
  }
</style>
