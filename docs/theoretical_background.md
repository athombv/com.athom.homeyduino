# Theoretical background

The project consists of multiple software layers which work together to provide the user with all features described in the requirements.

This chapter starts with a description of how Homey expects apps to describe devices. This first section also explains in detail how the different interfaces are presented to the user.

The assignment states that devices should communicate with Homey over WiFi and Ethernet, and that devices should be discovered automatically. The communication section of this chapter describes the methods used to accomplish automatic discovery and two-way communication between Homey and the devices.

The last paragraph describes how the different layers of both the Arduino library and the Homey app work together to implement Homey functionality on top of the communication layer.

## Homey

Applications running on Homey are built in Node.js Javascript. Each application runs in it’s own Node.js container. And all Homey specific features are exposed to the application using a Node.js API.

This means that the choice of programming language at the Homey side is limited to Javascript. But in a more positive light it also means that all available Node.js modules can be used in applications running on Homey.

Devices in Homey are represented by a driver. A driver consists of a generic part and a device specific part. The generic part describes devices when the user starts the pairing wizard and keeps track of underlying objects and libraries. The device specific part gets instantiated for each individual device and keeps track of the device state.

The user interacts with devices by placing blocks in the flow editor. These blocks can have three types: trigger, condition and action.

* Triggers

A trigger starts a flow. In the case of this project it is an event sent from a device to Homey, allowing the user to trigger a flow from their device.

* Conditions

A condition determines the outcome of a flow: it switches between a True and False path that the flow can follow. In this project these cards send a request to the device which is answered with a boolean result.

* Actions

The last type, actions, are cards which in the case of this project start an action on the device.

To support for these kinds of cards in this project both the device and Homey should be able to initiate requests.

Additionally it is possible for a device to expose “capabilities”. These capacilities are pre-defined features which a device can have, for example a lamp can provide “onoff” and “dim” capabilities. When these capabilities are exposed Homey will automatically add cards and user-interface elements for the capabilities. Depending on the kind of capability the capability state can be set from either Homey or the device.

A lamp can for example be turned on or off from Homey. In that case Homey can set the state of the “onoff” capability. The device itself can also update the value, for example when someone turns the light on or off using a button on the device itself.

Other situations are also possible: if the device has, for example, a temperature sensor then the device will send the value to Homey while the value will never be set from Homey.

## Communication

Some of the more simple Arduino boards have very limited available memory. Because of this the communication method had to be kept as simple as possible, while still providing a base which allows for implementing all required functionality.

Because of the nature of the data exchanged between the device and Homey it is important to be able to guarantee delivery. Because of this requirement the choice was made to use TCP connections for transferring data between the device and Homey.

The choice was made to use HTTP in it’s most basic form on top of the TCP layer. This choice was made because of multiple reasons:

* HTTP is a very simple protocol with only a small set of requirements
* Libraries for communicating over HTTP are already available for both Node.js and Arduino
* Requests can be easily debugged by using a web browser

Since communication can be initiated from both the device and from Homey both devices will implement both a HTTP server and a HTTP client.

Because some requests can return different types of data the data sent over the communication link must be encoded using a format which allows for differentiating between different types of data. It should also allow for describing more advanced structures like lists. JSON was found to be the simplest format that implements these requirements. It was designed to describe information in the same way as Javascript does. Because of this the data types defined by Javascript and presented to the user by Homey (Number, Boolean and String) can be described and differentiated between easily. Additionally the simplicity of the JSON format allows for easy generation without much overhead. Decoding JSON encapsulated information however requires much more available resources.

The choice was made to have the device encapsulate the data it sends into JSON objects to allow for easy parsing on the Node.js side, while data sent by the Node.js side to the device will be sent as simple as possible, as raw data sent over HTTP.

To be able to discover devices on the local network each device listens on UDP as well. The Homey application broadcasts UDP packets. Whenever a device receives such a packet it will answer with a device descriptor in JSON format.

## Application layers

On the Arduino side all functionality is implemented in a library, allowing the user to integrate Homey support without much technical knowledge. This library consists of a simple HTTP server and client, combined with generic methods for setting listeners and for emitting events.

On top of the methods for setting listeners a small wrapper for each kind of listener and event will be implemented. This approach should allow other developers to add new kinds of listeners and events easily. When a listener is executed it will run a callback function. Additionally, to allow for storing the current capability value each listener can optionally store a value.

For this project the listener types are conditions, actions and capabilities. The event types are triggers and again capabilities.

On the Homey side device discovery and management is done using a Node.js module. The Node.js module allows the Homey app, which is built on top of the Node.js module, to receive events and to transmit requests to the listeners available on the devices. The module is unaware of the different types of listeners and events. The module does, just as the driver in Homey app itself, consist of a generic part and a device specific part which is instantiated once for every discovered device.

When the user opens the pairing wizard the driver will ask the Node.js module for a list of available devices. This list is then presented to the user. When the user adds a device to Homey an instance of the device specific part of the driver is created for that specific device. This instance will then in turn ask the Node.js module for the device specific instance it created when it discovered the device.

In other words: both in the Homey app and in the underlying Node.js module device management is done by a generic instance that runs once per system, while both the Homey app and the underlying Node.js module have the the device specific code in a class which has one instance per device.

Because all Homey specific code is contained within a separate layer the lower layers can easily be reused when a developer wants to create a custom app.

## Remote configuration

To allow for configuration of the Arduino without reprogramming it the basic functionality of the Arduino has to be exposed through the HTTP server on the Arduino. This is accomplished by adding an extra layer on top of the Arduino library that exposes a fixed API that allows for direct pin manipulation.
