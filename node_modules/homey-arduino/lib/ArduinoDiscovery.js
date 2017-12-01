"use strict";

const http			= require('http');
const events		= require('events');
const dgram 		= require('dgram');
const request		= require('request');

const ArduinoDevice = require('./ArduinoDevice');

class ArduinoDiscovery extends events.EventEmitter {

	constructor( opts ) {
		super();

		this._opts = Object.assign({
			debug: false,
			debugEmit: false,
			broadcastInterval: 30 * 1000, // 30s
			timeoutInterval: 60 * 1000 // 60s
		}, opts);

		this._scanning = false;
		this._devices = [];
		this._foundAddresses = [];

		this._deleteAfterTimeoutInterval = setInterval(this._deleteAfterTimeout.bind(this), this._opts.timeoutInterval);
	}

	_debug() {
		if( this._opts.debug ) {
			console.log.apply( null, arguments );
		}
		if( this._opts.debugEmit ) {
			this.emit('debug', arguments );
		}
	}

	start() {
		if( this._scanning ) return;

		this._server = dgram.createSocket('udp4');
		this._server
			.on('listening', this._onServerListening.bind( this ))
			.on('message', this._onServerMessage.bind( this ))
			.bind(() => {
				this._server.setBroadcast(true);
			});
	}

	stop() {
		if( this._broadcastMessageInterval )
			clearInterval(this._broadcastMessageInterval);
		if ( this._deleteAfterTimeoutInterval )
			clearInterval(this._deleteAfterTimeoutInterval);
	}

	getDevices() {
		return this._devices;
	}

	getDevice( id ) {
		return this._devices[id] || new Error('invalid_arduino_device');
	}

	_broadcastMessage() {
	    this._sendMessage("255.255.255.255");
	}

	_sendMessage(ip) {
	    let ssdp_rhost = ip;
	    let ssdp_rport = 46639;
	    let ssdp_msg = 'homeyduino\0';
	    let message = new Buffer(ssdp_msg);
	    this._server.send(message, 0, message.length, ssdp_rport, ssdp_rhost);
	}

	_deleteAfterTimeout() {
		let deleteIfLastSeenBefore = new Date( new Date().getTime() - this._opts.timeoutInterval);
		var keys = [];
		for (var k in this._devices) keys.push(k);
		var i = keys.length;
		while (i--) {
			let lastSeenOn = this._devices[keys[i]].getOpt('lastSeen');
			if (lastSeenOn < deleteIfLastSeenBefore) {
					if (!this._devices[keys[i]].getOpt('paired')) {
						this._debug('Removed device',keys[i],'(No longer available)');
						delete this._devices[keys[i]];
					} else {
						//this._debug('Device',keys[i],'is paired but no longer available.');
						if (this._devices[keys[i]].getOpt('polling')) {
							this._debug('Polling device',keys[i],'...');
							this.poll(this._devices[keys[i]].getOpt('address'), (err,res) => { /* Don't need feedback */ });
						}
					}
			}
		}
	}

	_onServerListening() {
		this._broadcastMessage();
		if( this._broadcastMessageInterval )
			clearInterval(this._broadcastMessageInterval);
		this._broadcastMessageInterval = setInterval(this._broadcastMessage.bind(this), this._opts.broadcastInterval);
	}

	poll(ip, callback) {
		this._debug("Polling device "+ip+" over TCP...");
		let host = {"address":ip, "port":46639};
		request.get('http://'+ip+':'+46639+'/', {timeout: 5000}, (err, response, body) => {
			if (err) console.log("poll rq err",err);
			if (err) return callback(err, null);
			this._onServerMessage( body, host, function (err, res) {
				if (err) console.log("poll osm err",err);
				if (err) return callback(err, null);
				if (err) console.log("poll rq ok",res);
				return callback(null, res);
			});
		});
	}

	_onServerMessage( message, host, callback ) {
		if (typeof callback == 'undefined') callback = function(){};

		message = message.toString();

		var opts = null;

		try {
			opts = JSON.parse(message);
		} catch(e) {
			this._debug("Received corrupt data from "+host.address+", ignoring packet.");
			this._debug("DUMP:",message);
			return callback("Received corrupt data!", null);
		}

		opts.address = host.address;
		opts.port = host.port;

		if ( 'error' in opts ) {
			this._debug("[DISCOVERY] Received error message from "+host.address+": "+opts.error);
			return callback("Received error message from device: "+opts.error, null);
		}

		if ( !('id' in opts) ) { this._debug("Fatal error: no id in json data"); return callback("No id in json data", null); }
		if ( !('type' in opts) ) { this._debug("Fatal error: no type in json data"); return callback("No type in json data", null); }
		if ( !('api' in opts) ) { this._debug("Fatal error: no api in json data"); return callback("No api in json data", null); }

		opts.lastSeen = new Date();

		opts.debug = this._opts.debug;
		opts.debugEmit = this._opts.debugEmit;

		if ( this._devices[ opts.id ] instanceof ArduinoDevice ) {
			//this._debug("Device already in list: "+opts.id);
			this._devices[ opts.id ].update( opts );
			return callback(null, this._devices[ opts.id ]);
			//return callback("Device already discovered!", null);
			//-> To allow for manual pairing of autodiscovered devices (-.-')
		}

		this._devices[ opts.id ] = new ArduinoDevice( opts );

		this._debug("New device: '"+opts.id+"'");

        this.emit('discover', this._devices[ opts.id ]);

		return (null, this._devices[ opts.id ]);
	}
}
module.exports = ArduinoDiscovery;
