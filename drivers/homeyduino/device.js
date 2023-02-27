/*
 * Project: Homeyduino
 * Author: Renze Nicolai <renze@rnplus.nl>
 * License: GPLv3
 *
 */

"use strict";

const Homey = require("homey");

class HomeyduinoDevice extends Homey.Device {

    constructor(...args) {
        super(...args);

        this.onArduinoEmit = this.onArduinoEmit.bind(this);
        this.onApiChange = this.onApiChange.bind(this);
        this.onMasterChange = this.onMasterChange.bind(this);
        this.onDeviceDebug = this.onDeviceDebug.bind(this);
        this.onNetworkChange = this.onNetworkChange.bind(this);
    }

    async onInit() {
        this.log('onInit device...');
        this.deviceName = this.getName();
        let settings = this.getSettings();

        this.log("typeof settings.id =", typeof settings.id);

        if ((typeof settings.id === "undefined") || (settings.id === "not-set-default-value")) {
            /* This code is here because older versions of this app stored the
             * device id in the device data and not in the device settings.
             * (it is only needed to let people "upgrade" from earlier pre-releases)
             */
            this.log("WARNING: DEVICE ID FETCHED USING OLD METHOD");
            let data = this.getData();
            if (typeof data.id === "undefined") {
                this.log("Device ID: not set. No fallback!");
                this.deviceId = "unknown";
            } else {
                this.log("Device ID: fallback to data value...");
                this.deviceId = data.id;

                this.log("(Adding ID to device settings!)");
                settings.id = data.id;
                this.setSettings(settings);
            }
        } else {
            this.deviceId = settings.id;
        }

        /*if ((typeof settings.id === "undefined")||(settings.id=="not-set-default-value")) {
            this.log("ERROR: DETECTED OLD HOMEYDUINO DEVICE ENTRY. PLEASE REMOVE AND ADD AGAIN!");
            return;
        }

        this.deviceId = settings.id;*/

        if (typeof settings.polling !== 'undefined') {
            this.polling = settings.polling;
        } else {
            this.polling = false;
        }

        if (typeof settings.ip !== 'undefined') {
            this.ipAddress = settings.ip;
        } else {
            this.ipAddress = '0.0.0.0';
        }

        this.trigger = {};
        this.trigger.debug = this.homey.flow.getDeviceTriggerCard("debug_trigger");
        this.trigger.number = this.homey.flow.getDeviceTriggerCard("number_trigger");
        this.trigger.string = this.homey.flow.getDeviceTriggerCard("string_trigger");
        this.trigger.boolean = this.homey.flow.getDeviceTriggerCard("boolean_trigger");
        this.trigger.void = this.homey.flow.getDeviceTriggerCard("void_trigger");
        this.trigger.rc_digital = this.homey.flow.getDeviceTriggerCard("rc_digital_trigger");
        this.trigger.rc_analog = this.homey.flow.getDeviceTriggerCard("rc_analog_trigger");

        this.available = false;

        this._actions = [];
        this._conditions = [];
        this._triggers = [];
        this._capabilities = [];

        this._rcDigitalOutputPins = [];
        this._rcDigitalInputPins = [];
        this._rcAnalogOutputPins = [];
        this._rcAnalogInputPins = [];

        this.listening = false;
        this.deviceInit();
    }


    onAdded() {
        //Do nothing.
    }

    onDeleted() {
        this.removeListeners();
    }

    available() {
        return this.getAvailable();
    }

    getActions() {
        let results = [];
        for (let action in this._actions) {
            results.push({"name": this._actions[action], "value": this._actions[action]});

        }
        return results;
    }

    getRcDigitalOutputs() {
        let results = [];
        for (let action in this._rcDigitalOutputPins) {
            results.push({
                "name": this._rcDigitalOutputPins[action].flowName,
                "value": this._rcDigitalOutputPins[action].name
            });
        }
        return results;
    }

