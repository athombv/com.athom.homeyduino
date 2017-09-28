/*
 * Project: Homeyduino
 * Version: 1.0.0
 * Author: Renze Nicolai <renze@rnplus.nl>
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
			debug: false,
			broadcastInterval: 10 * 1000 //Every 10 seconds
		});
		
		this.discovery.on('discover', device => {
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
		}).start();
		
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
	}
	
	onAction( args, state ) {
		if (typeof args.device.action !== 'function') {
			return Promise.reject("Action is not a function.");
		}
		return args.device.action(args).then( (res) => {
			console.log("onAction ok",res);
			console.log("onAction typeof",typeof res);
			return Promise.resolve(res);
		}).catch( (err) => {
			console.log("onAction error",err);
			return Promise.reject(err);
		});
	}
	
	onCondition( args, state ) {
		if (typeof args.device.condition !== 'function') {
			return Promise.reject("Condition is not a function.");
		}
		return args.device.condition(args);		
	}
	
	onActionAutocomplete(query, args) {
		//console.log('actionautocomplete query',util.inspect(query, {depth: null}));
		//console.log('actionautocomplete args',util.inspect(args, {depth: null}));
		let results = args.device.getActions();
		
		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});
		return Promise.resolve( results );
	}
	
	onConditionAutocomplete(query, args) {
		let results = args.device.getConditions();
		
		results = results.filter( result => {
			return result.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
		});
		return Promise.resolve( results );
	}
}

module.exports = HomeyduinoApp;
