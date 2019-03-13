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

const http =  require('./web.js')

class IPFS {
    constructor (uri) {
      this.uri = uri || 'https://fms.zippie.org'
    }

    async store(data) {
      let response = await http.postJson(this.uri + '/ipfs_store', {
        data
      })

      if('error' in response) {
        return { error: response.error }
      }

      return { hash: response.hash }
    }

    async store_v2(data) {
        let message = JSON.stringify(data)
        let response = await http.postJson(this.uri + '/ipfs_store_v2', {
          data: message
        })

        if('error' in response) {
          return { error: response.error }
        }

        return { multihash: response.multihash }
    }

    async fetch(hash) {
      let response = await http.postJson(this.uri + '/ipfs_fetch', {
        hash
      })

      return response
    }
}

module.exports = IPFS