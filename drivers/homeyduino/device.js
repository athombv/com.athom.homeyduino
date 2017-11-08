"use strict";

const Homey = require("homey");
const Arduino = require("homey-arduino");
const util = require('util');

class HomeyduinoDevice extends Homey.Device {

	constructor(...args) {
		super(...args);

		this.onArduinoEmit = this.onArduinoEmit.bind(this);
		this.onApiChange = this.onApiChange.bind(this);
		this.onMasterChange = this.onMasterChange.bind(this);
		this.onDeviceDebug = this.onDeviceDebug.bind(this);
		this.onNetworkChange = this.onNetworkChange.bind(this);
	}

	onInit() {
		this.deviceName = this.getName();
		let settings = this.getSettings();

		this.log("typeof settings.id =",typeof settings.id);

		if ((typeof settings.id == "undefined")||(settings.id=="not-set-default-value")) {
			/* This code is here because older versions of this app stored the
			 * device id in the device data and not in the device settings.
			 * (it is only needed to let people "upgrade" from earlier pre-releases)
			 */
			this.log("WARNING: DEVICE ID FETCHED USING OLD METHOD");
			let data = this.getData();
			if (typeof data.id == "undefined") {
				this.log("Device ID: not set. No fallback!");
				this.deviceId = "unknown";
			} else {
				this.log("Device ID: fallback to data value...");
				this.deviceId = data.id;

				this.log("(Adding ID to device settings!)");
				settings.id = data.id;
				this.setSettings(settings);
			}
		} else {
			this.deviceId = settings.id;
		}

		/*if ((typeof settings.id == "undefined")||(settings.id=="not-set-default-value")) {
			this.log("ERROR: DETECTED OLD HOMEYDUINO DEVICE ENTRY. PLEASE REMOVE AND ADD AGAIN!");
			return;
		}

		this.deviceId = settings.id;*/

		if (typeof settings.polling != 'undefined') {
			this.polling = settings.polling;
		} else {
			this.polling = false;
		}

		if (typeof settings.ip != 'undefined') {
			this.ipAddress = settings.ip;
		} else {
			this.ipAddress = '0.0.0.0';
		}

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

		this.trigger.rc_digital = new Homey.FlowCardTriggerDevice("rc_digital_trigger").register(); //TBD
		this.trigger.rc_digital.registerRunListener(this.runRcTrigger);
		this.trigger.rc_digital.getArgument('pin')
			.registerAutocompleteListener(this.onRcDigitalTriggerAutocomplete.bind(this));

		this.trigger.rc_analog = new Homey.FlowCardTriggerDevice("rc_analog_trigger").register(); //TBD
		this.trigger.rc_analog.registerRunListener(this.runRcTrigger);
		this.trigger.rc_analog.getArgument('pin')
				.registerAutocompleteListener(this.onRcAnalogTriggerAutocomplete.bind(this));

		this.available = false;

		this._actions = [];
		this._conditions = [];
		this._triggers = [];
		this._capabilities = [];

		this._rcDigitalOutputPins = [];
		this._rcDigitalInputPins = [];
		this._rcAnalogOutputPins = [];
		this._rcAnalogInputPins = [];

		this.listening = false;
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
	runRcTrigger( args, state, callback ) {
		if (args.pin.value && state.pin && args.pin.value == state.pin) {
			return callback(null,true);
		}
		//if (args.pin.value && state.pin) {
			this.log("runRcTrigger: ",args.pin.value,state.pin);
		//}
		return callback(null,false);
	}

	onAdded() {

	}

	onDeleted() {
		this.removeListeners();
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

	getRcDigitalOutputs() {
		let results = [];
		for (var action in this._rcDigitalOutputPins) {
			results.push({
				"name":this._rcDigitalOutputPins[action].flowName,
				"value":this._rcDigitalOutputPins[action].name
			});
		}
		return results;
	}

	getRcAnalogOutputs() {
		let results = [];
		for (var action in this._rcAnalogOutputPins) {
			var range = 255; //Guess 8-bit
			if (typeof this._rcAnalogOutputPins[action].range !== 'undefined') {
				if (typeof this._rcAnalogOutputPins[action].range.ao !== 'undefined') {
					range = this._rcAnalogOutputPins[action].range.ao;
					this.log("Analog output range",this._rcAnalogOutputPins[action].name,range);
				} else {
					this.log("Analog output range",this._rcAnalogOutputPins[action].name,'NO AO');
				}
			} else {
				this.log("Analog output range",this._rcAnalogOutputPins[action].name,'NO RANGE');
			}
			results.push({
				"name":this._rcAnalogOutputPins[action].flowName,
				"value":this._rcAnalogOutputPins[action].name,
				"range":range
			});
		}
		return results;
	}

	getRcDigitalInputs() {
		let results = [];
		for (var action in this._rcDigitalInputPins) {
			results.push({
				"name":this._rcDigitalInputPins[action].flowName,
				"value":this._rcDigitalInputPins[action].name
			});
		}
		return results;
	}

	getRcAnalogInputs() {
		let results = [];
		for (var action in this._rcAnalogInputPins) {
			var range = 1023; //Guess 10-bit
			if (typeof this._rcAnalogInputPins[action].range !== 'undefined') {
				if (typeof this._rcAnalogInputPins[action].range.ai !== 'undefined') {
					range = this._rcAnalogInputPins[action].range.ai;
					this.log("Analog Input range",this._rcAnalogInputPins[action].name,range);
				} else {
					this.log("Analog Input range",this._rcAnalogInputPins[action].name,'NO AI');
				}
			} else {
				this.log("Analog Input range",this._rcAnalogInputPins[action].name,'NO RANGE');
			}
			results.push({
				"name":this._rcAnalogInputPins[action].flowName,
				"value":this._rcAnalogInputPins[action].name,
				"range": range
			});
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
			let callName = info.api[callId].name;
			let callType = info.api[callId].type;
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
			} else if (callType=='rc') {
				this.log('Info: detected RC interface', callName);
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

	removeListeners() {
		if (this.listening) {
			this.listening = false;
			this.device.removeListener('emit', this.onArduinoEmit);
			this.device.removeListener('api', this.onApiChange);
			this.device.removeListener('master', this.onMasterChange);
			this.device.removeListener('debug', this.onDeviceDebug);
			this.device.removeListener('network', this.onNetworkChange);
			this.log("Removed event listeners.");
		} else {
			this.log("Not listening.");
		}
	}

	onNetworkChange(info) {
		this.ipAddress = info.address;
		let settings = this.getSettings();
		settings.ip = this.ipAddress;
		this.setSettings(settings);
	}

	rcConfigure() {
		let settings = this.getSettings();
		if (typeof settings.rc === "undefined") return;
		this.log("Configuring RC parameters...");
		this.log(" * Board:",settings.rc.board.name);

		this._rcDigitalOutputPins = [];
		this._rcDigitalInputPins = [];
		this._rcAnalogOutputPins = [];
		this._rcAnalogInputPins = [];

		for (var key in settings.rc.pins) {
			var pin = settings.rc.pins[key];
			this.log(" * Pin",pin.name,"is identified as",pin.flowName,"and configured as",pin.mode);
			if ((pin.mode=="di")||(pin.mode=="dip")||(pin.mode=="dit")||(pin.mode=="ditp")) {
				this._rcDigitalInputPins.push(pin);
			} else if (pin.mode=="do") {
				this._rcDigitalOutputPins.push(pin);
			} else if (pin.mode=="ao") {
				this._rcAnalogOutputPins.push(pin);
			} else if ((pin.mode=="ai")||(pin.mode=="aip")||(pin.mode=="ait")||(pin.mode=="aitp")) {
				this._rcAnalogInputPins.push(pin);
			}
		}

		this.rcModeSet(settings.rc.pins);
	}

	rcModeSet(pins, res = null) {
		//if (res!=null) this.log('RC MODE SET RESULT: ',res); //Doesn't happen.

		if (pins.length<1) {
			this.log("All RC pins have been configured succesfully!");
			return;
		}

		//this.log("rcModeSet called with",pins,res);

		let pin = pins.shift();
		let cfg = pin.name+"="+pin.mode;
		let rcModeSetNext = this.rcModeSet.bind(this, pins);

		this.log("Configuring RC pin '"+pin.name+"' to '"+pin.mode+"'...");

		this.device.query('mode', 'rc', cfg)
			.then(rcModeSetNext)
			.catch( (err) => {
				this.log('Mode set returned error:',err);
			});
	}

	deviceInit() {
		if (this.listening) {
			//First remove the listeners
			this.removeListeners();
		}
		this.log("Searching for Arduino device "+this.deviceId+"...");
		this.device = Homey.app.discovery.getDevice(this.deviceId);

		//this.log(util.inspect(this.device, {depth: null}));

		if ( this.device instanceof Error ) {
			this.log("Device ",this.deviceId," is not available.");
			this.setUnavailable("Offline");
			this.available = false;

			if (this.polling) {
				this.log("Polling is enabled for device",this.deviceId," at IP ",this.ipAddress);
				Homey.app.discovery.poll(this.ipAddress, (err, res) => {
					if (err) {
						this.log("Poll returned error:",err);
					} else {
						this.log("Poll success!");
					}
				});
			}

		} else {
			this.deviceUpdateLocalAddress( (err, res) => {
				if (err) this.log("Could not get local address: ",err);
				this.log("Device ",this.deviceId," is available.");
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
				this.device.on('emit', this.onArduinoEmit);
				this.device.on('api', this.onApiChange);
				this.device.on('master', this.onMasterChange);
				this.device.on('debug', this.onDeviceDebug);
				this.device.on('network', this.onNetworkChange);
				this.listening = true;
			});
			this.rcConfigure();
		}
	}

	onDeviceDebug(text) {
		if (typeof text == "object") {
			if (typeof text.join == "function") {
				text = text.join(" ");
			} else {
				var obj = text;
				text = "";
				var elem = "";
				var i = 0;
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
		}
		this.log('[njs-device]',text);
	}

	onArduinoEmit(info) {
		//this.log("onEmit(",info.name,info.type,info.argument,")");
		if (info.emType=='trg') {
			this.log("Trigger emit received:",info.name,info.type,info.argument);
			this.onTriggered(info);
			this.onRcEmit(info);
		} else if (info.emType=='rc') {
			this.log("RC emit received:",info.name,info.type,info.argument);
			this.OnRcEmit(info);
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

	rcAnalogInputMap(name, input) {
		var output = input;

		var pin = null;

		for (var key in this._rcAnalogInputPins) {
			if (this._rcAnalogInputPins[key].name == name) {
				pin = this._rcAnalogInputPins[key];
				break;
			}
		}

		if (pin==null) {
			this.log("rcAnalogInputMap(",name,") error: unknown pin");
			return output;
		}

		var range = 1023; //Guess 10-bit
		if (typeof pin.range === 'undefined') {
			this.log("rcAnalogInputMap(",name,") error: no range defined");
		} else if (typeof pin.range.ai === 'undefined') {
			this.log("rcAnalogInputMap(",name,") error: no input range defined");
		} else {
			range = pin.range.ai;
			this.log("rcAnalogInputMap(",name,") range:",range);
		}

		output = output / range;
		output = +output.toFixed(2);

		return output;
	}

	rcAnalogInputGetFlownameForRealName(name) {
		var pin = null;
		for (var key in this._rcAnalogInputPins) {
			if (this._rcAnalogInputPins[key].name == name) {
				pin = this._rcAnalogInputPins[key];
				break;
			}
		}
		if (pin==null) {
			this.log("rcGetAnalogInputFlownameForRealName: unknown pin");
			return 'invalid_pin';
		}
		return pin.flowName;
	}

	rcDigitalInputGetFlownameForRealName(name) {
		var pin = null;
		for (var key in this._rcDigitalInputPins) {
			if (this._rcDigitalInputPins[key].name == name) {
				pin = this._rcDigitalInputPins[key];
				break;
			}
		}
		if (pin==null) {
			this.log("rcGetDigitalInputFlownameForRealName: unknown pin");
			return 'invalid_pin';
		}
		return pin.flowName;
	}

	onRcEmit(info) {
		if (info.type=='Boolean') {
			this.log("onRcEmit: digital input",info.argument,info.name);
			this.trigger.rc_digital.trigger( this, {"value": info.argument}, {"pin":info.name} ).then( (result) => {
			} ).catch( this.error );
		} else if (info.type=='Number') {
			this.log("onRcEmit: analog input",info.argument,info.name);
			var mappedValue = this.rcAnalogInputMap(info.name, info.argument);
			this.trigger.rc_analog.trigger( this, {"value": mappedValue}, {"pin":info.name} ).then( (result) => {
			} ).catch( this.error );
		} else {
			this.log("onRcEmit: unsupported type",info.type,"ignored.");
		}
	}

	onSettings( oldSettings, newSettings, changedKeysArr, callback ) {
		var reinit = false;
		if (oldSettings.id != newSettings.id){
			this.log("Device ID changed in settings. Calling deviceInit with new device "+newSettings.id+"...");
			this.deviceId = newSettings.id;
			reinit = true;
		}

		if (oldSettings.polling != newSettings.polling){
			this.log('Polling changed to',newSettings.polling);
			this.polling = newSettings.polling;
			if ( ! (this.device instanceof Error) ) this.device.setOpt('polling', this.polling);
		}

		if (oldSettings.ip != newSettings.ip){
			this.log('IP address changed to',newSettings.ip);
			this.ipAddress = newSettings.ip;
		}

		if (typeof newSettings.rc != 'undefined') {
			if (typeof oldSettings.rc != 'undefined') {
				if (newSettings.rc != oldSettings.rc) {
					reinit = true;
				}
			} else {
				reinit = true;
			}
		}

		if (reinit) {
			this.deviceInit();
		}

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

	rcDigitalAction(mode, args) {
		try {
			var pin = args.pin.value;
			var state = false;
			if (mode=='token') {
				state = args.droptoken;
			} else if (mode=='on') {
				state = true;
			}

			if (state) {
				state = 1;
			} else {
				state = 0;
			}

			this.log("rcDigitalAction",pin,state);

			return this.device.query('dwrite', 'rc', pin+'='+state).then( (res) => {
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('RC digital returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing RC digital',e);
			return Promise.reject('Exception while executing RC digital');
		}
	}

	rcAnalogAction(args) {
		try {
			var pin = args.pin.value;
			var value = args.value.toString();

			if (args.pin.range!=null) {
				value = value * args.pin.range; //Map range 0.00 - 1.00 to Arduino range
			} else {
				this.log("rcAnalogAction",args,"NO RANGE");
			}

			value = Math.round(value); //Round to integer

			this.log("rcAnalogAction",pin,value);

			return this.device.query('awrite', 'rc', pin+'='+value).then( (res) => {
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('RC analog returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing RC analog',e);
			return Promise.reject('Exception while executing RC analog');
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

	rcDigitalCondition(args) {
		try {
			var pin = args.pin.value;
			return this.device.query('dread', 'rc', pin).then( (res) => {
				return Promise.resolve(res);
			}).catch( (err) => {
				this.log('rcDigitalCondition returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing rcDigitalCondition',e);
			return Promise.reject('Exception while executing rcDigitalCondition');
		}
	}

	rcAnalogCondition(args, mode) {
		try {
			var pin = args.pin.value;
			var compareTo = args.value.toString();

			if (args.pin.range!=null) {
				compareTo = compareTo * args.pin.range; //Map range 0.00 - 1.00 to Arduino range
			} else {
				this.log("rcAnalogCondition",args,"NO RANGE");
			}

			this.log("rcAnalogCondition",pin,compareTo);

			return this.device.query('aread', 'rc', pin).then( (res) => {
				this.log("rcAnaloCondition RESULT ",res,compareTo);
				if (mode) {
					//Equals
					if (res==compareTo) return Promise.resolve(true);
					return Promise.resolve(false);
				} else {
					//Greater than
					if (res>compareTo) return Promise.resolve(true);
					return Promise.resolve(false);
				}
			}).catch( (err) => {
				this.log('rcAnalogCondition returned error:',err);
				return Promise.reject(err);
			});
		} catch(e) {
			this.log('Exception while executing rcAnalogCondition',e);
			return Promise.reject('Exception while executing rcAnalogCondition');
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

		this.rcConfigure(); //Reconfigure pins whenever master changes
	}


	onTriggerAutocomplete(query, args) {
		let results = args.device.getTriggers();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		if (!results.includes(query)) results.push({"name":query, "value":query});

		return Promise.resolve( results );
	}

	onRcDigitalTriggerAutocomplete(query, args) {
		let results = args.device.getRcDigitalInputs();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onRcAnalogTriggerAutocomplete(query, args) {
		let results = args.device.getRcAnalogInputs();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}
}

module.exports = HomeyduinoDevice;
