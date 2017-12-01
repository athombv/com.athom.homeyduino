"use strict";

const ArduinoDiscovery = require('..').ArduinoDiscovery;
let discovery = new ArduinoDiscovery({
	debug: true,
	broadcastInterval: 5 * 1000
});

discovery
	.on('discover', device => {
		//console.log('New device:');
		console.log('* Identification:', device.getOpt('id'));
		console.log('* Type:', device.getOpt('type'));
		console.log('* Address:',device.getOpt('address')+':'+device.getOpt('port'));
		console.log('* Local webserver port: ', device.getOpt('localPort'));
		console.log('* Library version:',device.getOpt('version'));

		/*device.setLocalAddress("192.168.1.61");

		device.subscribe( (err, res) => {
			if ( err ) return console.log('* Could not subscribe:', err);
			console.log('* Subscribed to triggers.');
		});*/

	})
	.start();
	
function printStatus() {
  var devices = discovery.getDevices();
  console.log(' ');
  var i = 0;
  for (var dnr in devices) {
	var device = devices[dnr];
	console.log(i+". "+device.getOpt('id')+" - "+device.getOpt('lastSeen'));
	i++;
  }
  setTimeout(printStatus, 5*1000);
}
setTimeout(printStatus, 5*1000);
