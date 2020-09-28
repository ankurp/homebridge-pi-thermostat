# Homebridge Pi Thermostat Plugin

This is a [homebridge](https://github.com/nfarina/homebridge) plugin to make a Raspberry Pi connected with a Relay Board and DHT22 Temperature and Humidity Sensor into a smart thermostat that can be controlled via the Home app on iOS using Homekit.

![Raspberry Pi Thermostat showing Wiring](https://user-images.githubusercontent.com/498669/34429545-9cbd215a-ec27-11e7-8065-ccb0f43baa75.JPG)

## [Guide](https://blog.encoredevlabs.com/feature/thermostat/raspberrypi/home-automation/homekit/homebridge/2017/12/25/homekit-pi-thermostat.html)

For those who want to create their own thermostat using Raspberry Pi, [here is a blog post](https://blog.encoredevlabs.com/feature/thermostat/raspberrypi/home-automation/homekit/homebridge/2017/12/25/homekit-pi-thermostat.html) that goes through the details of where to buy the parts, how to assemble it and what software to install to get this to work. 

## Installation
* Install nodejs and other dependencies for homebridge to work
```sh
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs libavahi-compat-libdnssd-dev
```
* Install [BCM2835](http://www.airspayce.com/mikem/bcm2835/) for temperature sensor to work
```sh
wget http://www.airspayce.com/mikem/bcm2835/bcm2835-1.52.tar.gz
tar zxvf bcm2835-1.52.tar.gz
cd bcm2835-1.52
./configure && make && sudo make check && sudo make install
```
* Install homebridge and this plugin
```sh
sudo npm install -g --unsafe-perm homebridge homebridge-pi-thermostat
```
* Add the accessory config to your homebridge config file located at this path `~/.homebridge/config.json`.
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
      "fanRelayPin": 26,
      "heatRelayPin": 21,
      "coolRelayPin": 20,
      "temperatureSensorPin": 4,
      "minimumOnOffTime": 120000,
      "blowerTurnOffTime": 80000,
      "startDelay": 10000,
      "temperatureCheckInterval": 10000
    }
  ],
  "platforms": []
}
```
* Start it up by running `homebridge` command.

## Configuration


### Relay Pins

You can change the pin to turn on and off the relay switch for the Fan, Heat and Cool setting.

```json
"fanRelayPin": 26,
"heatRelayPin": 21,
"coolRelayPin": 20,
```

### Temperature Sensor Pin

You also can change the pin for the DHT22 temperature sensor.

```json
"temperatureSensorPin": 4,
```

### Timing

The system has a minimum on off time which is in miliseconds and is the minimum time it keeps the Heat or Cool turned on and off so that it does not damage the heating or cooling system by turning on and off very quickly.

```json
"minimumOnOffTime": 120000,
```

The system also has a blowerTurnOffTime which is the time it takes to turn off the blower after Heat or Cool is turned off.

```json
"blowerTurnOffTime": 80000,
```

The interval for checking the temperature of the room can also be set and defaults to 10 seconds.

```json
"temperatureCheckInterval": 10000
```

## Screenshots

<img width="320px" title="Auto Setting" src ="https://user-images.githubusercontent.com/498669/34306432-116a3cfc-e711-11e7-9fae-6662bd781fde.PNG" />

<img width="320px" title="Auto Setting Temperature" src ="https://user-images.githubusercontent.com/498669/34306435-14f0e088-e711-11e7-88e5-6803eff486f4.PNG" />

<img width="320px" title="Heat Setting Temperature" src ="https://user-images.githubusercontent.com/498669/34306426-0ddd1636-e711-11e7-9f1d-2f39141eadf2.PNG" />

<img width="320px" title="Info Screen Part 1" src ="https://user-images.githubusercontent.com/498669/34306428-0f9f2f04-e711-11e7-87c9-6c3b9b7e88fe.PNG" />

<img width="320px" title="Info Screen Part 2" src ="https://user-images.githubusercontent.com/498669/34306425-0c499448-e711-11e7-957b-ce92402b4d49.PNG" />
