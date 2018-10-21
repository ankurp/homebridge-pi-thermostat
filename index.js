const gpio = process.platform === 'linux' ? require('rpi-gpio') : {
  setMode: () => {},
  setup: () => {},
  write: () => {}
};
const dhtSensor = process.platform === 'linux' ? require('node-dht-sensor') : {
  read: (type, pin, fn) => { fn(null, 22, 50); }
};
gpio.setMode(gpio.MODE_BCM);

let Service, Characteristic, HeatingCoolingStateToRelayPin;
const OFF = true;
const ON = false;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-pi-thermostat', 'Thermostat', Thermostat);
};

class Thermostat {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.maxTemperature = config.maxTemperature || 35;
    this.minTemperature = config.minTemperature || 0;
    this.fanRelayPin = config.fanRelayPin || 26;
    this.heatRelayPin = config.heatRelayPin || 21;
    this.coolRelayPin = config.coolRelayPin || 20;
    this.temperatureSensorPin = config.temperatureSensorPin || 4;
    this.minimumOnOffTime = config.minimumOnOffTime || 120000; // In milliseconds
    this.blowerTurnOffTime = config.blowerTurnOffTime || 80000; // In milliseconds
    this.startDelay = config.startDelay || 10000; // In milliseconds
    this.temperatureCheckInterval = config.temperatureCheckInterval || 10000; // In milliseconds

    HeatingCoolingStateToRelayPin = {
      [Characteristic.CurrentHeatingCoolingState.HEAT]: this.heatRelayPin,
      [Characteristic.CurrentHeatingCoolingState.COOL]: this.coolRelayPin
    };

    gpio.setup(this.fanRelayPin, gpio.DIR_HIGH);
    gpio.setup(this.heatRelayPin, gpio.DIR_HIGH);
    gpio.setup(this.coolRelayPin, gpio.DIR_HIGH);

    this.currentTemperature = 21;
    this.currentRelativeHumidity = 50;
    this.targetTemperature = 21;

    this.heatingThresholdTemperature = 18;
    this.coolingThresholdTemperature = 24;
    this.isFanRunning = false;

    //Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
    //Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
    this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

    // The value property of CurrentHeatingCoolingState must be one of the following:
    //Characteristic.CurrentHeatingCoolingState.OFF = 0;
    //Characteristic.CurrentHeatingCoolingState.HEAT = 1;
    //Characteristic.CurrentHeatingCoolingState.COOL = 2;
    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

    // The value property of TargetHeatingCoolingState must be one of the following:
    //Characteristic.TargetHeatingCoolingState.OFF = 0;
    //Characteristic.TargetHeatingCoolingState.HEAT = 1;
    //Characteristic.TargetHeatingCoolingState.COOL = 2;
    //Characteristic.TargetHeatingCoolingState.AUTO = 3;
    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;

    this.thermostatService = new Service.Thermostat(this.name);
    this.fanService = new Service.Fan(this.name);

    gpio.write(this.fanRelayPin, OFF);
    gpio.write(this.heatRelayPin, OFF);
    gpio.write(this.coolRelayPin, OFF);

