"use strict";

const ArduinoDiscovery = require('..').ArduinoDiscovery;
let discovery = new ArduinoDiscovery({
	debug: true,
	broadcastInterval: 5 * 1000
});

discovery
	.on('discover', device => {
		console.log('New device:');
		console.log('* Identification:', device.getOpt('id'));
		console.log('* Type:', device.getOpt('type'));
		console.log('* Address:',device.getOpt('address')+':'+device.getOpt('port'));
		console.log('* Local webserver port: ', device.getOpt('localPort'));

		device.setLocalAddress("192.168.1.61");

		device.subscribe( (err, res) => {
			if ( err ) return console.log('* Could not subscribe:', err);
			console.log('* Subscribed to triggers.');
		});

		console.log("QUERY");

		device.query('test', 'act', '').then( (res) => {
			console.log('* Test command returned:',res);
		}).catch( (err) => {
			console.log('* Test command error:',err);
		});

		/*device.query('doesnotexist', '5', (err, res) => {
			if ( err ) return console.log('* Command that does not exist returned error:', err);
			console.log('* Command that does not exist returned:',res);
		});*/
	})
	.start();


	/*
	 * let cloud = Homey.ManagerCloud;
		cloud.getLocalAddress( (err, localAddress) => {
			if ( err ) return callback ( err, null );*/
