/*
 * Copyright (c) 2018 Zippie Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
const shajs = require('sha.js')
const secp256k1 = require('secp256k1')
const CID = require('cids')
const http = require('./web.js')

/**
 * Permastore API
 */
class Permastore {
  constructor (uri) {
    this.uri = uri || 'https://fms.zippie.org'
  }

  /**
   *
   */
  async store (authkey, data) {
    const parsedData = Buffer.from(JSON.stringify(data), 'utf8')
    const hash = shajs('sha256').update(parsedData).digest()
    const sig = secp256k1.sign(hash, authkey)

    const result = await http.postJson(this.uri + '/perma_store', {
      data: parsedData.toString('hex'),
      sig: sig.signature.toString('hex'),
      recovery: sig.recovery
    })

    if(result === null) {
      console.error('VAULT: Permastore store error')
      return false
    } else if ('error' in  result) {
      console.error('VAULT: Permastore returned error:', result)
      return false
    }

    return true
  }

  /**
   *
   */
  async fetch (authpub) {
    // Perform XHR request to FMS to get remote slice.
    let result = await http.postJson(this.uri + '/perma_fetch', {
      pubkey: authpub.toString('hex')
    })

    if(result === null) {
      console.error('VAULT: Permastore fetch error')
      return null
    } else if ('error' in result) {
      console.warn('VAULT: Permastore returned error:', result)
      return null
    }

    return result.data
  }

  makebuf (cid, ts) {
    var cidobj = new CID(cid)
    var buf = Buffer.alloc(4 + cidobj.buffer.length, 0x00)
    cidobj.buffer.copy(buf, 4, 0, cidobj.buffer.length)
    buf.writeUInt32LE(ts, 0)
    return buf   
  }

  async list_v2 (authpubkey) {

    let response = await http.postJson(this.uri + '/perma_list_v2', {
      pubkey: secp256k1.publicKeyConvert(authpubkey, true).toString('hex')
    })

    return response
  }

  async store_v2 (cid, authkey) {
    let nonce = 0
    let buf = this.makebuf(cid, nonce)
    let hash = shajs('sha256').update(buf).digest()

    let sig = secp256k1.sign(hash, authkey)

    let response = await http.postJson(this.uri + '/perma_store_v2', {
      timestamp: nonce, 
      cid: cid, 
      signature: { 
        signature: sig.signature.toString('hex'), 
        recovery : sig.recovery 
      }
    })

    return response
  }
}

module.exports = Permastore