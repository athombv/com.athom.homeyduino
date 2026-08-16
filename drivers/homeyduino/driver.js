/*
 * Project: Homeyduino
 * Author: Renze Nicolai <renze@rnplus.nl>
 * License: GPLv3
 *
 */

"use strict";

const Homey = require('homey');
const ArduinoDevice = require('../../lib/ArduinoDevice');

class HomeyduinoDriver extends Homey.Driver {

	async onInit() {
		console.log('onInit driver...');
		this._initFlows();
		this.homey.app.discovery.on('discover', (arduinoDevice) => {
			if (!arduinoDevice || !(arduinoDevice instanceof ArduinoDevice)) return;
			let devId = arduinoDevice.getOpt('id');
			this.log("onDiscoverDevice", devId);
			let devices = this.getDevices();

			var found = false;
			for (var deviceNo in devices) {
				let device = devices[deviceNo];
				if (!device) continue;

				this.log("Device list: " + device.deviceId);

				if (device.deviceId === devId) {
					found = true;
					if (typeof device.available === 'boolean' && device.available) {
						this.log('Device already available?!');
					} else {
						device.deviceInit( arduinoDevice );
					}
					break;
				}
			}

			if (!found) {
				this.log('Device has not been paired.');
			}
		});
	}

	_initFlows() {
		this.trigger = {};
		this.trigger.debug = this.homey.flow.getDeviceTriggerCard("debug_trigger");
		this.trigger.debug.registerRunListener(() => {
			return true;
		});

		this.trigger.number = this.homey.flow.getDeviceTriggerCard("number_trigger");
		this.trigger.number.registerRunListener((args, state) => {
			return args.trigger.value && state.name && args.trigger.value === state.name;
		});
		this.trigger.number.registerArgumentAutocompleteListener('trigger', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

		this.trigger.string = this.homey.flow.getDeviceTriggerCard("string_trigger");
		this.trigger.string.registerRunListener((args, state) => {
			this.log("Trigger String!", args.trigger, state);
			return args.trigger.value && state.name && args.trigger.value === state.name;
		});
		this.trigger.string.registerArgumentAutocompleteListener('trigger', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

		this.trigger.boolean = this.homey.flow.getDeviceTriggerCard("boolean_trigger");
		this.trigger.boolean.registerRunListener((args, state) => {
			return args.trigger.value && state.name && args.trigger.value === state.name;
		});
		this.trigger.boolean.registerArgumentAutocompleteListener('trigger', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

		this.trigger.void = this.homey.flow.getDeviceTriggerCard("void_trigger");
		this.trigger.void.registerRunListener((args, state) => {
			return args.trigger.value && state.name && args.trigger.value == state.name;
		});
		this.trigger.void.registerArgumentAutocompleteListener('trigger', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

		this.trigger.rc_digital = this.homey.flow.getDeviceTriggerCard("rc_digital_trigger");
		this.trigger.rc_digital.registerRunListener((args, state) => {
			return args.pin.value && state.pin && args.pin.value === state.pin;
		});
		this.trigger.rc_digital.registerArgumentAutocompleteListener('pin', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

		this.trigger.rc_analog = this.homey.flow.getDeviceTriggerCard("rc_analog_trigger");
		this.trigger.rc_analog.registerRunListener((args, state) => {
			return args.pin.value && state.pin && args.pin.value === state.pin;
		});
		this.trigger.rc_analog.registerArgumentAutocompleteListener('pin', async (query, args) => {
			return args.device.onTriggerAutocomplete(query, args);
		});

	}

	async onPairListDevices( data ) {
        let deviceList = [];
		let arduinoDevices = this.homey.app.discovery.getDevices();
		let existingDevices = this.getDevices();
		let existingIds = new Set();
		for (let existingDevice of existingDevices) {
			if (!existingDevice) continue;
			if (existingDevice.deviceId) existingIds.add(existingDevice.deviceId);
			let settings = existingDevice.getSettings ? existingDevice.getSettings() : null;
			if (settings && settings.id) existingIds.add(settings.id);
			let devData = existingDevice.getData ? existingDevice.getData() : null;
			if (devData && devData.id) existingIds.add(devData.id);
		}

		let now = new Date().getTime();
		let timeoutInterval = 60 * 1000;

		for (var deviceKey in arduinoDevices) {
			var device = arduinoDevices[deviceKey];
			if (!device || !(device instanceof ArduinoDevice)) continue;

			let deviceName = device.getOpt('id');
			if (!deviceName) continue;

			// Filter out devices that are already paired in Homey
			if (existingIds.has(deviceName)) {
				this.log("Not showing device "+deviceName+" because it is already paired.");
				continue;
			}

			// Filter out stale devices that have not been seen within timeout window
			let lastSeen = device.getOpt('lastSeen');
			if (lastSeen && (now - new Date(lastSeen).getTime() > timeoutInterval)) {
				this.log("Not showing device "+deviceName+" because it has timed out.");
				continue;
			}

			var libVersion = device.libVersion();

			var outdated = false;
			if (libVersion!=this.homey.manifest.version) {
				this.log("Warning: Device "+deviceName+" uses an outdated library version (Lib: "+libVersion+", App: "+this.homey.manifest.version+")");
				outdated = true;
			}

			let deviceClass = device.getOpt('class');
			let deviceType = device.getOpt('type');
			let deviceApi = device.getOpt('api');
			let deviceAddress = device.getOpt('address');

			// Filter: show only homeyduino devices
			//(And also show Sonoff devices running Homeyduino firmware...)

			if ((deviceType!="homeyduino")&&(deviceType!="sonoff")) {
				this.log("Not showing device "+deviceName+" because type '"+deviceType+"' is not supported by this app.");
				continue;
			}

			var deviceRc = false;
			var deviceArch = 'unknown';
			var deviceNumDigitalPins = 0;
			var deviceNumAnalogInputs = 0;

			if (device.hasRc()) {
				let rcInfo = device.getOpt('rc') || {};
				deviceRc = true;
				deviceArch = rcInfo.arch || 'unknown';
				deviceNumDigitalPins = rcInfo.numDigitalPins || 0;
				deviceNumAnalogInputs = rcInfo.numAnalogInputs || 0;
			}

			let capabilities = [];
			for (var id in deviceApi) {
				let name = deviceApi[id].name;
				let type = deviceApi[id].type;
				if (type=="cap") {
					capabilities.push(name);
				}
			}

			// Create deviceDescriptor

			var deviceDescriptor = {
					"name": deviceName,
					"data": { // only used during pair wizard
						"id": deviceName,
						"ip": deviceAddress
					},
					"settings": {
						"id": deviceName,
						"ip": deviceAddress,
						"polling": false
					},
					"type": deviceType,
					"class": deviceClass,
					"capabilities": capabilities,
					"api": deviceApi,
					"rc": deviceRc,
					"arch": deviceArch,
					"numDigitalPins": deviceNumDigitalPins,
					"numAnalogInputs": deviceNumAnalogInputs,
					"outdated": outdated,
					"libVersion": libVersion
			};

			if (deviceType=="sonoff") {
				deviceDescriptor.icon = "icon_sonoff.svg";
			}

			// Add device to list
			deviceList.push(deviceDescriptor);
		}

        return (deviceList);
    }

    async onPair(session) {
	    super.onPair( session );
		session.setHandler("list_devices", async ( data ) => {
			return this.onPairListDevices(data);
		});
        session.setHandler("pairManually", async ( data ) => {
			if (!data || !data.ip || data.ip === "") {
				throw new Error(this.homey.__("pair.manual.ip_field_empty") || "IP field is empty");
			}

			this.log("onPair: Polling IP " + data.ip + "...");
			return new Promise((resolve, reject) => {
				this.homey.app.discovery.poll(data.ip, (err, res) => {
					if (err) {
						let msg = "Connection error";
						if (typeof err === 'object') {
							if (err.message === 'ETIMEDOUT') {
								msg = this.homey.__('pair.manual.error_timeout') || 'Connection timed out';
							} else if (err.message) {
								msg = err.message;
							}
						} else if (typeof err === 'string') {
							msg = err;
						}
						return reject(new Error(msg));
					}

					if (!res || !(res instanceof ArduinoDevice)) {
						return reject(new Error("Invalid device response"));
					}

					let device = res;
					let deviceName = device.getOpt('id');
					let deviceClass = device.getOpt('class');
					let deviceType = device.getOpt('type');
					let deviceApi = device.getOpt('api') || [];

					var deviceRc = false;
					var deviceArch = 'unknown';
					var deviceNumDigitalPins = 0;
					var deviceNumAnalogInputs = 0;

					if (device.hasRc()) {
						let rcInfo = device.getOpt('rc') || {};
						this.log("RC", rcInfo, rcInfo.arch);

						deviceRc = true;
						deviceArch = rcInfo.arch || 'unknown';
						deviceNumDigitalPins = rcInfo.numDigitalPins || 0;
						deviceNumAnalogInputs = rcInfo.numAnalogInputs || 0;
					} else {
						this.log("No RC");
					}

					let deviceAddress = data.ip;

					let capabilities = [];
					for (var id in deviceApi) {
						let name = deviceApi[id].name;
						let type = deviceApi[id].type;
						if (type=="cap") {
							capabilities.push(name);
						}
					}

					// create deviceDescriptor
					var deviceDescriptor = {
						"name": deviceName,
						"data": { // only used during pair wizard
							"id": deviceName,
							"ip": deviceAddress
						},
						"settings": {
							"id": deviceName,
							"ip": deviceAddress,
							"polling": true
						},
						"class": deviceClass,
						"capabilities": capabilities,
						"api": deviceApi,
						"rc": deviceRc,
						"arch": deviceArch,
						"numDigitalPins": deviceNumDigitalPins,
						"numAnalogInputs": deviceNumAnalogInputs
					};
					return resolve(deviceDescriptor);
				});
			});
        });
    }
}

module.exports = HomeyduinoDriver;

