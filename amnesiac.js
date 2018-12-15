/*
 * Copyright (C) 2017 Zipper Global Ltd.	
 *
 * Commercial License Usage
 *
 * Licensees holding valid commercial Zipper licenses may use this file in
 * accordance with the terms contained in written agreement between you and
 * Zipper Global Ltd.
 *
 * GNU Affero General Public License Usage
 *
 * Alternatively, the JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero General Public
 * License (GNU AGPL) as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.  The code
 * is distributed WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU AGPL for
 * more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you may
 * distribute non-source (e.g., minimized or compacted) forms of that code
 * without the copy of the GNU GPL normally required by section 4, provided
 * you include this license notice and a URL through which recipients can
 * access the Corresponding Source.
 *
 * As a special exception to the AGPL, any HTML file which merely makes
 * function calls to this code, and for that purpose includes it by reference
 * shall be deemed a separate work for copyright law purposes.  In addition,
 * the copyright holders of this code give you permission to combine this
 * code with free software libraries that are released under the GNU LGPL.
 * You may copy and distribute such a system following the terms of the GNU
 * AGPL for this code and the LGPL for the libraries.  If you modify this
 * code, you may extend this exception to your version of the code, but you
 * are not obligated to do so.  If you do not wish to do so, delete this
 * exception statement from your version.
 *
 * This license applies to this entire compilation.
 */

var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
const crypto = require('crypto');
var secp256k1 = require('secp256k1');
var shajs = require('sha.js');
var AWS = require('aws-sdk')

var constants = require('constants')

var myCredentials = new AWS.SharedIniFileCredentials({profile: 'default'});
var awsconfig = new AWS.Config({
  credentials: myCredentials, region: constants.AWSregion
});

function getHash(data) {
  return crypto.createHash('sha256').update(fromHex(data)).digest().toString('hex')
}

function fromHex(data) {
  return Buffer.from(data, 'hex')
}

/**
 * 
 * @param {*} authpubkey 
 * @param {*} revokepubkey 
 * @param {*} data 
 * @param {*} callback 
 */
function s3FMSStore(authpubkey, revokepubkey, data, callback) {

  // XXX validate this is valid public keys
  if (authpubkey === revokepubkey) {
    callback({'status' : 'error'})
    return
  }

  var s3key_authpubkey = getHash(authpubkey)
  var s3key_revokepubkey = getHash(revokepubkey)
  console.log(s3key_authpubkey)

  let params_1 = {Bucket: constants.FMSBucket, Key: s3key_authpubkey, Body: JSON.stringify(data)}

  s3.upload(params_1).promise().then((data) => {
    let params_2 = {Bucket: constants.FMSBucket, Key: s3key_revokepubkey, Body: fromHex(s3key_authpubkey)}
    s3.upload(params_2).promise().then((data) => {
       callback({'status': 'ok'})
    }).catch((err) => {
       callback({'error': err})
    })
 }).catch((err) => {
   callback({'error': err})
 })
}

/**
 * 
 * @param {*} signature 
 * @param {*} recovery 
 * @param {*} hash 
 * @param {*} callback 
 */