    getRcAnalogOutputs() {
        let results = [];
        for (let action in this._rcAnalogOutputPins) {
            let range = 255; //Guess 8-bit
            if (typeof this._rcAnalogOutputPins[action].range !== 'undefined') {
                if (typeof this._rcAnalogOutputPins[action].range.ao !== 'undefined') {
                    range = this._rcAnalogOutputPins[action].range.ao;
                    this.log("Analog output range", this._rcAnalogOutputPins[action].name, range);
                } else {
                    this.log("Analog output range", this._rcAnalogOutputPins[action].name, 'NO AO');
                }
            } else {
                this.log("Analog output range", this._rcAnalogOutputPins[action].name, 'NO RANGE');
            }
            results.push({
                "name": this._rcAnalogOutputPins[action].flowName,
                "value": this._rcAnalogOutputPins[action].name,
                "range": range
            });
        }
        return results;
    }

    getRcDigitalInputs() {
        let results = [];
        for (let action in this._rcDigitalInputPins) {
            results.push({
                "name": this._rcDigitalInputPins[action].flowName,
                "value": this._rcDigitalInputPins[action].name
            });
        }
        return results;
    }

    getRcAnalogInputs() {
        let results = [];
        for (let action in this._rcAnalogInputPins) {
            let range = 1023; //Guess 10-bit
            if (typeof this._rcAnalogInputPins[action].range !== 'undefined') {
                if (typeof this._rcAnalogInputPins[action].range.ai !== 'undefined') {
                    range = this._rcAnalogInputPins[action].range.ai;
                    this.log("Analog Input range", this._rcAnalogInputPins[action].name, range);
                } else {
                    this.log("Analog Input range", this._rcAnalogInputPins[action].name, 'NO AI');
                }
            } else {
                this.log("Analog Input range", this._rcAnalogInputPins[action].name, 'NO RANGE');
            }
            results.push({
                "name": this._rcAnalogInputPins[action].flowName,
                "value": this._rcAnalogInputPins[action].name,
                "range": range
            });
        }
        return results;
    }

    getConditions() {
        let results = [];
        for (let condition in this._conditions) {
            results.push({"name": this._conditions[condition], "value": this._conditions[condition]});

        }
        return results;
    }

    getTriggers() {
        let results = [];
        for (let trigger in this._triggers) {
            results.push({"name": this._triggers[trigger], "value": this._triggers[trigger]});

        }
        return results;
    }

    onApiChange(info) {
        this._actions = []; //Clear actions
        this._conditions = []; //Clear conditions
        this._triggers = []; //Clear triggers
        this._capabilities = []; //Clear capabilities
        this.log('Info: device API changed');
        for (let callId in info.api) {
            let callName = info.api[callId].name;
            let callType = info.api[callId].type;
            if (callType === 'act') {
                this._actions.push(callName);
                this.log('Info: added action', callName);
            } else if (callType === 'con') {
                this._conditions.push(callName);
                this.log('Info: added condition', callName);
            } else if (callType === 'cap') {
                this._capabilities.push(callName);
                this.log('Info: added capability', callName);
                //Note: this does NOT update the device entry.
                //User needs to remove the device and pair again to update capabilities!
                //It DOES update the listeners
                this.registerCapabilityListener(callName, this.capability.bind(this, callName));
                this.updateCapabilityValue(callName);
            } else if (callType === 'rc') {
                this.log('Info: detected RC interface', callName);
            } else {
                this.log('Warning: ignored API', callName, 'because type', callType, 'is unknown.');
            }
        }
    }

    getCapabilities() {
        return this._capabilities;
    }

    updateCapabilityValue(capability) {
        this.device.query(capability, 'cap', '', true).then((value) => {
            if (typeof value !== "undefined") {
                this.log("Set initial capabilty value of", capability, "to", typeof value, value);
                this.setCapabilityValue(capability, value).catch((err) => {
                    this.log("Could not set initial capability value:", err);
                });
            } else {
                this.log("No initial value available for capability", capability);
            }
        }).catch((err) => {
            this.log('Get capability value returned error:', err);
        });
    }

    async deviceUpdateLocalAddress(address) {
        let cloud = this.homey.cloud;
        let ipAddressLocal = await cloud.getLocalAddress();
        this.device.setLocalAddress(ipAddressLocal.split(':')[0]);
        return address(null, ipAddressLocal.split(':')[0]);
    }

