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
				//this.log('in list:',device.deviceName,device.getData().id);
				if (device.getData().id == arduinoDevice.getOpt('id')) {
					found = true;
					//this.log(' - Device has been paired!');
					if (device.available) {
						this.log(' - Device already available?!');
					} else {
						//this.log(' - Calling deviceInit...');
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
			
			/* Collect device information */
			
			var device = arduinoDevices[device];
			let deviceName = device.getOpt('id');
			let deviceClass = device.getOpt('class');
			let deviceType = device.getOpt('type');
			let deviceApi = device.getOpt('api');
			
			/* Filter: show only homeyduino devices */
			
			if (deviceType!="homeyduino") {
				this.log("Not showing device "+deviceName+" because type '"+deviceType+"' is not supported by this app.");
				continue;
			}
						
			/* Get capabilities from device API */
			
			let capabilities = [];
			for (var id in deviceApi) {
				let name = deviceApi[id]['name'];
				let type = deviceApi[id]['type'];
				if (type=="cap") {
					capabilities.push(name);
				}
			}

			/* Create deviceDescriptor */
			
			var deviceDescriptor = {
					"name": deviceName,
					"data": { "id": deviceName, "type": deviceType, "class": deviceClass, "api": deviceApi },
					"class": deviceClass,
					"capabilities": capabilities
			};
			
			/* Add device to list */
			
			deviceList.push(deviceDescriptor);
		}
        callback( null, deviceList );
    }
}

module.exports = HomeyduinoDriver;