function s3FMSFetch(signature, recovery, hash, callback) {

  var pubkey = secp256k1.publicKeyConvert(secp256k1.recover(fromHex(hash), fromHex(signature), recovery), false);
    
  var s3key_authpubkey = getHash(pubkey)
  console.log(s3key_authpubkey)
  
  let params_1 = {Bucket: constants.FMSBucket, Key: s3key_authpubkey}
  s3.getObject(params_1).promise().then((data) => {
    callback({'data' : JSON.parse(data.Body)})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} signature 
 * @param {*} recovery 
 * @param {*} hash 
 * @param {*} callback 
 */
function s3FMSRevoke(signature, recovery, hash, callback) {
  var pubkey = secp256k1.publicKeyConvert(secp256k1.recover(hash, fromHex(signature), recovery), false);
  var s3key_revokepubkey = getHash(pubkey)

  let params_1 = {Bucket: constants.FMSBucket, Key: s3key_revokepubkey}
  s3.getObject(params_1).promise().then((data) => {
    let params_2 = {Bucket: constants.FMSBucket, Key: data.Body.toString('hex')}
    console.log(data.Body.toString('hex'))
    s3.deleteObject(params_2).promise().then((data) => {
      s3.deleteObject(params_1).promise().then((data) => {
        callbackl({'status' : 'ok'})
      }).catch((err) => {
        callback({'error': err})
      })
    }).catch((err) => {
      callback({'error': err})
    })
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} signature 
 * @param {*} recovery 
 * @param {*} data 
 * @param {*} callback 
 */
function s3PermaStore(signature, recovery, data, callback) {
  var hash = getHash(data)

  var pubkey = secp256k1.publicKeyConvert(secp256k1.recover(hash, signature, recovery), false);
  var s3key_pubkeyhash = getHash(pubkey)

  var upload = { sig: signature, recovery: recovery, data: data }
  let params_1 = {Bucket: constants.PermastoreBucket, Key: s3key_pubkeyhash, Body: JSON.stringify(upload)}
  
  s3.upload(params_1).promise().then((data) => {
    callback({'status': 'ok', 'pubkey': pubkey.toString('hex')})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} pubkey 
 * @param {*} callback 
 */
function s3PermaFetch(pubkey, callback) {
  var s3key_pubkeyhash = getHash(pubkey)
  let params_1 = {Bucket: constants.PermastoreBucket, Key: s3key_pubkeyhash}

  s3.getObject(params_1).promise().then((data) => {
    callback({'data' : JSON.parse(data.Body)})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} recipient 
 * @param {*} data 
 * @param {*} callback 
 */
function s3MailboxStore(recipient, data, callback) {
  var mbox_hash = getHash(recipient)
  var attached_data = fromHex(data)

  var ad_hash = getHash(attached_data)

  let params_1 = {Bucket: constants.PermastoreBucket, Key: 'mbox/' + mbox_hash + '/' + ad_hash, Body: Buffer.from(data)}
  s3.upload(params_1).promise().then((data) => {
    callback({'status': 'ok', 'key': 'mbox/' + mbox_hash + '/' + ad_hash})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} recipient 
 * @param {*} callback 
 */
function s3MailboxList(recipient, callback) {

   // FIXME: add ability for truncated lists (>1000 objects)
   var mbox_hash = getHash(recipient, 'hex')
   let params_1 = {Bucket: constants.PermastoreBucket, Prefix: 'mbox/' + mbox_hash + '/'}
   
   s3.listObjectsV2(params_1).promise().then((data) => {
     var allKeys = []
     data.Contents.forEach(function (content) {
        allKeys.push(content.Key.replace('mbox/' + mbox_hash + '/', ''));
     });
     callback({'status': 'ok', 'response': allKeys})
   }).catch((err) => {
     callback({'error': err})
   })
}

/**
 * 
 * @param {*} recipient 
 * @param {*} hash 
 * @param {*} callback 
 */
function s3MailboxFetch(recipient, hash, callback) {
  var mbox_hash = getHash(recipient, 'hex')
  let params_1 = {Bucket: constants.PermastoreBucket, Key: 'mbox/' + mbox_hash + '/' + hash}
  s3.getObject(params_1).promise().then((data) => {
    callback({data: data})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} data 
 * @param {*} callback 
 */
function s3IPFSStore(data, callback) {
  let params_1 = {Bucket: constants.PermastoreBucket, Key: hash, Body: JSON.stringify({data: data})}

  s3.upload(params_1).promise().then((data) => {
    callback({'status': 'ok', 'hash': hash})
  }).catch((err) => {
    callback({'error': err})
  })
}

/**
 * 
 * @param {*} cid 
 * @param {*} callback 
 */
function s3IPFSFetch(cid, callback) {
  let params_1 = {Bucket: constants.PermastoreBucket, Key: cid}

  s3.getObject(params_1).promise().then((data) => {
    callback({'data' : JSON.parse(data.Body).data})
  }).catch((err) => {
    callback({'error': err})
  })
}


var s3 = new AWS.S3({params: 'fms'})

app.use(cors());
app.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies

app.post('/store', function (req, res) {
    if (req.body.data.length > 1024) {
      res.send(JSON.stringify({'status': 'error'}))
      return
    }

    var authpubkey = req.body.authpubkey
    var data = req.body.data
    var revokepubkey = req.body.revokepubkey

    s3FMSStore(authpubkey, revokepubkey, data, function(response) {
      res.send(JSON.stringify(response))
    })
});

app.post('/fetch', function (req, res) {
    var signature = req.body.sig;
    var recovery = req.body.recovery;
    var hash = req.body.hash ? req.body.hash : getHash(req.body.timestamp);
    // XXX check that timestamp is within acceptable timing of now

    s3FMSFetch(signature, recovery, hash, function(response) {
      res.send(JSON.stringify(response))
    })
});

app.post('/revoke', function (req, res) {
    var signature = req.body.sig;
    var recovery = req.body.recovery;
    var hash = getHash(req.body.timestamp);

    s3FMSRevoke(signature, recovery, hash, function(response){
      res.send(JSON.stringify(response))
    })
});

app.post('/perma_store', function (req, res) {
    var signature = fromHex(req.body.sig)
    var recovery = req.body.recovery
    var data = req.body.data

    s3PermaStore(signature, recovery, data, function(response){
      res.send(JSON.stringify(response))
    })
});

app.post('/ipfs_store', function (req, res) {
    let data = req.body.data

    s3IPFSStore(data, function(response){
      res.send(JSON.stringify(response))
    })
});

app.post('/ipfs_fetch', function (req, res) {
    let hash = req.body.hash

    s3IPFSFetch(hash, function(response){
      res.send(JSON.stringify(response))
    })
});

app.post('/perma_fetch', function (req, res) {
    let pubkey = req.body.pubkey

    s3PermaFetch(pubkey, function(response){
      res.send(JSON.stringify(response))
    })
});

app.post('/mailbox_store', function (req, res) {
   let recipient = req.body.recipient
   let data = req.body.data

   s3MailboxStore(recipient, data, function(response){
     res.send(JSON.stringify(response))
   })
})

app.post('/mailbox_list', function (req, res) { 
  let recipient = req.body.recipient

  s3MailboxList(recipient, function(response){
    res.send(JSON.stringify(response))
  })
})

app.post('/mailbox_fetch', function (req, res) {
   let recipient = req.body.recipient
   let hash = req.body.hash

   s3MailboxFetch(recipient, hash, function(response){
     res.send(JSON.stringify(response))
   })
});

app.get('/health', function (req, res) {
  res.send(JSON.stringify({'notdead' : true}))
})

var server = app.listen(8081, "0.0.0.0", function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Amnesiac app listening at http://%s:%s", host, port)
})
