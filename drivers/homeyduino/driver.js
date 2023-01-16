/*
 * Project: Homeyduino
 * Author: Renze Nicolai <renze@rnplus.nl>
 * License: GPLv3
 *
 */

"use strict";

const Homey = require('homey');
const Arduino = require("homey-arduino");
const util = require('util');
const events = require('events');

class HomeyduinoDriver extends Homey.Driver {

	async onInit() {
		console.log('onInit driver...');

		this.homey.app.discovery.on('discover', (arduinoDevice) => {
			this.log("onDiscoverDevice",arduinoDevice.getOpt('id'));
			let devices = this.getDevices();

			var found = false;
			for (var deviceNo in devices) {
				let device = devices[deviceNo];

				//this.log("Device list: "+device.deviceId);

				if (device.deviceId == arduinoDevice.getOpt("id")) {
					found = true;
					if (device.available) {
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

	async onPairListDevices( data ) {
        let deviceList = [];
		let arduinoDevices = this.homey.app.discovery.getDevices();

		for (var deviceKey in arduinoDevices) {

			// Collect device information

			var device = arduinoDevices[deviceKey];
			let deviceName = device.getOpt('id');
			
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

			// Should you want to make your own version of this app and the library, for example for a custom product
			// then please change the deviceType in both the Arduino library and your app to avoid conflicts with
			// this app and it's devices

			// Get capabilities from device API

			var deviceRc = false;
			var deviceArch = 'unknown';
			var deviceNumDigitalPins = 0;
			var deviceNumAnalogInputs = 0;
			
			if (device.hasRc()) {
				let rcInfo = device.getOpt('rc');
				deviceRc = true;
				deviceArch = rcInfo.arch;
				deviceNumDigitalPins = rcInfo.numDigitalPins;
				deviceNumAnalogInputs = rcInfo.numAnalogInputs;
			}
			
			let capabilities = [];
			for (var id in deviceApi) {
				let name = deviceApi[id].name;
				let type = deviceApi[id].type;
				if (type=="cap") {
					capabilities.push(name);
				}
			//	if (type=="rc") { //Also works, but we now have the hasRc function...
			//		deviceRc = true;
			//	}
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
				//this.log("Device is Sonoff device, adding icon...");
				deviceDescriptor.icon = "icon_sonoff.svg";
			}// else {
			//	this.log("device is not sonoff");
			//}

			// Add device to list

			deviceList.push(deviceDescriptor);
		}
		
        return (deviceList);
    }

    async onPair(session) {
	    super.onPair( session );
        session.setHandler("pairManually", async ( data ) => {
        //session.setHandler("pairManually", async function ( data ) {
			if (data.ip==="") return (Homey.__("pair.manual.ip_field_empty"));

			this.log("onPair: Polling...");
			this.homey.app.discovery.poll(data.ip, (err, res) => {
				//this.log("onPair: Poll result ", err, res);
				if (err) {
					//First try to give back usefull information
					if (typeof err == 'object') {
						if (typeof err.message == 'string') {
							if (err.message=='ETIMEDOUT') {
								return (Homey.__('pair.manual.error_timeout'));
							} else {
								return (err.message);
							}
						}
					}
					//Then just return whatever we got...
					return (err);
				};
				//this.log("onPair: success");

				var device = res;
				let deviceName = device.getOpt('id');
				let deviceClass = device.getOpt('class');
				let deviceType = device.getOpt('type');
				let deviceApi = device.getOpt('api');
				
				
				var deviceRc = false;
				var deviceArch = 'unknown';
				var deviceNumDigitalPins = 0;
				var deviceNumAnalogInputs = 0;
				
				if (device.hasRc()) {
					let rcInfo = device.getOpt('rc');
					this.log("RC",rcInfo,rcInfo.arch);
					
					
					deviceRc = true;
					deviceArch = rcInfo.arch;
					deviceNumDigitalPins = rcInfo.numDigitalPins;
					deviceNumAnalogInputs = rcInfo.numAnalogInputs;
				} else {
					this.log("No RC");
				};
				
				let deviceAddress = data.ip;

				//Get capabilities from device API 

				//var deviceRc = false;

				let capabilities = [];
				for (var id in deviceApi) {
					let name = deviceApi[id].name;
					let type = deviceApi[id].type;
					if (type=="cap") {
						capabilities.push(name);
					}
				//	if (type=="rc") {
				//	deviceRc = true;
				//	}
				};

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
				return (deviceDescriptor);
			});
        });
    }
}

module.exports = HomeyduinoDriver;
