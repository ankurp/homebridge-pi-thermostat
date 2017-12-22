# Homebridge Pi Thermostat Plugin

This is a [homebridge](https://github.com/nfarina/homebridge) plugin to make a Raspberry Pi connected with a Relay Board and DHT22 Temperature and Humidity Sensor into a smart thermostat that can be controlled via the Home app on iOS using Homekit.

Just add the following config to your homebridge config file located at this path `~/.homebridge/config.json`.

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "description": "",
  "accessories": [
    {
      "accessory": "Thermostat",
      "name": "Pi Thermostat",
      "fanRelayPin": 10,
      "heatRelayPin": 11,
      "coolRelayPin": 12,
      "temperatureSensorPin": 4,
      "minimumOnOffTime": 60000,
      "minimumOffOnDelay": 15000,
      "temperatureCheckInterval": 10000
    }
  ],
  "platforms": []
}
```

## Configuration

You can change the pin to turn on and off the relay switch for the Fan, Heat and Cool setting.

You also can change the pin for the DHT22 temperature sensor.

The system has a minimum on off time which is in miliseconds and is the time it takes to turn Heat or Cool off so that air blows out of the system and it does not shut down immediately. This defaults to 1 min or 60 seconds.

The system also has a minimum off on delay which is the time it takes to turn on the Heat or Cool so that it does not start it and stop it right away incase a wrong selection is made. this defaults to 15 seconds.

The interval for checking the temperature of the room can also be set and defaults to 10 seconds.