    removeListeners() {
        if (this.listening) {
            this.listening = false;
            this.device.removeListener('emit', this.onArduinoEmit);
            this.device.removeListener('api', this.onApiChange);
            this.device.removeListener('master', this.onMasterChange);
            this.device.removeListener('debug', this.onDeviceDebug);
            this.device.removeListener('network', this.onNetworkChange);
            this.log("Removed event listeners.");
        } else {
            this.log("Not listening.");
        }
    }

    onNetworkChange(info) {
        this.ipAddress = info.address;
        let settings = this.getSettings();
        settings.ip = this.ipAddress;
        this.setSettings(settings);
    }

    rcConfigure() {
        let settings = this.getSettings();
        if (typeof settings.rc === "undefined") return;
        this.log("Configuring RC parameters...");
        this.log(" * Board:", settings.rc.board.name);

        this._rcDigitalOutputPins = [];
        this._rcDigitalInputPins = [];
        this._rcAnalogOutputPins = [];
        this._rcAnalogInputPins = [];

        for (let key in settings.rc.pins) {
            let pin = settings.rc.pins[key];
            this.log(" * Pin", pin.name, "is identified as", pin.flowName, "and configured as", pin.mode);
            if ((pin.mode === "di") || (pin.mode === "dip") || (pin.mode === "dit") || (pin.mode === "ditp")) {
                this._rcDigitalInputPins.push(pin);
            } else if (pin.mode === "do") {
                this._rcDigitalOutputPins.push(pin);
            } else if (pin.mode === "ao") {
                this._rcAnalogOutputPins.push(pin);
            } else if ((pin.mode === "ai") || (pin.mode === "aip") || (pin.mode === "ait") || (pin.mode === "aitp")) {
                this._rcAnalogInputPins.push(pin);
            }
        }

        this.rcModeSet(settings.rc.pins);
    }

    rcModeSet(pins, res = null) {
        if (pins.length < 1) {
            this.log("All RC pins have been configured succesfully!");
            return;
        }

        let pin = pins.shift();
        let cfg = pin.name + "=" + pin.mode;
        let rcModeSetNext = this.rcModeSet.bind(this, pins);

        this.log("Configuring RC pin '" + pin.name + "' to '" + pin.mode + "'...");

        this.device.query('mode', 'rc', cfg)
            .then(rcModeSetNext)
            .catch((err) => {
                this.log('Mode set returned error:', err);
            });
    }

    deviceInit() {
        if (this.listening) {
            this.removeListeners(); //First remove the listeners
        }
        this.log("Searching for Arduino device " + this.deviceId + "...");
        this.device = this.homey.app.discovery.getDevice(this.deviceId);

        if (this.device instanceof Error) {
            this.log("Device ", this.deviceId, " is not available.");
            this.setUnavailable("Offline");
            this.available = false;

            if (this.polling) {
                this.log("Polling is enabled for device", this.deviceId, " at IP ", this.ipAddress);
                this.homey.app.discovery.poll(this.ipAddress, (err, res) => {
                    if (err) {
                        this.log("Poll returned error:", err);
                    } else {
                        this.log("Poll success!");
                    }
                });
            }

        } else {
            this.deviceUpdateLocalAddress((err, res) => {
                if (err) this.log("Could not get local address: ", err);
                this.log("Device ", this.deviceId, " is available.");
                this.setAvailable();
                this.available = true;
                this.device.setOpt('paired', true);

                this.device.subscribe().then((res) => {
                    this.log('* Subscribed to triggers: ', res);
                }).catch((err) => {
                    this.log('* Could not subscribe:', err);
                });

                //Fill autocompletes
                this.onApiChange({"device": this.device, "api": this.device.getOpt('api')});

                //Add listeners
                this.device.on('emit', this.onArduinoEmit);
                this.device.on('api', this.onApiChange);
                this.device.on('master', this.onMasterChange);
                this.device.on('debug', this.onDeviceDebug);
                this.device.on('network', this.onNetworkChange);
                this.listening = true;
            });
            this.rcConfigure();
        }
    }

