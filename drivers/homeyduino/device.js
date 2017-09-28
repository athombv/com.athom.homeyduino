"use strict";

const Homey = require("homey");
const Arduino = require("homey-arduino");
const util = require('util');

class HomeyduinoDevice extends Homey.Device {

	onInit() {
		this.deviceName = this.getName();
		let settings = this.getSettings();	
		
		//this.log("onInit() for",this.deviceName);
		
		this.trigger = [];
		this.trigger.number = new Homey.FlowCardTriggerDevice("number_trigger").register();
		
		this.trigger.number.registerRunListener(this.runNumberTrigger);
		
		this.trigger.string = new Homey.FlowCardTriggerDevice("string_trigger").register();
		
		this.trigger.string.registerRunListener(this.runStringTrigger);
		
		this.trigger.boolean = new Homey.FlowCardTriggerDevice("boolean_trigger").register();
		
		this.trigger.boolean.registerRunListener(this.runBooleanTrigger);
		
		this.trigger.void = new Homey.FlowCardTriggerDevice("void_trigger").register();
		
		this.trigger.void.registerRunListener(this.runVoidTrigger);
		
			/*.trigger( this, {"value": this.currentOutput}, {} )
				.then( this.log )
				.catch( this.error );*/
		this.available = false;
		
		this._actions = [];
		this._conditions = [];

		this.deviceInit();
	}
	
	runNumberTrigger( args, state, callback ) {
		//console.log("runNumberTrigger");
		if (args.trigger && state.name && args.trigger == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runStringTrigger( args, state, callback ) {
		//console.log("runStringTrigger");
		if (args.trigger && state.name && args.trigger == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runBooleanTrigger( args, state, callback ) {
		//console.log("runBooleanTrigger");
		//console.log("ARGS",util.inspect(args, {depth: null}));
		//console.log("STATE",util.inspect(state, {depth: null}));
		if (args.trigger && state.name && args.trigger == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runVoidTrigger( args, state, callback ) {
		//console.log("runVoidTrigger");
		if (args.trigger && state.name && args.trigger == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}

	onAdded() {
		
	}

	onDeleted() {
		
	}
	
	available() {
		return this.getAvailable();
	}
	
	getDeviceName() {
		return this.DeviceName;
	}
	
	onApiChange(info) {
		this._actions = []; //Clear actions
		this._conditions = []; //Clear conditions
		this.log('Api changed.');
		info.api.forEach((type,name) => {
			if (type=='null') { //Return type is 'null': item is action
				this._actions.push(name);
				this.log('Added action',name);
			} else if (type=='Boolean') { //Return type is 'boolean' item is condition
				this._conditions.push(name);
				this.log('Added condition', name);
			} else {
				console.log('IGNORED UNKNOWN API FUNC',name,type);
			}
		})
	}
	
	deviceUpdateLocalAddress( callback ) {
		callback = callback || function(){};
		let cloud = Homey.ManagerCloud;
		cloud.getLocalAddress( (err, localAddress) => {
			if ( err ) return callback( err, null );
			this.device.setLocalAddress(localAddress.split(':')[0]);
			return callback( null, localAddress.split(':')[0]);
		});
	}
	
	deviceInit() {
		this.device = Homey.app.discovery.getDevice(this.deviceName);
		
		//console.log(util.inspect(this.device, {depth: null}));
		
		if ( this.device instanceof Error ) {
			this.log("Homeyduino",this.deviceName,"is unavailable.");
			this.setUnavailable("Not found");
			this.available = false;
		} else {
			this.deviceUpdateLocalAddress( (err, res) => {
				if (err) this.log("Could not get local address: ",err);
				this.log("Homeyduino",this.deviceName,"has become available.");
				this.setAvailable();
				this.available = true;
				this.device.setApiCb(updateActionsAndConditions);
				
				this.device.setTriggerCb(this.onTriggered);
				this.device.subscribe().then( (res) => {
					console.log('* Subscribed to triggers: ',res);
				}).catch( (err) => {
					console.log('* Could not subscribe:', err);
				});
				
				this.device.on('trigger', this.onTriggered.bind(this));
				this.device.on('api', this.onApiChange.bind(this));
				
				//Fill autocompletes
				this.onApiChange({"device":this.device, "api":this.device.getOpt('api')});
			});
		}
	}
	
	onTriggered(info) {
		console.log("onTriggered(",info.name,info.type,info.argument,")");
		
		if (info.type=='Boolean') {
			//console.log("BOOLEAN");
			this.trigger.boolean.trigger( this, {"value": info.argument}, {"name":info.name} ).then( /*this.log*/ ).catch( this.error );
		} else if (info.type=='Number') {
			//console.log("NUMBER");
			this.trigger.number.trigger( this, {"value": info.argument}, {"name":info.name} ).then( /*this.log*/ ).catch( this.error );
		} else if (info.type=='String') {
			//console.log("STRING");
			this.trigger.string.trigger( this, {"value": info.argument}, {"name":info.name} ).then( /*this.log*/ ).catch( this.error );
		} else if (info.type=='null') {
			//console.log("VOID");
			this.trigger.void.trigger( this, {"value": info.argument}, {"name":info.name} ).then( /*this.log*/ ).catch( this.error );
		}
	}
	
	onSettings( newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
		/*this.p = newSettingsObj.p;
		this.i = newSettingsObj.i;
		this.d = newSettingsObj.d;
		this.currentOutput = 0;*/
		callback( null, true );
	}
	
	action(args) {
		try {
			var value = '';
			
			if (typeof args.value !== 'undefined') {
				if (typeof args.value === 'string') {
					value = args.value;
				} else {
					value = args.value.toString();
				}
			} else if (typeof args.droptoken !== 'undefined') {
				if (typeof args.droptoken === 'boolean') {
					if (args.droptoken) { //Convert boolean to string
						value = '1';
					} else {
						value = '0';
					}
				} else {
					console.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
				}
			}
			
			return this.device.query(args.action, value).then( (res) => {
				return Promise.resolve(res);
			}).catch( (err) => {
				console.log('Command returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			console.log('Exception while executing action',e);
			return Promise.reject('Exception while executing action');
		}
	}
	
	condition(args) {
		try {
			var value = '';
						
			if (typeof args.value !== 'undefined') {
				if (typeof args.value === 'string') {
					value = args.value;
				} else {
					value = args.value.toString();
				}
			} else if (typeof args.droptoken !== 'undefined') {
				if (typeof args.droptoken === 'boolean') {
					if (args.droptoken) { //Convert boolean to string
						value = '1';
					} else {
						value = '0';
					}
				} else {
					console.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
				}
			}
			
			return this.device.query(args.action, value).then( (res) => {
				//console.log('Condition returned:',res);
				//console.log('typeof result',typeof res);
				return Promise.resolve(res);
			}).catch( (err) => {
				console.log('Condition returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			console.log('Exception while executing condition',e);
			return Promise.reject('Exception while executing condition');
		}
	}
}

module.exports = HomeyduinoDevice;
