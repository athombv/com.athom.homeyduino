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
		this.trigger.debug = new Homey.FlowCardTriggerDevice("debug_trigger").register();
		this.trigger.debug.registerRunListener(this.runDebugTrigger);
		
		this.trigger.number = new Homey.FlowCardTriggerDevice("number_trigger").register();
		this.trigger.number.registerRunListener(this.runNumberTrigger);
		this.trigger.number.getArgument('trigger')
			.registerAutocompleteListener(this.onTriggerAutocomplete.bind(this));
		
		this.trigger.string = new Homey.FlowCardTriggerDevice("string_trigger").register();
		this.trigger.string.registerRunListener(this.runStringTrigger);
		this.trigger.string.getArgument('trigger')
			.registerAutocompleteListener(this.onTriggerAutocomplete.bind(this));
		
		this.trigger.boolean = new Homey.FlowCardTriggerDevice("boolean_trigger").register();
		this.trigger.boolean.registerRunListener(this.runBooleanTrigger);
		this.trigger.boolean.getArgument('trigger')
			.registerAutocompleteListener(this.onTriggerAutocomplete.bind(this));
		
		this.trigger.void = new Homey.FlowCardTriggerDevice("void_trigger").register();
		this.trigger.void.registerRunListener(this.runVoidTrigger);
		this.trigger.void.getArgument('trigger')
			.registerAutocompleteListener(this.onTriggerAutocomplete.bind(this));
			
		this.available = false;
		
		this._actions = [];
		this._conditions = [];
		this._triggers = [];
		this._capabilities = [];

		this.deviceInit();
	}
	
	runDebugTrigger( args, state, callback ) {
		return callback(null,true);
	}
	
	runNumberTrigger( args, state, callback ) {
		/*console.log("runNumberTrigger");
		console.log("ARGS",util.inspect(args, {depth: null}));
		console.log("STATE",util.inspect(state, {depth: null}));*/
		if (args.trigger.value && state.name && args.trigger.value == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runStringTrigger( args, state, callback ) {
		/*console.log("runStringTrigger");
		console.log("ARGS",util.inspect(args, {depth: null}));
		console.log("STATE",util.inspect(state, {depth: null}));*/
		if (args.trigger.value && state.name && args.trigger.value == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runBooleanTrigger( args, state, callback ) {
		/*console.log("runBooleanTrigger");
		console.log("ARGS",util.inspect(args, {depth: null}));
		console.log("STATE",util.inspect(state, {depth: null}));*/
		if (args.trigger.value && state.name && args.trigger.value == state.name) {
			return callback(null,true);
		}
		return callback(null,false);
	}
	runVoidTrigger( args, state, callback ) {
		/*console.log("runVoidTrigger");
		console.log("ARGS",util.inspect(args, {depth: null}));
		console.log("STATE",util.inspect(state, {depth: null}));*/
		if (args.trigger.value && state.name && args.trigger.value == state.name) {
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
	
	getActions() {
		let results = [];
		for (var action in this._actions) {
			results.push({"name":this._actions[action],"value":this._actions[action]});
			
		}
		return results;
	}
	
	getConditions() {
		let results = [];
		for (var condition in this._conditions) {
			results.push({"name":this._conditions[condition],"value":this._conditions[condition]});
			
		}
		return results;
	}
	
	getTriggers() {
		let results = [];
		for (var trigger in this._triggers) {
			results.push({"name":this._triggers[trigger],"value":this._triggers[trigger]});
			
		}
		return results;
	}
		
	onApiChange(info) {
		this._actions = []; //Clear actions
		this._conditions = []; //Clear conditions
		this._triggers = []; //Clear triggers
		this._capabilities = []; //Clear capabilities
		this.log('Info: device API changed');
		for (var callId in info.api) {
			let callName = info.api[callId]['name'];
			let callType = info.api[callId]['type'];
			if (callType=='act') {
				this._actions.push(callName);
				this.log('Info: added action',callName);
			} else if (callType=='con') {
				this._conditions.push(callName);
				this.log('Info: added condition', callName);
			} else if (callType=='cap') {
				this._capabilities.push(callName);
				this.log('Info: added capability', callName);
				//Note: this does NOT update the device entry.
				//User needs to remove the device and pair again to update capabilities!
				//It DOES update the listeners
				this.registerCapabilityListener(callName, this.capability.bind(this, callName));
				this.updateCapabilityValue(callName);
			} else {
				this.log('Warning: ignored API',callName,'because type',callType,'is unknown.');
			}
		}
	}
	
	getCapabilities() {
		return this._capabilities;
	}
	
	updateCapabilityValue(capability) {
		this.device.query(capability, 'cap', '', true).then( (value) => {
			if (typeof value != "undefined") {
				this.log("Set initial capabilty value of",capability,"to",typeof value,value);
				this.setCapabilityValue(capability, value).catch( (err) => {
					this.log("Could not set initial capability value:",err);
				});
			} else {
				this.log("No initial value available for capability",capability);
			}
		}).catch( (err) => {
			this.log('Get capability value returned error:',err);
		});
	}
		
	/*updateCapabilities() {
		this._opts.capabilities = [];
		for (var id in this._opts.api) {
			let name = this._opts.api[id]['name'];
			let type = this._opts.api[id]['type'];
			if (type=='cap') {
				this._opts.capabilities.push(name);
				this.log('Info: added capability',name);
			} else {
				this.log('Warning: API',callName,'because type',callType,'is not capability.');
			}
		}
	}*/
	
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
		this.device = Homey.app.discovery.getDevice(this.getData().id);
		
		//this.log(util.inspect(this.device, {depth: null}));
		
		if ( this.device instanceof Error ) {
			this.log("Homeyduino",this.deviceName,"is unavailable.");
			this.setUnavailable("Offline");
			this.available = false;
		} else {
			this.deviceUpdateLocalAddress( (err, res) => {
				if (err) this.log("Could not get local address: ",err);
				this.log("Homeyduino",this.deviceName,"has become available.");
				this.setAvailable();
				this.available = true;
				this.device.setOpt('paired', true);
				
				this.device.subscribe().then( (res) => {
					this.log('* Subscribed to triggers: ',res);
				}).catch( (err) => {
					this.log('* Could not subscribe:', err);
				});
				
				//Fill autocompletes
				this.onApiChange({"device":this.device, "api":this.device.getOpt('api')});
				
				//Add listeners
				this.device.on('emit', this.onArduinoEmit.bind(this));
				this.device.on('api', this.onApiChange.bind(this));
				this.device.on('master', this.onMasterChange.bind(this));
				this.device.on('debug', this.onDeviceDebug.bind(this));
			});
		}
	}
	
	onDeviceDebug(text) {
		if (typeof text == "array") text = text.join(" "); //Array to string
		if (typeof text == "object") { //Object to string
			var obj = text
			text = ""
			var elem = ""
			var i = 0
			while(true) {
				elem = obj[i];
				i++;
				if (typeof elem=="string") {
					text = text + elem + " ";
				} else {
					break;
				}
			}
		}
		this.log('[njs-device]',text);
	}
	
	onArduinoEmit(info) {
		//this.log("onEmit(",info.name,info.type,info.argument,")");
		if (info.emType=='trg') {
			this.log("Trigger emit received:",info.name,info.type,info.argument);
			this.onTriggered(info);
		} else if (info.emType=='cap') {
			this.log("Capability emit received:",info.name,info.type,info.argument);
			this.setCapabilityValue(info.name, info.argument).catch( (err) => {
				this.log("Could not set capability value:",err);
			});
		} else {
			this.log("Unknown emit received:",info.emType,"[",info.name,info.type,info.argument,"]");
		}
	}
	
	onTriggered(info) {
		//console.log("INFO",util.inspect(info, {depth: null}));
		if (!this._triggers.includes(info.name)) this._triggers.push(info.name);
		
		this.trigger.debug.trigger( this, {"trigger": info.name, "number": Number(info.argument), "string": String(info.argument), "boolean": Boolean(info.argument), "type":info.type}, {"name":info.name} ).then( (result) => {
				//this.log("Debug trigger result ",result);
			} ).catch( this.error );
		if (info.type=='Boolean') {
			this.trigger.boolean.trigger( this, {"value": info.argument}, {"name":info.name} ).then( (result) => {
				//this.log("Boolean trigger result ",result);
			} ).catch( this.error );
		} else if (info.type=='Number') {
			this.trigger.number.trigger( this, {"value": info.argument}, {"name":info.name} ).then( (result) => {
				//this.log("Number trigger result ",result);
			} ).catch( this.error );
		} else if (info.type=='String') {
			console.log("String trigger:",info.name, info.argument);
			this.trigger.string.trigger( this, {"value": info.argument}, {"name":info.name} ).then( (result) => {
				//this.log("String trigger result ",result);
			} ).catch( this.error );
		} else if (info.type=='null') {
			this.trigger.void.trigger( this, {"value": info.argument}, {"name":info.name} ).then( (result) => {
				//this.log("Void trigger result ",result);
			} ).catch( this.error );
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
					this.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
				}
			}
			
			return this.device.query(args.action.value, 'act', value).then( (res) => {
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('Command returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing action',e);
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
					this.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
				}
			}
			
			return this.device.query(args.condition.value, 'con', value).then( (res) => {
				//this.log('Condition returned:',res);
				//this.log('typeof result',typeof res);
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('Condition returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing condition',e);
			return Promise.reject('Exception while executing condition');
		}
	}
	
	capability(name, value, opts) {
		this.log("Capability",name,value,opts);
		try {
			
			if (typeof value === 'string') {
				//Nothing to do
			} else if (typeof value === 'boolean') {
				if (value) {
					value = '1';
				} else {
					value = '0';
				}
			} else {
				value = value.toString();
			}
			
			this.log("Processed value:",value);
			
			return this.device.query(name, 'cap', value).then( (res) => {
				this.log('Capability returned:',res);
				this.log('typeof result',typeof res);
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('Capability returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing capability',e);
			return Promise.reject('Exception while executing capability');
		}
	}
	
	onMasterChange( info ) {
		if ((info.master.host == this.device.getOpt('localAddress'))&&(info.master.port == this.device.getOpt('localPort'))) {
			this.log("onMasterChange: subscribed");
			this.device.setOpt('subscribed', true);
		} else if (this.device.getOpt('subscribed')) {	
			this.log("onMasterChange: re-subscribing...");
			this.device.subscribe().then( (res) => {
				this.log('* Subscribed to triggers: ',res);
			}).catch( (err) => {
				this.log('* Could not subscribe:', err);
			});
		} else {
			this.log("onMasterChange: not subscribed");
		}
	}
	
	
	onTriggerAutocomplete(query, args) {
		let results = args.device.getTriggers();
		
		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});
		
		if (!results.includes(query)) results.push({"name":query, "value":query});
		
		return Promise.resolve( results );
	}
}

module.exports = HomeyduinoDevice;
