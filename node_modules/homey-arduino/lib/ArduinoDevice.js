"use strict";

const events = require('events');
const rp = require('request-promise-native');
const express = require('express');
const bodyParser = require('body-parser');
const util = require('util');
const promiseRetry = require('promise-retry');

class ArduinoDevice extends events.EventEmitter {

	constructor( opts ) {
		super();

		this._opts = Object.assign({
			id: 'unknown',
			type: 'unknown',
			address: '0.0.0.0',
			port: 46639,
			api: [],
			localPort: 0,
			localAddress: '0.0.0.0',
			subscribed: false,
			debug: false,
			debugEmit: false,
			lastSeen: null,
			paired: false
		}, opts);

		this._webserver = express();

		this._webserver.use(bodyParser.json());

		this._webserver.get('/', (req, res) => {
			this._debug('Webserver: index requested');
			res.send('');
		});

		this._webserver.post('/emit/*', (req, res) => {
			try {
				let urlParts = req.url.split('/');
				let emType = urlParts[2];
				let name = urlParts[3];

				//this._debug(' - Body:',req.body);
				let argument = req.body.argument;
				let type = req.body.type;
				//this._debug(' - Name:',name);
				//this._debug(' - Emit type:',emType);
				//this._debug(' - Argument:',argument);
				//this._debug(' - Argument type:',type);
				this.emit('emit', {"name":name, "emType":emType, "type":type, "argument":argument});
				res.send('ok');
			} catch(e) {
				this._debug('Emit request error: invalid data');
				res.send('error');
			}
		});

		this._webserver.get('*', (req, res) => {
			this._debug('Ignored unhandled GET request: '+req.url);
			res.send('Unknown (GET)', 404);
		});

		this._webserver.post('*', (req, res) => {
			this._debug('Ignored unhandled POST request: '+req.url);
			res.send('Unknown (POST)', 404);
		});

		var listener = this._webserver.listen(0);
		this._opts.localPort = listener.address().port;
	}

	update ( opts ) {
		//this._debug('Device update: '+this._opts.id);

		this._opts.lastSeen = opts.lastSeen; //Update last discovery moment
		if ( JSON.stringify(this._opts.master) != JSON.stringify(opts.master) ) {
			this._debug("Device master changed to "+opts.master.host+":"+opts.master.port);
			this._opts.master = opts.master;
			this.emit('master', {"device":this, "master":this._opts.master});
		}
		//this._debug("My local address: "+this._opts.localAddress);
		if ( JSON.stringify({"host":this._opts.localAddress,"port":this._opts.localPort}) != JSON.stringify(opts.master) ) {
			if (this._opts.subscribed) {
				this._debug("Lost subscription, subscribing...");
				this.subscribe( (err, res) => {
					if ( err ) {
						console.log('Lost registration with device:',err);
					} else {
						console.log('Re-registered with device.');
					}
				});
			}
		}
		if ( JSON.stringify(this._opts.api) != JSON.stringify(opts.api) ) {
			this._debug("API changed");
			this._opts.api = opts.api;
			this.emit('api', {"device":this, "api":this._opts.api});
		}
		if (( this._opts.address != opts.address ) || ( this._opts.port != opts.port )) {
			this._debug("Network location changed ("+this._opts.address+ ":"+this._opts.port+" to "+opts.address+":"+opts.port+")");
			this._opts.address = opts.address;
			this._opts.port = opts.port;
			this.emit('network', {"device":this, "address":this._opts.address, "port":this._opts.port});
		}

		//Update "static" info (in case someone swaps to a different board with same id and ip address)
		this._opts.type = opts.type;
		this._opts.class = opts.class;
		this._opts.arch = opts.arch;
		this._opts.numDigitalPins = opts.numDigitalPins;
		this._opts.numAnalogInputs = opts.numAnalogInputs;
		this._opts.rc = opts.rc;
	}

	_debug() {
		if( this._opts.debug ) {
			console.log.apply( null, arguments );
		}
		if( this._opts.debugEmit ) {
			this.emit('debug', arguments );
		}
	}
	
	hasRc() {
		return ('rc' in this._opts);
	}

	executeRequest(path, body, get=false){

		var rq = {};
		var rt = 1;

		if (get) {
			rq = {
				method	: 'GET',
				uri		: 'http://' + this._opts.address+ ':' + this._opts.port + '/' + path + '?' + body,
				headers	: {},
				timeout : 2000
			};
			rt = 3; //Try GET requests 3 times
		} else {
			rq = {
				method	: 'POST',
				uri		: 'http://' + this._opts.address+ ':' + this._opts.port + '/' + path,
				body	: body,
				headers	: {},
				timeout : 10000
			};
			rt = 1; //Try POST requests only once
		}

		return promiseRetry( (retry, number) => {
			if (number>1) this._debug('Request failed, try', number);
			return rp(rq).catch( (err) => {
				retry(err);
			});
		}, {retries: rt}).then((result) => {
			try {
				body = JSON.parse(result);
				return Promise.resolve(body);
			} catch(e){
				console.log("executeRequest: could not decode json response");
				return Promise.reject(result);
			}
		}).catch((err) => {
			try {
				body = JSON.parse(err.error);
				return Promise.reject(body);
			} catch(e){
				console.log("executeRequest: could not decode json error");
				return Promise.reject(err);
			}
		});
	}

	query( name, type, parameter, get=false ) {
		let endpoint = type+"/"+name;
		//console.log("query",endpoint);
		return this.executeRequest(endpoint, parameter, get)
			.then( (body) => {
				if ( ('r') in body ) {
					if ( ('t') in body ) {
						if (body.t == "err") {
							return Promise.reject( body.r );
						} else {
							return Promise.resolve( body.r );
						}
					} else {
						console.log("query: no type in response!!!");
						return Promise.resolve( body.r );
					}
				} else {
					return Promise.reject( 'query: no result in response!!!' );
				}
			})
			.catch( (err) => {
				if ( ('error') in err ) return Promise.reject( err.error );
				return Promise.reject(err);
			});
	}

	setLocalAddress( addr ) {
		this._opts.localAddress = addr;
	}

	subscribe() {
		return this.executeRequest("sys/setmaster", this._opts.localAddress+":"+this._opts.localPort)
			.then( (body) => {
				if ( ('r') in body ) {
					if ( ('t') in body ) {
						if (body.t == "err") {
							return Promise.reject( body.r );
						} else {
							this._opts.subscribed = true;
							return Promise.resolve( body.r );
						}
					} else {
						console.log("setmaster: no type in response!!!");
						return Promise.resolve( body.r );
					}
				} else {
					return Promise.reject( 'setmaster: no result in response!!!' );
				}
			})
			.catch( (err) => {
				return Promise.reject(err);
			});
	}

	unsubscribe() {
		this._opts.subscribed = false;
	}

	getOpt( key ) {
		return this._opts[ key ];
	}

	setOpt( key, value ) {
		this._opts[ key ] = value;
	}
}

module.exports = ArduinoDevice;
