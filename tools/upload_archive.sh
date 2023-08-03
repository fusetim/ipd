tmp = mktemp
ipfs dag export $1 > $tmp
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/vnd.ipld.car" --data-binary @$tmp https://api.web3.storage/car -vvvv

