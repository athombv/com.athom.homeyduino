Homeyduino

This Homey app allows you easily to connect your own Arduino based creations with your Homey using ethernet or WiFi. Connecting your own creations with Homey has never been easier: just install the app and download the Homeyduino Arduino library (https://github.com/athombv/homey-arduino-library) to get started!

Welcome

New to Homeyduino? Usage information and a getting started guide can be found in the usage guide (https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md).

Looking for examples? We've built a set of example projects which are included with the Arduino library (https://github.com/athombv/homey-arduino-library/tree/master/examples).

Interested in the inner workings of Homeyduino? The API reference for the Arduino library can be found at https://github.com/athombv/homey-arduino-library/blob/master/docs/api.md and the protocol used to communicate between the Arduino library and the Homey app is documented here https://github.com/athombv/homey-arduino-library/blob/master/docs/protocol.md.

Getting started (templates for building your own projects)
 - Arduino board with an ethernet v2 shield: 
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Getting%20started/Ethernet_shield_2/Ethernet_shield_2.ino 
   https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md#the-basics
 - Arduino board with an ethernet v1 shield:
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Getting%20started/Legacy_ethernet_shield/Legacy_ethernet_shield.ino
   https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md#using-the-legacy-arduino-ethernet-shield-v1
 - ESP8266 based boards:
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Getting%20started/ESP8266/ESP8266.ino
   https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md#the-basics
 - ESP32 based boards: 
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Getting%20started/ESP32/ESP32.ino
   https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md#the-basics

Examples (finished projects with documentation)

 - Automatic plant waterer
   https://github.com/athombv/homey-arduino-library/tree/master/examples/Example%20projects/Automatic_plant_waterer
 - DHT11 temperature and humidity sensor
   https://github.com/athombv/homey-arduino-library/tree/master/examples/Example%20projects/dht11
 - NFC reader
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Example%20projects/nfc_reader
 - Simon says
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Example%20projects/Simon_says

Firmware (finished firmware for certain devices available on the market)
 - Sonoff basic
   https://github.com/athombv/homey-arduino-library/blob/master/examples/Devices/Sonoff_Basic/Sonoff_Basic.ino

Remote configuration
The remote configuration (https://github.com/athombv/homey-arduino-library/blob/master/examples/Remote_configuration/Remote_configuration.ino) sketch allows you to configure your Arduino board from within the pairing wizard, no programming skills required. Compatible with select Arduino, ESP8266 and ESP32 boards. More information on this feature can be found here https://github.com/athombv/homey-arduino-library/blob/master/docs/usage.md#2-remote-configuration.

Technical details
 - Arduino library API reference
   https://github.com/athombv/homey-arduino-library/blob/master/docs/api.md
 - The inner workings of the Homeyduino Homey app
   https://github.com/athombv/com.athom.homeyduino/blob/master/technical_details.md
 - The network protocol
   https://github.com/athombv/homey-arduino-library/blob/master/docs/protocol.md
