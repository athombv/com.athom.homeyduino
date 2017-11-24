"use strict";

const ArduinoDiscovery = require('..').ArduinoDiscovery;
let discovery = new ArduinoDiscovery({
	debug: true,
	broadcastInterval: 5 * 1000
});

discovery.on('discover', device => {
		console.log('New device:');
		console.log('* ID:', device.getOpt('id'));
		console.log('* Address:',device.getOpt('address')+':'+device.getOpt('port'));
		console.log('* Local webserver port: ', device.getOpt('localPort'));

		console.log('* API:');
		let api = device.getOpt('api');
		for (var call in api) {
			var rettype = api[call];
			console.log(' - '+call+' ('+rettype+')');
		}
	})
	.start();
