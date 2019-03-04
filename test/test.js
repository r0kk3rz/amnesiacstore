const FMS = require('../apis/fms.js')
const Mailbox = require('../apis/mailbox')
const Permastore = require('../apis/permastore')
const IPFS = require('../apis/ipfs.js')

const shajs = require('sha.js')
const secp256k1 = require('secp256k1')
const crypto = require('crypto');

const test_url = 'https://fms.zippie.org'

function randomBuf(length = 32) {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(length, (err, buf) => {
        if (err) {
          reject(err)
        } else {
          resolve(buf)
        }
      })  
    })
  }

describe('FMS', function() {
    var fms = null
    var authkey = null
    var revokekey = null
    var authpubkey = null
    var revokepubkey = null

    before(async function() {
        fms = new FMS(test_url)
        authkey = await randomBuf(32)
        revokekey = await randomBuf(32)
        authpubkey = secp256k1.publicKeyCreate(authkey, false)
        revokepubkey = secp256k1.publicKeyCreate(revokekey, false)
    })

    it('store', function(done) {
        fms.store(authpubkey, revokepubkey, {data: 'test data to store'}).then((result) => {
            console.log('FMS Store', result)
            result === true ? done() : done('Store Failed')
        })
    })

    it('fetch', function(done) {
        fms.fetch(authkey).then((result) => {
            console.log('FMS Fetch', result)
            'error' in result ? done(result.error) : done()
        })
    })

    it('revoke', function(done) {
        fms.revoke(revokekey).then((result) => {
            console.log('FMS Revoke', result)
            result === true ? done() : done('Revoke Failed') 
        })
    })

    it('fetch-after-revoke', function(done) {
        fms.fetch(authkey).then((result) => {
            console.log('FMS Fetch', result)
            // This should return an error
            'error' in result ? done() : done(result)
        })
    })
})

describe('Permastore', function() {
    var pms = null
    var authkey = null
    var authpubkey = null

    before(async function() {
        pms = new Permastore(test_url)
        authkey = await randomBuf(32)
        authpubkey = secp256k1.publicKeyCreate(authkey, false)
    })

    it('store', function(done) {
        pms.store(authkey, {data: 'data to store'}).then((result) => {
            console.log(result)
            result === true ? done() : done('Store Failed') 
        })
    })

    it('fetch', function(done) {
        pms.fetch(authpubkey).then((result) => {
            console.log(result)
            'error' in result ? done(result.error) : done()
        })
    })

    it('store_v2', function(done) {
        pms.store_v2('QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u', authkey).then((result) => {
            console.log(result)
            done()
        })
    })

    it('list_v2', function(done) {
        pms.list_v2(authpubkey).then((result) => {
            console.log(result)
            done()
        })
    })
})

describe('IPFS', function () {
    const ipfs = new IPFS(test_url)
    const timestamp = Date.now()

    var hash = ''

    it('store', function(done) {
        ipfs.store('data to be stored ' + timestamp).then((result) => {
            console.log('IPFS Store', result)
            if('error' in result) {
                done(result.error)
            } else {
                hash = result.hash
                done()
            }
        })
    })

    it('fetch', function(done) {
        ipfs.fetch(hash).then((result) => {
            console.log(result)
            
            if('error' in result) {
                done(result.error)
            } else {
                done()
            }
        })
    })

    it('store_v2', function(done) {
      ipfs.store_v2('data to be stored ' + timestamp).then((result) => {
          console.log(result)
            if('error' in result) {
                done(result.error)
            } else {
                done()
            }
      })
    })
})

describe('Mailbox', function() {
    const mb = new Mailbox(test_url)

    it('store', function(done) {
        let address = '000002'
        hash = shajs('sha256').update(Buffer.from(address, 'hex')).digest()

        mb.store(address, hash).then((response) => {
            console.log('Mailbox Store', response)
            done()
        })
    })

    it('list', function(done) {
        let address = '000002'
        mb.list(address).then((response) => {
            console.log('Mailbox List', response)
            done()
        })
    })

    it('fetch', function(done) {
        done('not implemented')
    })    
})
