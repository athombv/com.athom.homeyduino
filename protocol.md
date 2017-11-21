# The Homeyduino network protocol

Communication between Homey and Homeyduino devices happens using TCP and UDP packets on port ```46639```. UDP is used for device discovery while general communication is done using ```JSON``` data sent and received using ```HTTP``` over ```TCP```.

# Device discovery
Devices can be discovered by sending an empty UDP broadcast packet on port ```46639```. Available devices will answer with a ```JSON``` object describing the device. This is the same ```JSON``` object returned when accessing the device index ```/``` using ```HTTP``` over ```TCP``` on port ```46639```.

If ```UDP``` broadcasting is not available devices can still be manually added by querying the device information over ```TCP``` by manually entering the IP address of the device into the Homey application.

## The device information JSON object

Example:
```
{
	"id": "esp32-demo",
	"type": "homeyduino",
	"class": "sensor",
	"arch": "esp32",
	"numDigitalPins": "40",
	"numAnalogInputs": "16",
	"rc": "0",
	"master": {
		"host": "192.168.1.11",
		"port": 42419
	},
	"api": {
		"0": {
			"name": "measure_humidity",
			"type": "cap"
		},
		"1": {
			"name": "measure_temperature",
			"type": "cap"
		},
		"2": {
			"name": "onoff",
			"type": "cap"
		},
		"3": {
			"name": "led1",
			"type": "act"
		},
		"4": {
			"name": "led2",
			"type": "act"
		}
	}
}
```

| Field           | Type      | Description                                                                               | Required | Default value       |
|-----------------|-----------|-------------------------------------------------------------------------------------------|----------|---------------------|
| id              | text      | Unique device identifier string                                                           | Yes      | (device specific)   |
| type            | text      | Device type identifier string                                                             | Yes      | homeyduino          |
| class           | text      | Device class identifier string                                                            | Yes      | other               |
| arch            | text      | CPU architecture                                                                          | No*      | (can be left empty) |
| numDigitalPins  | number    | Number of digital pins on board                                                           | No*      | 0                   |
| numAnalogInputs | number    | Number of analog inputs on board                                                          | No*      | 0                   |
| rc              | boolean** | When set to true this field signals that the device supports the remote configuration API | No*      | false               |
| master          | object    | Information about the devices current master                                              | Yes      |                     |
|   - host        | text      | IP address                                                                                | Yes      | 0.0.0.0             |
|   - port        | number    | Port number                                                                               | Yes      | 9999                |
| api             | list***   | List of API calls supported by the device                                                 | Yes      | []                  |
|                 |           |                                                                                           |          |                     |
|                 |           |                                                                                           |          |                     |
|                 |           |                                                                                           |          |                     |

\* Currently required due to implementation

\*\* Currently expected to be a text field containing "1" for true or "0" for false due to implementation

\*\*\* Currently an object containing labeled API call objects. Labels are numbers counted up from 0.
