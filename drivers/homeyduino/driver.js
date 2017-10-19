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
				var device = devices[deviceNo];
				//this.log("DEVICE:",util.inspect(device, {depth: 1}));
				this.log('in list:',device.deviceName,device.getData().id);
				if (device.getData().id == arduinoDevice.getOpt('id')) {
					found = true;
					this.log(' - Device has been paired!');
					if (device.available) {
						this.log(' - Device already available?!');
					} else {
						this.log(' - Calling deviceInit...');
						device.deviceInit( arduinoDevice );
					}
					break;
				}
			}
			
			if (!found) {
				this.log(' - Device has not been paired, ignoring.');
			}
		});
		
	}
	
	onPairListDevices( data, callback ) {
        let deviceList = [];
		let arduinoDevices = Homey.app.discovery.getDevices();
		for (var device in arduinoDevices) {
			var device = arduinoDevices[device];
			
			/*Get capabilities before pairing */
			let capabilities = [];
			let api = device.getOpt('api');
			for (var id in api) {
				let name = api[id]['name'];
				let type = api[id]['type'];
				if (type=="cap") {
					capabilities.push(name);
				}
			}
			/*--------------------------------*/
			
			var deviceDescriptor = {
					"name": device.getOpt('id'),
					"data": { "id": device.getOpt('id') },
					"capabilities": capabilities
			};
			deviceList.push(deviceDescriptor);
		}
        callback( null, deviceList );
    }
}

module.exports = HomeyduinoDriver;
