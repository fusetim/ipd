#!/bin/bash

tmpdir=$(mktemp -d -p /tmp)
mkdir $tmpdir/ipfs
touch $tmpdir/metadata
cp "$1" $tmpdir/content
rage-keygen -o $tmpdir/key
ek=$(sed "2q;d" $tmpdir/key)
encryption_key=${ek:14}
decryption_key=$(sed "3q;d" $tmpdir/key)
echo Encryption key: $encryption_key
echo Decryption key: $decryption_key
rage -e -r $encryption_key -o $tmpdir/ipfs/content $tmpdir/content
decrypted_size=$(stat -c %s $tmpdir/content)
encrypted_size=$(stat -c %s $tmpdir/ipfs/content)
hash=$(ipfs block put < $tmpdir/content)
cid=$(ipfs cid format -v=1 -b=b $hash)
placeholder="
{
  'filename': '$1',
  'encrypted_size': $encrypted_size,
  'decrypted_size': $decrypted_size,
  'hash': '$cid'
}"
echo $placeholder >> $tmpdir/metadata
nano $tmpdir/metadata
rage -e -r $encryption_key -o $tmpdir/ipfs/metadata $tmpdir/metadata
final_cid=$(ipfs add -r -Q --cid-version 1 $tmpdir/ipfs)
base64_cid=$(ipfs cid format -v=1 -b=u $final_cid)
final_key=${decryption_key:15}
echo Access now your file using \#${base64_cid}.$final_key

