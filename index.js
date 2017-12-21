const rpio = require('rpio');
const FAN_RELAY_PIN = 10;
const HEAT_RELAY_PIN = 11;
const COOL_RELAY_PIN = 12;
const WAIT_TIME = 60000;
rpio.open(FAN_RELAY_PIN, rpio.OUTPUT, rpio.LOW);
rpio.open(HEAT_RELAY_PIN, rpio.OUTPUT, rpio.LOW);
rpio.open(COOL_RELAY_PIN, rpio.OUTPUT, rpio.LOW);

let Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-pi-thermostat', 'Thermostat', Thermostat);
};

class Thermostat {
  constructor(log, config) {
    this.log = log;
    this.maxTemp = 30;
    this.minTemp = 0;
    this.name = config.name;
  
    this.currentTemperature = 13.8889;
    this.currentRelativeHumidity = 50;
    this.targetTemperature = 21;

    this.heatingThresholdTemperature = 18;
    this.coolingThresholdTemperature = 24;
      
    //Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
    //Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
    this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
  
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
  
    this.service = new Service.Thermostat(this.name);

    setInterval(() => {
      this.service.setCharacteristic(Characteristic.CurrentTemperature, this.currentTemperature);
      this.service.setCharacteristic(Characteristic.CurrentRelativeHumidity, this.currentRelativeHumidity);
    }, 1000);
  }

	identify(callback) {
		this.log('Identify requested!');
		callback(null);
  }

  turnOnHeating() {
    if (!this.stopHeatTimer && !this.stopCoolingTimer) {
      this.log('START Heat');
      rpio.write(HEAT_RELAY_PIN, rpio.HIGH);
      this.heatStartTime = new Date();  
    } else if (this.stopCoolingTimer) {
      this.log('WARN Heat cannot start as cooling is in process of turning off.');
    } else {
      this.log('WARN Heat is in process of turning off.');
    }
  }
  
  turnOffHeating() {
    const timeSinceHeatingStarted = (new Date() - this.heatStartTime);
    const waitTime = Math.floor((WAIT_TIME - timeSinceHeatingStarted) / 1000);
    if (!this.stopHeatTimer) {
      this.log('STOPPING Heat...');
      this.stopHeatTimer = setTimeout(() => {
        this.log('STOP Heat');
        rpio.write(HEAT_RELAY_PIN, rpio.LOW);
        this.heatStartTime = null;
        this.stopHeatTimer = null;
      }, waitTime * 1000);
    } else {
      this.log(`WARN Heat is in process of turning off in ${waitTime} second(s)`);
    }
  }
  
  turnOnCooling() {
    if (!this.stopCoolingTimer && !this.stopHeatTimer) {
      this.log('START Cooling');
      rpio.write(HEAT_RELAY_PIN, rpio.HIGH);
      this.coolingStartTime = new Date();
    } else if (this.stopHeatTimer) {
      this.log('WARN Cooling cannot start as heating is in process of turning off.');
    } else {
      this.log('WARN Cooling is in process of turning off.');
    }
  }
  
  turnOffCooling() {
    const timeSinceCoolingStarted = (new Date() - this.coolingStartTime);
    const waitTime = Math.floor((WAIT_TIME - timeSinceCoolingStarted) / 1000);
    if (!this.stopCoolingTimer) {
      this.log('STOPPING Cooling...');
      this.stopCoolingTimer = setTimeout(() => {
        this.log('STOP Cooling');
        rpio.write(HEAT_RELAY_PIN, rpio.LOW);
        this.coolingStartTime = null;
        this.stopCoolingTimer = null;
      }, waitTime * 1000);
    } else {
      this.log(`WARN Cooling is in process of turning off in ${waitTime} second(s)`);
    }
  }  

	getServices() {
		const informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, 'Encore Dev Labs')
			.setCharacteristic(Characteristic.Model, 'Pi Thermostat')
			.setCharacteristic(Characteristic.SerialNumber, 'Raspberry Pi 3');

    // Off, Heat, Cool, Auto
    this.service
			.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', callback => {
        this.log('CurrentHeatingCoolingState:', this.currentHeatingCoolingState);
        callback(null, this.currentHeatingCoolingState);
      })
      .on('set', (value, callback) => {
        this.log('SET CurrentHeatingCoolingState from', this.currentHeatingCoolingState, 'to', value);
        if (this.currentHeatingCoolingState === value) {
          return callback(null, this.currentHeatingCoolingState);
        }

        if (this.currentHeatingCoolingState !== Characteristic.CurrentHeatingCoolingState.OFF) {
          if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.HEAT) {
            this.turnOffHeating();
          } else if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.COOL) {
            this.turnOffCooling();
          }
        }

        this.currentHeatingCoolingState = value;

        if (this.currentHeatingCoolingState !== Characteristic.CurrentHeatingCoolingState.OFF) {
          if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.HEAT) {
            this.turnOnHeating();
          } else if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.COOL) {
            this.turnOnCooling();
          }
        }
        
        callback(null, this.currentHeatingCoolingState);
      });

    // Target temperature for Heat and Cool
		this.service
			.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', callback => {
        this.log('TargetHeatingCoolingState:', this.targetHeatingCoolingState);
        callback(null, this.targetHeatingCoolingState);
      })
			.on('set', (value, callback) => {
        this.log('SET TargetHeatingCoolingState from', this.targetHeatingCoolingState, 'to', value);
        this.targetHeatingCoolingState = value;
        if (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.HEAT && this.currentTemperature < this.targetTemperature) {
          this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.HEAT);
        } else if (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.COOL && this.currentTemperature > this.targetTemperature) {
          this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.COOL);
        } else if (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.AUTO && this.currentTemperature < this.heatingThresholdTemperature) {
          this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.HEAT);
        } else if (this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.AUTO && this.currentTemperature > this.coolingThresholdTemperature) {
          this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.COOL);
        } else {
          this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.OFF);
        }

        callback(null);
      });

    // Current Temperature
		this.service
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', callback => {
        this.log('CurrentTemperature:', this.currentTemperature);
        callback(null, this.currentTemperature);
      });

		this.service
			.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', callback => {
        this.log('TargetTemperature:', this.targetTemperature);
        callback(null, this.targetTemperature);
      })
			.on('set', (value, callback) => {
        this.log('SET TargetTemperature from', this.targetTemperature, 'to', value);
        this.targetTemperature = value;
        this.service.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.targetHeatingCoolingState);
        callback(null);
      });

    // °C or °F for units
		this.service
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
		this.service
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', callback => {
        this.log('CurrentRelativeHumidity:', this.currentRelativeHumidity);
        callback(null, this.currentRelativeHumidity);
      });

    // Auto max temperature
    this.service
			.getCharacteristic(Characteristic.CoolingThresholdTemperature)
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
    this.service
			.getCharacteristic(Characteristic.HeatingThresholdTemperature)
			.on('get', callback => {
        this.log('HeatingThresholdTemperature:', this.heatingThresholdTemperature);
        callback(null, this.heatingThresholdTemperature);
      })
			.on('set', (value, callback) => {
        this.log('SET HeatingThresholdTemperature from', this.heatingThresholdTemperature, 'to', value);
        this.heatingThresholdTemperature = value;
        callback(null);
      });

		this.service
			.getCharacteristic(Characteristic.Name)
      .on('get', callback => {
        callback(null, this.name);
      });

		this.service.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});

    this.service.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 1
			});

		return [informationService, this.service];
	}
}
