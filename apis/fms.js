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
const http =  require('./web.js')

/**
 * FMS API
 */
class FMS {
  constructor (uri) {
    this.uri = uri || 'https://fms.zippie.org'
  }

  /**
   *
   */
  async store (authpub, revokepub, data) {
    authpub = (typeof authpub === 'string') ? authpub : authpub.toString('hex')
    revokepub = (typeof revokepub === 'string') ? revokepub : revokepub.toString('hex')

    let result = await http.postJson(this.uri + '/store', {
      authpubkey: authpub,
      revokepubkey: revokepub,
      data: data
    })

    if(result === null) {
      return false
    } else if ('error' in  result) {
      console.error('VAULT: FMS store returned error:', result)
      return false
    }

    return true
  }

  /**
   *
   */
  async fetch (authkey) {
    // Timestamp used to generate signature for device verification on FMS
    let tstamp = Date.now().toString()
    let tstamp_hash = shajs('sha256').update(tstamp).digest()

    // Generate timestamp signature
    let tstamp_sig = secp256k1.sign(tstamp_hash, authkey)

    let result = await http.postJson(this.uri + '/fetch', {
      timestamp: tstamp,
      sig: tstamp_sig.signature.toString('hex'),
      recovery: tstamp_sig.recovery
    })

    if(result === null) {
      console.error('ERROR: FMS fetch error')
    }
    else if ('error' in result) {
      console.error('ERROR: FMS fetch returned error:', result)
      return {error: result.error}
    }

    return result.data
  }

  /**
   *
   */
  async revoke (revokekey) {
    // Timestamp used to generate signature for device verification on FMS
    let tstamp = Date.now().toString()
    let tstamp_hash = shajs('sha256').update(tstamp).digest()

    // Generate timestamp signature
    let tstamp_sig = secp256k1.sign(tstamp_hash, Buffer.from(revokekey, 'hex'))

    let result = await http.postJson(this.uri + '/revoke', {
      timestamp: tstamp,
      sig: tstamp_sig.signature.toString('hex'),
      recovery: tstamp_sig.recovery
    })

    if(result === null) {
      return null
    } else if ('error' in result) {
      console.error('ERROR: FMS revoke returned error:', result)
      return null
    }

    return true
  }
}

module.exports = FMS