/*
 * Project: Homeyduino
 * Author: Renze Nicolai <renze@rnplus.nl>
 * License: GPLv3
 *
 */

"use strict";

const Homey = require("homey");
const Arduino = require("homey-arduino");
const util = require('util');

class HomeyduinoApp extends Homey.App {

	onInit() {
		//Start discovery broadcast
		this.discovery = new Arduino.ArduinoDiscovery({
			debugEmit: true,
			broadcastInterval: 15 * 1000 //Every 15 seconds
		});

		this.discovery.on('debug', this.onDiscoveryDebug.bind(this));

		this.discovery.on('discover', device => {}).start();

		let numberAction = new Homey.FlowCardAction("number_action")
			.register()
			.registerRunListener(this.onAction.bind(this))
			.getArgument('action')
			.registerAutocompleteListener(this.onActionAutocomplete.bind(this));
		let textAction = new Homey.FlowCardAction("text_action")
			.register()
			.registerRunListener(this.onAction.bind(this))
			.getArgument('action')
			.registerAutocompleteListener(this.onActionAutocomplete.bind(this));
		let booleanAction = new Homey.FlowCardAction("boolean_action")
			.register()
			.registerRunListener(this.onAction.bind(this))
			.getArgument('action')
			.registerAutocompleteListener(this.onActionAutocomplete.bind(this));
		let voidAction = new Homey.FlowCardAction("void_action")
			.register()
			.registerRunListener(this.onAction.bind(this))
			.getArgument('action')
			.registerAutocompleteListener(this.onActionAutocomplete.bind(this));
		let rcDigitalAction = new Homey.FlowCardAction("rc_digital_action")
			.register()
			.registerRunListener(this.onRcDigitalAction.bind(this,'token'))
			.getArgument('pin')
			.registerAutocompleteListener(this.onRcDigitalActionAutocomplete.bind(this));
			let rcDigitalActionOn = new Homey.FlowCardAction("rc_digital_action_on")
				.register()
				.registerRunListener(this.onRcDigitalAction.bind(this,'on'))
				.getArgument('pin')
				.registerAutocompleteListener(this.onRcDigitalActionAutocomplete.bind(this));
			let rcDigitalActionOff = new Homey.FlowCardAction("rc_digital_action_off")
				.register()
				.registerRunListener(this.onRcDigitalAction.bind(this,'off'))
				.getArgument('pin')
				.registerAutocompleteListener(this.onRcDigitalActionAutocomplete.bind(this));
			let rcAnalogAction = new Homey.FlowCardAction("rc_analog_action")
				.register()
				.registerRunListener(this.onRcAnalogAction.bind(this))
				.getArgument('pin')
				.registerAutocompleteListener(this.onRcAnalogActionAutocomplete.bind(this));

		let numberCondition = new Homey.FlowCardCondition("number_condition")
			.register()
			.registerRunListener(this.onCondition.bind(this))
			.getArgument('condition')
			.registerAutocompleteListener(this.onConditionAutocomplete.bind(this));
		let textCondition = new Homey.FlowCardCondition("text_condition")
			.register()
			.registerRunListener(this.onCondition.bind(this))
			.getArgument('condition')
			.registerAutocompleteListener(this.onConditionAutocomplete.bind(this));
		let booleanCondition = new Homey.FlowCardCondition("boolean_condition")
			.register()
			.registerRunListener(this.onCondition.bind(this))
			.getArgument('condition')
			.registerAutocompleteListener(this.onConditionAutocomplete.bind(this));
		let voidCondition = new Homey.FlowCardCondition("void_condition")
			.register()
			.registerRunListener(this.onCondition.bind(this))
			.getArgument('condition')
			.registerAutocompleteListener(this.onConditionAutocomplete.bind(this));
		let rcDigitalCondition = new Homey.FlowCardCondition("rc_digital_condition")
			.register()
			.registerRunListener(this.onRcDigitalCondition.bind(this))
			.getArgument('pin')
			.registerAutocompleteListener(this.onRcDigitalConditionAutocomplete.bind(this));
		let rcAnalogGreaterCondition = new Homey.FlowCardCondition("rc_analog_greater_condition")
			.register()
			.registerRunListener(this.onRcAnalogCondition.bind(this,false))
			.getArgument('pin')
			.registerAutocompleteListener(this.onRcAnalogConditionAutocomplete.bind(this));
		let rcAnalogEqualsCondition = new Homey.FlowCardCondition("rc_analog_equals_condition")
			.register()
			.registerRunListener(this.onRcAnalogCondition.bind(this,true))
			.getArgument('pin')
			.registerAutocompleteListener(this.onRcAnalogConditionAutocomplete.bind(this));
	}

	onDiscoveryDebug(text) {
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
		this.log('[njs-discovery]',text);
	}

	onAction( args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.action(args).then( (res) => {
			this.log("onAction ok",res);
			this.log("onAction typeof",typeof res);
			return Promise.resolve(res);
		}).catch( (err) => {
			this.log("onAction error",err);
			return Promise.reject(err);
		});
	}

	onRcDigitalAction( mode, args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.rcDigitalAction(mode, args).then( (res) => {
			this.log("onRcDigitalAction ok",res);
			this.log("onRcDigitalAction typeof",typeof res);
			return Promise.resolve(res);
		}).catch( (err) => {
			this.log("onRcDigitalAction error",err);
			return Promise.reject(err);
		});
	}

	onRcAnalogAction( args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.rcAnalogAction(args).then( (res) => {
			this.log("onRcAnalogAction ok",res);
			this.log("onRcAnalogAction typeof",typeof res);
			return Promise.resolve(res);
		}).catch( (err) => {
			this.log("onRcAnalogAction error",err);
			return Promise.reject(err);
		});
	}

	onCondition( args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.condition(args);
	}

	onRcDigitalCondition( args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.rcDigitalCondition(args);
	}

	onRcAnalogCondition( mode, args, state ) {
		if (typeof args.device === 'undefined') {
			return Promise.reject("Device not available");
		}
		return args.device.rcAnalogCondition(args, mode);
	}

	onActionAutocomplete(query, args) {
		let results = args.device.getActions();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onRcDigitalActionAutocomplete(query, args) {
		let results = args.device.getRcDigitalOutputs();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onRcAnalogActionAutocomplete(query, args) {
		let results = args.device.getRcAnalogOutputs();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onConditionAutocomplete(query, args) {
		let results = args.device.getConditions();

		//if (!results.includes(query)) results.push({"name":query});

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onRcDigitalConditionAutocomplete(query, args) {
		let results = args.device.getRcDigitalInputs();
		results = results.concat(args.device.getRcDigitalOutputs()); //All digital outputs can be read back as well

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}

	onRcAnalogConditionAutocomplete(query, args) {
		let results = args.device.getRcAnalogInputs();

		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});

		return Promise.resolve( results );
	}
}

module.exports = HomeyduinoApp;