    onDeviceDebug(text) {
        if (typeof text === "object") {
            if (typeof text.join === "function") {
                text = text.join(" ");
            } else {
                let obj = text;
                text = "";
                let elem = "";
                let i = 0;
                while (true) {
                    elem = obj[i];
                    i++;
                    if (typeof elem === "string") {
                        text = text + elem + " ";
                    } else {
                        break;
                    }
                }
            }
        }
        this.log('[njs-device]', text);
    }

    onArduinoEmit(info) {
        //this.log("onEmit(",info.name,info.type,info.argument,")");
        if (info.emType === 'trg') {
            this.log("Trigger emit received:", info.name, info.type, info.argument);
            this.onTriggered(info);
            this.onRcEmit(info);
        } else if (info.emType === 'rc') {
            this.log("RC emit received:", info.name, info.type, info.argument);
            this.onRcEmit(info);
        } else if (info.emType === 'cap') {
            this.log("Capability emit received:", info.name, info.type, info.argument);
            this.setCapabilityValue(info.name, info.argument).catch((err) => {
                this.log("Could not set capability value:", err);
            });
        } else {
            this.log("Unknown emit received:", info.emType, "[", info.name, info.type, info.argument, "]");
        }
    }

    onTriggered(info) {
        //this.log("INFO", util.inspect(info, {depth: null}));
        if (!this._triggers.includes(info.name)) this._triggers.push(info.name);

        this.trigger.debug.trigger(this, {
            "trigger": info.name,
            "number": Number(info.argument),
            "string": String(info.argument),
            "boolean": Boolean(info.argument),
            "type": info.type
        }, {"name": info.name}).then((result) => {
            //this.log("Debug trigger result ",result);
        }).catch(this.error);
        if (info.type === 'Boolean') {
            this.trigger.boolean.trigger(this, {"value": info.argument}, {"name": info.name}).then((result) => {
                //this.log("Boolean trigger result ",result);
            }).catch(this.error);
        } else if (info.type === 'Number') {
            this.trigger.number.trigger(this, {"value": info.argument}, {"name": info.name}).then((result) => {
                //this.log("Number trigger result ",result);
            }).catch(this.error);
        } else if (info.type === 'String') {
            this.log("String trigger:", info.name, info.argument);
            this.trigger.string.trigger(this, {"value": info.argument}, {"name": info.name}).then((result) => {
                //this.log("String trigger result ",result);
            }).catch(this.error);
        } else if (info.type === 'null') {
            this.trigger.void.trigger(this, {"value": info.argument}, {"name": info.name}).then((result) => {
                //this.log("Void trigger result ",result);
            }).catch(this.error);
        }
    }

    rcAnalogInputMap(name, input) {
        let output = input;

        let pin = null;

        for (let key in this._rcAnalogInputPins) {
            if (this._rcAnalogInputPins[key].name === name) {
                pin = this._rcAnalogInputPins[key];
                break;
            }
        }

        if (pin === null) {
            this.log("rcAnalogInputMap(", name, ") error: unknown pin");
            return output;
        }

        let range = 1023; //Guess 10-bit
        if (typeof pin.range === 'undefined') {
            this.log("rcAnalogInputMap(", name, ") error: no range defined");
        } else if (typeof pin.range.ai === 'undefined') {
            this.log("rcAnalogInputMap(", name, ") error: no input range defined");
        } else {
            range = pin.range.ai;
            this.log("rcAnalogInputMap(", name, ") range:", range);
        }

        output = output / range;
        output = +output.toFixed(2);

        return output;
    }

    rcAnalogInputGetFlownameForRealName(name) {
        let pin = null;
        for (let key in this._rcAnalogInputPins) {
            if (this._rcAnalogInputPins[key].name === name) {
                pin = this._rcAnalogInputPins[key];
                break;
            }
        }
        if (pin === null) {
            this.log("rcGetAnalogInputFlownameForRealName: unknown pin");
            return 'invalid_pin';
        }
        return pin.flowName;
    }

