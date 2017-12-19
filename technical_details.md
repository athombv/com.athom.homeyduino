# Technical details

This document describes how the Homeyduino app for Homey functions internally. If you just want to use the software then this document is not for you, instead you should look at the other resources first.

New to Homeyduino? Start with the [usage & getting started guide](https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md).

Information on the Homeyduino Arduino API can be found [here](https://github.com/athombv/homey-arduino-library/blob/master/docs/api.md).

Information on the Homeyduino protocol can be found [here](https://github.com/athombv/homey-arduino-library/blob/master/docs/protocol.md).

## 1. The homey-arduino Node.js module
The homey-arduino Node.js module included with the Homeyduino app is responsible for the discovery and management of Homeyduino devices on the network. It only implements the communication layer and does not know about the Homey specific elements.

The Node.js module consists of two classes which both extend ```eventEmitter```: ```ArduinoDiscovery``` and ```ArduinoDevice```.

The ```ArduinoDiscovery``` class is responsible for device discovery and management, while the ```ArduinoDevice``` class represents an instance of a device. The ```ArduinoDevice``` class is responsible for providing an endpoint for the device to send events to and for sending commands to the device.

## 2. The arduinoDiscovery class
### constructor
Your app must create only one instance of ```ArduinoDiscovery```.

When creating the class a set of configuration parameters may be provided.

```js
const Arduino = require("homey-arduino");

let discovery = new Arduino.ArduinoDiscovery({
	debug: true,
	broadcastInterval: 5 * 1000
});
```

#### Configuration parameters

| Key              | Type    | Description                                                                            | Default value |
|------------------|---------|----------------------------------------------------------------------------------------|---------------|
|debug             | Boolean | Enable printing of debug messages to the console                                       | false         |
|debugEmit         | Boolean | Enable emitting of debug messages as event                                             | false         |
|broadcastInterval | Number  | Interval between each UDP discovery broadcast (in milliseconds)                        | 30000         |
|timeoutInterval   | Number  | Time after which devices get removed if they are no longer available (in milliseconds) | 60000         |

### start
Run the ```start()``` function to enable device discovery

### stop
Run the ```stop()``` function to stop device discovery

### getDevices
The ```getDevices()``` function returns a list of ```ArduinoDevice``` instances, containing all available discovered devices.

### getDevice
The ```getDevice(<name>)``` function returns the ```ArduinoDevice``` instance for the provided device ```name```. If the requested device does not exist an "invalid_arduino_device" ```error``` will be returned.

### poll
The ```poll(<ip>, <callback>)``` function forces polling of a single device at the provided IP address over TCP. The callback provided to this function will be called with either an error or an ```ArduinoDevice``` instance for the polled device.

The poll function is ment to be used as alternative for the automatic UDP discovery method, to allow users to manually add a device on networks where UDP broadcasts are not available.

## 3. The ArduinoDevice class

### constructor
Instances of the ```ArduinoDevice``` class are to be created by the ```arduinoDiscovery``` class. Manual creation of ```ArduinoDevice``` instances is not supported.

### update
The ```update(<opts>)``` function allows for updating the internal device state of an existing device instance. this function is to be called by the ```arduinoDiscovery``` class. Manually calling this function is not supported.

### libVersion
The ```libVersion``` function returns the version of the Homey Arduino library used on the device.

### hasRc
Returns a boolean value: true when the device supports the remote control extension of Homeyduino.

### executeRequest
The function ```executeRequest(<path>, <body>, <get>)``` sends a raw HTTP request to a Homeyduino device. Parameters are:

| Parameter | Function                          | Default value   |
|-----------|-----------------------------------|-----------------|
| path      | Endpoint on the device            | not set         |
| body      | Request body or get parameters    | not set         |
| get       | Boolean: true = GET, false = POST | false           |

```Deprecation warning: This function will be removed at a later date```

### Query
The function ```query(<name>, <type>, <parameter>, <get>)``` queries a Homeyduino device. Parameters are:

| Parameter | Function                                    | Default value   |
|-----------|---------------------------------------------|-----------------|
| name      | Name of the target endpoint                 | not set         |
| type      | Type of the target endpoint                 | not set         |
| parameter | Optional parameter to be sent to the device | ""              |
| get       | Method: get (true) or set (false)           | false           |

The following types are defined in the ArduinoDevice class:

| Type | Description                                                     |
|------|-----------------------------------------------------------------|
| rc   | Remote control API endpoints (Only awareness, no functionality) |
| sys  | System endpoints                                                |

Other types can be defined by the application that uses this library.

### setLocalAddress
The function ```setLocalAddress(<addr>)``` must be called with the hosts IPv4 address as a string as argument before calling the subscribe function.

### subscribe
The function ```subscribe()``` will set the master of the target device to the host address provided using ```setLocalAddress```. This allows the device to connect to the host in order to send events (like triggers and capability values when used with the Homey app) to the host.

### unsubscribe
The function ```unsubscribe()``` will disable automatic subscription recovery when the device master changes. It does not disable established subscriptions, even though the name might suggest this.

### getOpt
Retrieve a configuration value from the device options storage. Syntax: ```getOpt(<key>)```.

### setOpt
Set a configuration value in the device options storage. Syntax: ```setOpt(<key>, <value>)```.


## 4. The Homey app
The Homey app provides the interface between the Homey flow editor and capabilities by providing a driver which implements a device type that encapsulates the ```ArduinoDevice``` class. The encapsulating class is called ```HomeyduinoDevice```. This class defines a set of types for both Arduino device endpoints and Arduino device events.

Types of endpoints:

| Type | Description                                                |
|------|------------------------------------------------------------|
| act  | Actions                                                    |
| con  | Conditions                                                 |
| cap  | Capabilities (send updated value from Homey to the device) |
| rc   | Remote control API endpoints                               |
| sys  | System endpoints (defined by node.js class)                |

Types of events:

| Type | Description                                            |
|------|--------------------------------------------------------|
| trg  | Actions                                                |
| cap  | Capabilities (send updated value from device to Homey) |
| raw  | Reserved for custom events (ignored by Homeyduino app) |

## 4. Remote configuration
The remote configuration feature of Homeyduino consists of an API provided by the device in combination with an addition to the pairing wizard, which adds the device configuration to the device settings, from which it is applied again whenever necessary.

The remote configuration API is part of the Arduino libary and described [here](https://github.com/athombv/homey-arduino-library/tree/master/docs/api.md#remote-configuration).
