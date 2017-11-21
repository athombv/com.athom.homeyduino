# Homeyduino

This Homey app allows you easily to connect your own Arduino based creations with your Homey using ethernet or WiFi. Connecting your own creations with Homey has never been easier: just install the app and downlod the Homeyduino Arduino library to get started!

# Contents
- [Getting started](#getting-started)
- [Documentation](#documentation)
- [Examples](#examples)
- [Issues, support and contributing](#issues-support-and-contributing)
- [License and credits](#license-and-credits)

# Getting started

## Hardware prerequisites
Homeyduino is compatible with all ESP8266 and ESP32 based development boards as well as Arduino boards compatible with the [Arduino Ethernet v2 shield](https://store.arduino.cc/arduino-ethernet-shield-2).

Support for using the [legacy Arduino Ethernet v1 shield](https://store.arduino.cc/arduino-ethernet-shield-without-poe-module) is also available, but you will need to change a configuration setting in one of the libraries files, click [here](#using-the-legacy-arduino-ethernet-shield) for more information.

Other networked Arduino devices such as Arduino Yun and the Arduino GSM shield are currently not supported.

The software has been tested on the following board configurations:
 - Arduino UNO with ethernet v2 shield
 - Arduino Leonardo with ethernet v2 shield
 - Arduino Due with ethernet v2 shield
 - ESP8266 NodeMCU v1
 - ESP32 devkit

## Software prerequisites
To get started make sure you have installed both the Arduino IDE from arduino.cc and the Homey desktop application installed. Before trying to build a project using the Homeyduino software make sure that your Arduino setup is fully functional by uploading for example the blink sketch to your Arduino board.

## Installing the software

First download the Homeyduino Arduino library from it's repository (https://github.com/athombv/homey-arduino-library) and add the library to Arduino (Sketch -> Include Library -> Add .ZIP Library...).

Then clone this repository recursively ( git clone --recursive "https://github.com/athombv/com.athom.arduino") and deploy the app to your Homey (athom project --install)

## Now what?

You could start with trying one of the provided [example](#examples) projects. After that please refer to the [documentation](#documentation) for more information.

In the examples you will find a template sketch for each of the supported platforms.

## Integrating an existing sketch with Homeyduino

To be able to use the Homeyduino library in an existing sketch you just have to include the header file: ```#include <Homey.h>```


# Documentation

## Using the legacy Arduino ethernet v1 shield

Navigate to the libraries folder in the Arduino folder on your computer. Then find the file "Homey.h" in the homey directory. Open this file using a text editor and remove the ```//``` marker from the ```//#define HOMEY_USE_ETHERNET_V1``` line so that it becomes ```#define HOMEY_USE_ETHERNET_V1``` to switch to ethernet shield v1 support instead of ethernet shield v2 support.

##Examples

Examples can be found in the [examples directory]() of the Arduino library.

## API reference

The API reference is included with the Arduino library and can be found [here]().

## Network protocol

The network protocol is described [here]().

#Issues, support and contributing

Before submitting a bug or feature request please read our [contributing guidelines](CONTRIBUTING.md).


#License and credits

This software is licensed under the [GPLv3 license](LICENSE).
