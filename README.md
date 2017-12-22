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

```json
"fanRelayPin": 10,
"heatRelayPin": 11,
"coolRelayPin": 12,
```

You also can change the pin for the DHT22 temperature sensor.

```json
"temperatureSensorPin": 4,
```

The system has a minimum on off time which is in miliseconds and is the time it takes to turn Heat or Cool off so that air blows out of the system and it does not shut down immediately. This defaults to 1 min or 60 seconds.

```json
"minimumOnOffTime": 60000,
```

The system also has a minimum off on delay which is the time it takes to turn on the Heat or Cool so that it does not start it and stop it right away incase a wrong selection is made. this defaults to 15 seconds.

```json
"minimumOffOnDelay": 15000,
```

The interval for checking the temperature of the room can also be set and defaults to 10 seconds.

```json
"temperatureCheckInterval": 10000
```

## Screenshots

![Auto Setting](https://user-images.githubusercontent.com/498669/34306432-116a3cfc-e711-11e7-9fae-6662bd781fde.PNG)
![Auto Setting Temperature](https://user-images.githubusercontent.com/498669/34306435-14f0e088-e711-11e7-88e5-6803eff486f4.PNG)
![Heat Setting Temperature](https://user-images.githubusercontent.com/498669/34306426-0ddd1636-e711-11e7-9f1d-2f39141eadf2.PNG)
![Info Screen Part 1](https://user-images.githubusercontent.com/498669/34306428-0f9f2f04-e711-11e7-87c9-6c3b9b7e88fe.PNG)
![Info Screen Part 2](https://user-images.githubusercontent.com/498669/34306425-0c499448-e711-11e7-957b-ce92402b4d49.PNG)