    rcDigitalInputGetFlownameForRealName(name) {
        let pin = null;
        for (let key in this._rcDigitalInputPins) {
            if (this._rcDigitalInputPins[key].name === name) {
                pin = this._rcDigitalInputPins[key];
                break;
            }
        }
        if (pin === null) {
            this.log("rcGetDigitalInputFlownameForRealName: unknown pin");
            return 'invalid_pin';
        }
        return pin.flowName;
    }

    onRcEmit(info) {
        if (info.type === 'Boolean') {
            this.log("onRcEmit: digital input", info.argument, info.name);
            this.trigger.rc_digital.trigger(this, {"value": info.argument}, {"pin": info.name}).then((result) => {
            }).catch(this.error);
        } else if (info.type === 'Number') {
            this.log("onRcEmit: analog input", info.argument, info.name);
            let mappedValue = this.rcAnalogInputMap(info.name, info.argument);
            this.trigger.rc_analog.trigger(this, {"value": mappedValue}, {"pin": info.name}).then((result) => {
            }).catch(this.error);
        } else {
            this.log("onRcEmit: unsupported type", info.type, "ignored.");
        }
    }


    async onSettings({oldSettings, newSettings, changedKeysArr}) {
        let reinit = false;
        if (oldSettings.id !== newSettings.id) {
            this.log("Device ID changed in settings. Calling deviceInit with new device " + newSettings.id + "...");
            this.deviceId = newSettings.id;
            reinit = true;
        }

        if (oldSettings.polling !== newSettings.polling) {
            this.log('Polling changed to', newSettings.polling);
            this.polling = newSettings.polling;
            if (!(this.device instanceof Error)) this.device.setOpt('polling', this.polling);
        }

        if (oldSettings.ip !== newSettings.ip) {
            this.log('IP address changed to', newSettings.ip);
            this.ipAddress = newSettings.ip;
        }

        if (typeof newSettings.rc !== 'undefined') {
            if (typeof oldSettings.rc !== 'undefined') {
                if (newSettings.rc !== oldSettings.rc) {
                    reinit = true;
                }
            } else {
                reinit = true;
            }
        }

        if (reinit) {
            this.deviceInit();
        }

    }