    setInterval(() => this.readTemperatureFromSensor(), this.temperatureCheckInterval);
  }

  get currentlyRunning() {
    return this.systemStateName(this.currentHeatingCoolingState);
  }

  get shouldTurnOnHeating() {
    return (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.HEAT && this.currentTemperature < this.targetTemperature)
      || (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.AUTO && this.currentTemperature < this.heatingThresholdTemperature);
  }

  get shouldTurnOnCooling() {
    return (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.COOL && this.currentTemperature > this.targetTemperature)
      || (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.AUTO && this.currentTemperature > this.coolingThresholdTemperature);
  }

  identify(callback) {
    this.log('Identify requested!');
    callback(null);
  }

  systemStateName(heatingCoolingState) {
    if (heatingCoolingState === Characteristic.CurrentHeatingCoolingState.HEAT) {
      return 'Heat';
    } else if (heatingCoolingState === Characteristic.CurrentHeatingCoolingState.COOL) {
      return 'Cool';
    } else {
      return 'Off';
    }
  }

  clearTurnOnInstruction() {
    this.log('CLEARING Turn On instruction');
    clearTimeout(this.startSystemTimer);
    this.startSystemTimer = null;
  }

  turnOnSystem(systemToTurnOn) {
    if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF) {
      if (!this.startSystemTimer) {
        this.log(`STARTING ${this.systemStateName(systemToTurnOn)} in ${this.startDelay / 1000} second(s)`);
        this.startSystemTimer = setTimeout(() => {
          this.log(`START ${this.systemStateName(systemToTurnOn)}`);
          gpio.write(HeatingCoolingStateToRelayPin[systemToTurnOn], ON);
          this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, systemToTurnOn);
        }, this.startDelay);
      } else {
        this.log(`STARTING ${this.systemStateName(systemToTurnOn)} soon...`);
      }
    } else if (this.currentHeatingCoolingState !== systemToTurnOn) {
      this.turnOffSystem();
    }
  }

  turnFan(state) {
    this.isFanRunning = state === ON;
    this.log(`Turning Fan ${this.isFanRunning ? 'ON' : 'OFF'}`);
    gpio.write(this.fanRelayPin, state);
  }

  get timeSinceLastHeatingCoolingStateChange() {
    return new Date() - this.lastCurrentHeatingCoolingStateChangeTime;
  }

  turnOffSystem() {
    if (!this.stopSystemTimer) {
      this.log(`STOP ${this.currentlyRunning} | Blower will turn off in ${this.blowerTurnOffTime / 1000} second(s)`);
      gpio.write(HeatingCoolingStateToRelayPin[this.currentHeatingCoolingState], OFF);
      this.stopSystemTimer = setTimeout(() => {
        this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.OFF);
      }, this.blowerTurnOffTime);
    } else {
      this.log(`INFO ${this.currentlyRunning} is stopped. Blower will turn off soon...`);
    }
  }

  updateSystem() {
    if (this.timeSinceLastHeatingCoolingStateChange < this.minimumOnOffTime) {
      const waitTime = this.minimumOnOffTime - this.timeSinceLastHeatingCoolingStateChange;
      this.log(`INFO Need to wait ${waitTime / 1000} second(s) before state changes.`);
      return;
    }

    if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF
        && this.targetHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) {
      if (this.shouldTurnOnHeating) {
        this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.HEAT);
      } else if (this.shouldTurnOnCooling) {
        this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.COOL);
      } else if (this.startSystemTimer) {
        this.clearTurnOnInstruction();
      }
    } else if (this.currentHeatingCoolingState !== Characteristic.CurrentHeatingCoolingState.OFF
        && this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.OFF) {
      this.turnOffSystem();
    } else if (this.currentHeatingCoolingState !== Characteristic.CurrentHeatingCoolingState.OFF
              && this.targetHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) {
      if (this.shouldTurnOnHeating) {
        this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.HEAT);
      } else if (this.shouldTurnOnCooling) {
        this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.COOL);
      } else {
        this.turnOffSystem();
      }
    } else if (this.startSystemTimer) {
      this.clearTurnOnInstruction();
    }
  }

  readTemperatureFromSensor() {
    dhtSensor.read(22, this.temperatureSensorPin, (err, temperature, humidity) => {
      if (!err) {
        this.currentTemperature = temperature;
        this.currentRelativeHumidity = humidity;
        this.thermostatService.setCharacteristic(Characteristic.CurrentTemperature, this.currentTemperature);
        this.thermostatService.setCharacteristic(Characteristic.CurrentRelativeHumidity, this.currentRelativeHumidity);
      } else {
        this.log('ERROR Getting temperature');
      }
    });
  }

  getServices() {
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Encore Dev Labs')
      .setCharacteristic(Characteristic.Model, 'Pi Thermostat')
      .setCharacteristic(Characteristic.SerialNumber, 'Raspberry Pi 3');

    // Off, Heat, Cool
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', callback => {
        this.log('CurrentHeatingCoolingState:', this.currentHeatingCoolingState);
        callback(null, this.currentHeatingCoolingState);
      })
      .on('set', (value, callback) => {
        this.log('SET CurrentHeatingCoolingState from', this.currentHeatingCoolingState, 'to', value);
        this.currentHeatingCoolingState = value;
        this.lastCurrentHeatingCoolingStateChangeTime = new Date();
        if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF) {
          this.stopSystemTimer = null;
        } else {
          this.startSystemTimer = null;
        }
        callback(null);
      });

    // Off, Heat, Cool, Auto
    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', callback => {
        this.log('TargetHeatingCoolingState:', this.targetHeatingCoolingState);
        callback(null, this.targetHeatingCoolingState);
      })
      .on('set', (value, callback) => {
        this.log('SET TargetHeatingCoolingState from', this.targetHeatingCoolingState, 'to', value);
        this.targetHeatingCoolingState = value;
        this.updateSystem();
        callback(null);
      });

    // Current Temperature
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('CurrentTemperature:', this.currentTemperature);
        callback(null, this.currentTemperature);
      })
      .on('set', (value, callback) => {
        this.updateSystem();
        callback(null);
      });

    // Target Temperature
    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('TargetTemperature:', this.targetTemperature);
        callback(null, this.targetTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET TargetTemperature from', this.targetTemperature, 'to', value);
        this.targetTemperature = value;
        this.updateSystem();
        callback(null);
      });

    // °C or °F for units
    this.thermostatService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', callback => {
        this.log('TemperatureDisplayUnits:', this.temperatureDisplayUnits);
        callback(null, this.temperatureDisplayUnits);
      })
      .on('set', (value, callback) => {
        this.log('SET TemperatureDisplayUnits from', this.temperatureDisplayUnits, 'to', value);
        this.temperatureDisplayUnits = value;
        callback(null);
      });

    // Get Humidity
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', callback => {
        this.log('CurrentRelativeHumidity:', this.currentRelativeHumidity);
        callback(null, this.currentRelativeHumidity);
      });

    // Auto max temperature
    this.thermostatService
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('CoolingThresholdTemperature:', this.coolingThresholdTemperature);
        callback(null, this.coolingThresholdTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET CoolingThresholdTemperature from', this.coolingThresholdTemperature, 'to', value);
        this.coolingThresholdTemperature = value;
        callback(null);
      });

    // Auto min temperature
    this.thermostatService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('HeatingThresholdTemperature:', this.heatingThresholdTemperature);
        callback(null, this.heatingThresholdTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET HeatingThresholdTemperature from', this.heatingThresholdTemperature, 'to', value);
        this.heatingThresholdTemperature = value;
        callback(null);
      });

    this.thermostatService
      .getCharacteristic(Characteristic.Name)
      .on('get', callback => {
        callback(null, this.name);
      });

    this.fanService.getCharacteristic(Characteristic.On)
      .on('get', callback => {
        callback(null, this.isFanRunning);
      })
      .on('set', (value, callback) => {
        if (this.currentlyRunning === 'Off') {
          if (value && !this.isFanRunning) {
            this.turnFan(ON);
          } else if (!value && this.isFanRunning) {
            this.turnFan(OFF);
          }
          callback(null);
        } else {
          callback(new Error('Heating/Cooling System is running so cannot turn on/off the fan'));
        }
      });

    return [informationService, this.thermostatService, this.fanService];
  }
}
