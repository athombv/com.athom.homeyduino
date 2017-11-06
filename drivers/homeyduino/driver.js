"use strict";

const Homey = require('homey');
const Arduino = require("homey-arduino");
const util = require('util');
const events = require('events');

class HomeyduinoDriver extends Homey.Driver {

	onInit() {
		Homey.app.discovery.on('discover', (arduinoDevice) => {
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

	onPairListDevices( data, callback ) {
        let deviceList = [];
		let arduinoDevices = Homey.app.discovery.getDevices();

		for (var deviceKey in arduinoDevices) {

			/* Collect device information */

			var device = arduinoDevices[deviceKey];
			let deviceName = device.getOpt('id');
			let deviceClass = device.getOpt('class');
			let deviceType = device.getOpt('type');
			let deviceApi = device.getOpt('api');
			let deviceArch = device.getOpt('arch');
			let deviceNumDigitalPins = parseInt(device.getOpt('numDigitalPins'));
			let deviceNumAnalogInputs = parseInt(device.getOpt('numAnalogInputs'));
			let deviceAddress = device.getOpt('address');

			/* Filter: show only homeyduino devices */

			if (deviceType!="homeyduino") {
				this.log("Not showing device "+deviceName+" because type '"+deviceType+"' is not supported by this app.");
				continue;
			}

			// Should you want to make your own version of this app and the library, for example for a custom product
			// then please change the deviceType in both the Arduino library and your app to avoid conflicts with
			// this app and it's devices

			/* Get capabilities from device API */

			var deviceRc = false;

			let capabilities = [];
			for (var id in deviceApi) {
				let name = deviceApi[id].name;
				let type = deviceApi[id].type;
				if (type=="cap") {
					capabilities.push(name);
				}
				if (type=="rc") {
					deviceRc = true;
				}
			}

			/* Create deviceDescriptor */

			var deviceDescriptor = {
					"name": deviceName,
					"data": { /* nothing here */ },
					"settings": {
						"id": deviceName,
						"ip": deviceAddress,
						"polling": false
					},
					"class": deviceClass,
					"capabilities": capabilities,
					"api": deviceApi,
					"rc": deviceRc,
					"arch": deviceArch,
					"numDigitalPins": deviceNumDigitalPins,
					"numAnalogInputs": deviceNumAnalogInputs
			};

			/* Add device to list */

			deviceList.push(deviceDescriptor);
		}

        callback( null, deviceList );
    }

    onPair( socket ) {
	    super.onPair( socket );
        socket.on('pairManually', ( data, callback ) => {
			if (data.ip=="") return callback(Homey.__("pair.manual.ip_field_empty"), null);

			this.log("onPair: Polling...");
			Homey.app.discovery.poll(data.ip, (err, res) => {
				//this.log("onPair: Poll result ", err, res);
				if (err) {
					//First try to give back usefull information
					if (typeof err == 'object') {
						if (typeof err.message == 'string') {
							if (err.message=='ETIMEDOUT') {
								return callback(Homey.__('pair.manual.error_timeout'), null);
							} else {
								return callback(err.message, null);
							}
						}
					}
					//Then just return whatever we got...
					return callback( err, null);
				}
				//this.log("onPair: success");

				var device = res;
				let deviceName = device.getOpt('id');
				let deviceClass = device.getOpt('class');
				let deviceType = device.getOpt('type');
				let deviceApi = device.getOpt('api');
				let deviceArch = device.getOpt('arch');
				let deviceNumDigitalPins = parseInt(device.getOpt('numDigitalPins'));
				let deviceNumAnalogInputs = parseInt(device.getOpt('numAnalogInputs'));
				let deviceAddress = data.ip;

				/* Get capabilities from device API */

				var deviceRc = false;

				let capabilities = [];
				for (var id in deviceApi) {
					let name = deviceApi[id].name;
					let type = deviceApi[id].type;
					if (type=="cap") {
						capabilities.push(name);
					}
					if (type=="rc") {
						deviceRc = true;
					}
				}

				/* create deviceDescriptor */

				var deviceDescriptor = {
					"name": deviceName,
					"data": { /* nothing here */ },
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
				return callback( null, deviceDescriptor );
			});
        });
    }
}

module.exports = HomeyduinoDriver;
