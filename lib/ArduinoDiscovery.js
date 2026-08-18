/*
 * Project: Homeyduino
 * Author: Renze Nicolai <renze@rnplus.nl>
 * License: GPLv3
 *
 */

"use strict";

const http = require('http');
const events = require('events');
const dgram = require('dgram');
const request = require('request');

const ArduinoDevice = require('./ArduinoDevice');

class ArduinoDiscovery extends events.EventEmitter {

	constructor(opts) {
		super();

		this._opts = Object.assign({
			debug: false,
			debugEmit: false,
			broadcastInterval: 30 * 1000, // 30s
			timeoutInterval: 60 * 1000 // 60s
		}, opts);

		this._scanning = false;
		this._devices = {};
		this._foundAddresses = [];

		this._deleteAfterTimeoutInterval = setInterval(this._deleteAfterTimeout.bind(this), this._opts.timeoutInterval);
	}

	_debug() {
		if (this._opts.debug) {
			console.log.apply(null, arguments);
		}
		if (this._opts.debugEmit) {
			this.emit('debug', arguments);
		}
	}

	start() {
		if( this._scanning ) return;
		this._scanning = true;

		try {
			this._server = dgram.createSocket('udp4');
			this._server.on('error', (err) => {
				this._debug('[ArduinoDiscovery] UDP socket error:', err.message || err);
			});
			this._server
				.on('listening', this._onServerListening.bind( this ))
				.on('message', (msg, rinfo) => {
					this._onServerMessage(msg, rinfo, () => {}, false);
				})
				.bind(() => {
					try {
						this._server.setBroadcast(true);
					} catch (e) {
						this._debug('[ArduinoDiscovery] setBroadcast error:', e.message || e);
					}
				});
		} catch (e) {
			this._debug('[ArduinoDiscovery] start error:', e.message || e);
		}
	}

	stop() {
		this._scanning = false;
		if( this._broadcastMessageInterval )
			clearInterval(this._broadcastMessageInterval);
		if (this._deleteAfterTimeoutInterval)
			clearInterval(this._deleteAfterTimeoutInterval);
		if ( this._server ) {
			try {
				this._server.close();
			} catch (e) {}
		}
		for (var k in this._devices) {
			if (this._devices[k] && typeof this._devices[k].destroy === 'function') {
				this._devices[k].destroy();
			}
		}
		this._devices = {};
	}

	getDevices() {
		return this._devices;
	}

	getDevice(id) {
		return this._devices[id] || new Error('invalid_arduino_device');
	}

	_broadcastMessage() {
		this._sendMessage("255.255.255.255");
	}

	_sendMessage(ip) {
		if (!this._server) return;
	    let ssdp_rhost = ip;
	    let ssdp_rport = 46639;
	    let ssdp_msg = 'homeyduino\0';
	    let message = Buffer.from(ssdp_msg);
	    try {
	    	this._server.send(message, 0, message.length, ssdp_rport, ssdp_rhost, (err) => {
	    		if (err) {
	    			this._debug('[ArduinoDiscovery] UDP send error:', err.message || err);
	    		}
	    	});
	    } catch (e) {
	    	this._debug('[ArduinoDiscovery] UDP send exception:', e.message || e);
	    }
	}

	_deleteAfterTimeout() {
		let deleteIfLastSeenBefore = new Date( new Date().getTime() - this._opts.timeoutInterval);
		var keys = Object.keys(this._devices);
		var i = keys.length;
		while (i--) {
			let dev = this._devices[keys[i]];
			if (!dev) continue;
			let lastSeenOn = dev.getOpt('lastSeen');
			if (lastSeenOn && (new Date(lastSeenOn).getTime() < deleteIfLastSeenBefore.getTime())) {
				if (!dev.getOpt('paired')) {
					this._debug('Removed device', keys[i], '(No longer available)');
					if (typeof dev.destroy === 'function') {
						dev.destroy();
					}
					delete this._devices[keys[i]];
				} else {
					if (dev.getOpt('polling')) {
						this._debug('Polling device', keys[i], '...');
						let address = dev.getOpt('address');
						if (address) {
							this.poll(address, (err, res) => { /* Don't need feedback */ });
						}
					}
				}
			}
		}
	}

	_onServerListening() {
		this._broadcastMessage();
		if (this._broadcastMessageInterval)
			clearInterval(this._broadcastMessageInterval);
		this._broadcastMessageInterval = setInterval(this._broadcastMessage.bind(this), this._opts.broadcastInterval);
	}

	poll(ip, callback) {
		if (typeof callback !== 'function') callback = function(){};
		this._debug("Polling device " + ip + " over TCP...");
		let host = {"address": ip, "port": 46639};
		request.get('http://' + ip + ':' + 46639 + '/', {timeout: 5000}, (err, response, body) => {
			if (err) {
				this._debug("poll rq err", err.message || err);
				return callback(err, null);
			}
			this._onServerMessage(body, host, (osmErr, res) => {
				if (osmErr) {
					this._debug("poll osm err", osmErr.message || osmErr);
					return callback(osmErr, null);
				}
				return callback(null, res);
			}, true);
		});
	}

	_onServerMessage( message, host, callback, isPoll = false ) {
		if (typeof callback !== 'function') callback = function(){};

		if (!message) {
			return callback(new Error('Empty message received'), null);
		}

		message = message.toString();

		var opts = null;

		try {
			opts = JSON.parse(message);
		} catch(e) {
			this._debug("error parsing discovery message json");
			if (!isPoll && host && host.address) {
				return this.poll(host.address, callback); 
			}
			return callback(new Error('Invalid JSON received from device'), null);
		}

		if (!opts || typeof opts !== 'object') {
			return callback(new Error('Invalid JSON payload structure'), null);
		}

		if (host) {
			opts.address = host.address;
			opts.port = host.port;
		}

		if ( 'error' in opts ) {
			this._debug("[DISCOVERY] Received error message from "+(host ? host.address : 'unknown')+": "+opts.error);
			return callback(new Error("Received error message from device: "+opts.error), null);
		}

		if ( !('id' in opts) ) { this._debug("Fatal error: no id in json data"); return callback(new Error("No id in json data"), null); }
		if ( !('type' in opts) ) { this._debug("Fatal error: no type in json data"); return callback(new Error("No type in json data"), null); }
		if ( !('api' in opts) ) { this._debug("Fatal error: no api in json data"); return callback(new Error("No api in json data"), null); }

		opts.lastSeen = new Date();

		opts.debug = this._opts.debug;
		opts.debugEmit = this._opts.debugEmit;

		if ( this._devices[ opts.id ] instanceof ArduinoDevice ) {
			this._devices[ opts.id ].update( opts );
			return callback(null, this._devices[ opts.id ]);
		}

		this._devices[opts.id] = new ArduinoDevice(opts);

		this._debug("New device: '" + opts.id + "'");

		this.emit('discover', this._devices[ opts.id ]);

		return callback(null, this._devices[ opts.id ]);
	}
}

module.exports = ArduinoDiscovery;