    action(args) {
        try {
            let value = '';

            if (typeof args.value !== 'undefined') {
                if (typeof args.value === 'string') {
                    value = args.value;
                } else {
                    value = args.value.toString();
                }
            } else if (typeof args.droptoken !== 'undefined') {
                if (typeof args.droptoken === 'boolean') {
                    if (args.droptoken) { //Convert boolean to string
                        value = '1';
                    } else {
                        value = '0';
                    }
                } else {
                    this.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
                }
            }

            return this.device.query(args.action.value, 'act', value).then((res) => {
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('Command returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing action', e);
            return Promise.reject('Exception while executing action');
        }
    }

    rcDigitalAction(mode, args) {
        try {
            let pin = args.pin.value;
            let state = false;
            if (mode === 'token') {
                state = args.droptoken;
            } else if (mode === 'on') {
                state = true;
            }

            if (state) {
                state = 1;
            } else {
                state = 0;
            }

            this.log("rcDigitalAction", pin, state);

            return this.device.query('dwrite', 'rc', pin + '=' + state).then((res) => {
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('RC digital returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing RC digital', e);
            return Promise.reject('Exception while executing RC digital');
        }
    }

    rcAnalogAction(args) {
        try {
            let pin = args.pin.value;
            let value = args.value.toString();

            if (args.pin.range !== null) {
                value = value * args.pin.range; //Map range 0.00 - 1.00 to Arduino range
            } else {
                this.log("rcAnalogAction", args, "NO RANGE");
            }

            value = Math.round(value); //Round to integer

            this.log("rcAnalogAction", pin, value);

            return this.device.query('awrite', 'rc', pin + '=' + value).then((res) => {
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('RC analog returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing RC analog', e);
            return Promise.reject('Exception while executing RC analog');
        }
    }

    condition(args) {
        try {
            let value = '';

            if (typeof args.value !== 'undefined') {
                if (typeof args.value === 'string') {
                    value = args.value;
                } else {
                    value = args.value.toString();
                }
            } else if (typeof args.droptoken !== 'undefined') {
                if (typeof args.droptoken === 'boolean') {
                    if (args.droptoken) { //Convert boolean to string
                        value = '1';
                    } else {
                        value = '0';
                    }
                } else {
                    this.log("Non-boolean droptoken ignored!", args.droptoken, typeof args.droptoken);
                }
            }

            return this.device.query(args.condition.value, 'con', value).then((res) => {
                //this.log('Condition returned:',res);
                //this.log('typeof result',typeof res);
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('Condition returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing condition', e);
            return Promise.reject('Exception while executing condition');
        }
    }

    rcDigitalCondition(args) {
        try {
            let pin = args.pin.value;
            return this.device.query('dread', 'rc', pin).then((res) => {
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('rcDigitalCondition returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing rcDigitalCondition', e);
            return Promise.reject('Exception while executing rcDigitalCondition');
        }
    }

    rcAnalogCondition(args, mode) {
        try {
            let pin = args.pin.value;
            let compareTo = args.value.toString();

            if (args.pin.range !== null) {
                compareTo = compareTo * args.pin.range; //Map range 0.00 - 1.00 to Arduino range
            } else {
                this.log("rcAnalogCondition", args, "NO RANGE");
            }

            this.log("rcAnalogCondition", pin, compareTo);

            return this.device.query('aread', 'rc', pin).then((res) => {
                this.log("rcAnaloCondition RESULT ", res, compareTo);
                if (mode) {
                    //Equals
                    if (res === compareTo) return Promise.resolve(true);
                    return Promise.resolve(false);
                } else {
                    //Greater than
                    if (res > compareTo) return Promise.resolve(true);
                    return Promise.resolve(false);
                }
            }).catch((err) => {
                this.log('rcAnalogCondition returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing rcAnalogCondition', e);
            return Promise.reject('Exception while executing rcAnalogCondition');
        }
    }

    capability(name, value, opts) {
        this.log("Capability", name, value, opts);
        try {

            if (typeof value === 'string') {
                //Nothing to do
            } else if (typeof value === 'boolean') {
                if (value) {
                    value = '1';
                } else {
                    value = '0';
                }
            } else {
                value = value.toString();
            }

            this.log("Processed value:", value);

            return this.device.query(name, 'cap', value).then((res) => {
                this.log('Capability returned:', res);
                this.log('typeof result', typeof res);
                return Promise.resolve(res);
            }).catch((err) => {
                this.log('Capability returned error:', err);
                return Promise.reject(err);
            });
        } catch (e) {
            this.log('Exception while executing capability', e);
            return Promise.reject('Exception while executing capability');
        }
    }

    onMasterChange(info) {
        if ((info.master.host === this.device.getOpt('localAddress')) && (info.master.port === this.device.getOpt('localPort'))) {
            this.log("onMasterChange: subscribed");
            this.device.setOpt('subscribed', true);
        } else if (this.device.getOpt('subscribed')) {
            this.log("onMasterChange: re-subscribing...");
            this.device.subscribe().then((res) => {
                this.log('* Subscribed to triggers: ', res);
            }).catch((err) => {
                this.log('* Could not subscribe:', err);
            });
        } else {
            this.log("onMasterChange: not subscribed");
        }

        this.rcConfigure(); //Reconfigure pins whenever master changes
    }


    onTriggerAutocomplete(query, args) {
        let results = args.device.getTriggers();

        results = results.filter(result => {
            return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });

        if (!results.includes(query)) results.push({"name": query, "value": query});

        return Promise.resolve(results);
    }

    onRcDigitalTriggerAutocomplete(query, args) {
        let results = args.device.getRcDigitalInputs();

        results = results.filter(result => {
            return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });

        return Promise.resolve(results);
    }

    onRcAnalogTriggerAutocomplete(query, args) {
        let results = args.device.getRcAnalogInputs();

        results = results.filter(result => {
            return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });

        return Promise.resolve(results);
    }
}

module.exports = HomeyduinoDevice;
