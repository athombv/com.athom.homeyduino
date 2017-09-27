"use strict";

const Homey = require('homey');
const Arduino = require("homey-arduino");
const util = require('util');
const events = require('events');

class HomeyduinoDriver extends Homey.Driver {
	
	onInit() {		
		Homey.app.discovery.on('discover', (arduinoDevice) => {
			console.log("onDiscoverDevice",arduinoDevice.getOpt('id'));
			let devices = this.getDevices();
			
			var found = false;
			for (var deviceNo in devices) {
				var device = devices[deviceNo];
				//console.log("DEVICE:",util.inspect(device, {depth: null}));
				console.log('in list:',device.deviceName);
				if (device.deviceName == arduinoDevice.getOpt('id')) {
					found = true;
					console.log(' - Device has been paired!');
					if (device.available) {
						console.log(' - Device already available?!');
					} else {
						console.log(' - Calling deviceInit...');
						device.deviceInit( arduinoDevice );
					}
					break;
				}
			}
			
			if (!found) {
				console.log(' - Device has not been paired, ignoring.');
			}
		});
		
	}
	
	onPairListDevices( data, callback ) {
        let deviceList = [];
		let arduinoDevices = Homey.app.discovery.getDevices();
		for (var device in arduinoDevices) {
			var device = arduinoDevices[device];
			var deviceDescriptor = {
					"name": device.getOpt('id'),
					"data": { "id": device.getOpt('id') }
			};
			deviceList.push(deviceDescriptor);
		}
        callback( null, deviceList );
    }
}

module.exports = HomeyduinoDriver;
