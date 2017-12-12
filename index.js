'use strict';

var Service;
var Characteristic;
var currentActive = 2;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-autoradiobutton', 'autoradiobutton', AutoRadioButton);
};

function AutoRadioButton(log, config) {
    this.log = log;

    this.name            = config.name             || 'RadioButton';
    this.type            = config.type;           
    
    this.manufacturer    = config.manufacturer     || 'Radiobutton';
    this.model           = config.model            || 'Radiobutton';

    switch (this.type) {
        case 'switch':
            this.onUrl   = this.host + config.on;
            this.offUrl  = this.host + config.off;
            this.onBody  = config.on_body          || '';
            this.offBody = config.off_body         || '';
            break;

        case 'multiswitch':
            this.multiswitch = config.multiswitch;
            break;

        default:
            throw new Error('Unknown homebridge-radiobutton switch type');
    }
}

AutoRadioButton.prototype = {
    
    setToogleState: function(targetService, powerState, callback, context) {
        let funcContext = 'fromSetToogleState';
        var reqUrl = '', reqBody = '';

        if (context == funcContext) { // callback safety
            if (callback) callback();
            return;
        }
        
        callback();

    },

    setPowerState: function(targetService, powerState, callback, context) {
        let funcContext = 'fromSetPowerState';
        var reqUrl = '', reqBody = '';

        if (context == funcContext) { // callback safety
            if (callback) callback();
            return;
        }

        switch(this.type) {
            case 'switch':
                if (!this.onUrl || !this.offUrl) {
                    this.log.warn('Ignoring request; No power state urls defined.');
                    callback(new Error('No power state urls defined.'));
                    return;
                }

                reqUrl  = powerState ? this.onUrl  : this.offUrl;
                reqBody = powerState ? this.onBody : this.offBody;

                break;

            case 'multiswitch':
                this.services.forEach(function (switchService, i) {
                    if (i === 0) return; // skip informationService at index 0
                    
                    if (targetService.subtype === switchService.subtype  && i == 1) {
                        currentActive += 1;
                        if (currentActive > this.services.length) {
                            currentActive = 3;
                        }
                        this.log('Current Active -> ' + currentActive);
                        
                        this.services.forEach(function (serv, j) {
                            if (j < 2) return; //
                            
                            if (j == currentActive) {
                                serv.getCharacteristic(Characteristic.On).setValue(true, undefined, funcContext);
                            } else {
                                serv.getCharacteristic(Characteristic.On).setValue(false, undefined, funcContext);
                            }
                        });
                        
                        switchService.getCharacteristic(Characteristic.On).setValue(false, undefined, funcContext);
                        
                    } else {
                        if (targetService.subtype === switchService.subtype) { // turn on
                            switchService.getCharacteristic(Characteristic.On).setValue(true, undefined, funcContext);
                        } else { // turn off
                            switchService.getCharacteristic(Characteristic.On).setValue(false, undefined, funcContext);
                        }
                    }

                }.bind(this));
                break;

            default:
                this.log('Unknown homebridge-Radiobutton type in setPowerState');
        }
        this.log('==> ' + targetService.subtype);
        callback();

    },

    identify: function (callback) {
        this.log('Identify me Senpai!');
        callback();
    },

    getServices: function () {
        this.services = [];

        let informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model);
        this.services.push(informationService);

        switch (this.type) {
            case 'switch':
                this.log.warn('[Switch]: ' + this.name);

                let switchService = new Service.Switch(this.name);
                switchService
                    .getCharacteristic(Characteristic.On)
                    .on('set', this.setPowerState.bind(this, switchService));

                this.services.push(switchService);

                break;
            case 'multiswitch':
                this.log.warn('[Multiswitch]: ' + this.name);
                
                let mainSwitch = new Service.Switch("Toglers", "Toglers");

                // Bind a copy of the setPowerState function that sets 'this' to the accessory and the first parameter
                // to the particular service that it is being called for. 
                let boundSetPowerState = this.setPowerState.bind(this, mainSwitch);
                mainSwitch
                    .getCharacteristic(Characteristic.On)
                    .on('set', boundSetPowerState);

                this.services.push(mainSwitch);
 
                this.multiswitch.forEach(function(switchItem, i) {
                    switch(i) {
                        case 0:
                            this.log.warn('---+--- ' + switchItem.name); break;
                        case this.multiswitch.length-1:
                            this.log.warn('   +--- ' + switchItem.name); break;
                        default:
                            this.log.warn('   |--- ' + switchItem.name);
                    }

                    let switchService = new Service.Switch(switchItem.name, switchItem.name);

                    // Bind a copy of the setPowerState function that sets 'this' to the accessory and the first parameter
                    // to the particular service that it is being called for. 
                    let boundSetPowerState = this.setPowerState.bind(this, switchService);
                    switchService
                        .getCharacteristic(Characteristic.On)
                        .on('set', boundSetPowerState);

                    this.services.push(switchService);
                }.bind(this));

                break;
            default:
                this.log('Unknown homebridge-Radiobutton type in getServices');
        }
        
        return this.services;
    }
};
