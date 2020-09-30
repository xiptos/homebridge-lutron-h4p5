import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { HomeworksPlatform } from './platform';
interface SetBrightnessCallback { (value: number, isDimmable:boolean, accesory:HomeworksAccesory): void }


//*************************************
/**
 * HomeworksAccesory
 * An instance of this class is created for each accessory your platform registers
 */
export class HomeworksAccesory {
  private service: Service;
  public setHomekitBrightnessCallback? : SetBrightnessCallback;

  public dimmerState = {
    On: false,
    Brightness: 0,
  }

  private _name;
  private _integrationId;
  private _UUID;
  private _dimmable = true;
  
  constructor(
    private readonly platform: HomeworksPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly uuid: string,
    private readonly integrationId: string,
    private readonly dimmable: boolean,
  ) {
    
    //Assign local variables
    this._name = accessory.context.device.name;
    this._UUID = uuid;
    this._integrationId = integrationId;
    this._dimmable = dimmable;

    //Set Info
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Homeworks Plugin')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'n/a')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, 0.2);

    //Assign HK Service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    //Set Characteristic Name
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // register handlers for the On/Off Characteristic (minimum for lightbulb)
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    if (dimmable === true) {      
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)        
        .on('set', this.setBrightness.bind(this))       // SET - bind to the 'setBrightness` method below
        .on('get', this.getBrightness.bind(this));      // GET - bind to the 'getBrightness` method below
    } 
  }

  //*************************************
  //* Class Getters
  /**
   * Handle the "GET" integrationId
   * @example
   * getIntegrationId() 
   */
  public getIntegrationId() {
    return this._integrationId;
  }

  /**
   * Handle the "GET" name
   * @example
   * getName() 
   */
  public getName() {
    return this._name;
  }

  /**
   * Handle the "GET" UUID
   * @example
   * getUUID() 
   */
  public getUUID() {
    return this._UUID;
  }


  /**
   * Handle the "GET" UUID
   * @example
   * getUUID() 
   */
  public getIsDimmable() {
    return this._dimmable;
  }

  //*************************************
  //* HomeBridge Delegates 
  
  /**
   * Handle the "SET/GET" ON requests from HomeKit
   */

  private setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    const isDimmable = this.getIsDimmable();
    this.dimmerState.On = value as boolean;
    

    if (value === true) {
      this.dimmerState.Brightness = 100;
      if (this.setHomekitBrightnessCallback) {
        this.setHomekitBrightnessCallback(100, isDimmable, this);
      }
    } else {
      this.dimmerState.Brightness = 0;
      if (this.setHomekitBrightnessCallback) {
        this.setHomekitBrightnessCallback(0, isDimmable, this);
      }
    }
  
    this.platform.log.debug('[Accesory] setOn: %s [name: %s / dim: %s]', 
      this.dimmerState.On, this._name, this._dimmable);
    callback(null);
  }



  private getOn(callback: CharacteristicGetCallback) {
    // implement your own code to check if the device is on
    const isOn = this.dimmerState.On;

    if (isOn) {
      this.platform.log.debug('[Accesory] Get Characteristic isOn -> ON %s', this._name);      
    } else {
      this.platform.log.debug('[Accesory] Get Characteristic isOn -> OFF %s', this._name);      
    }
    
    callback(null, isOn); //error,value
  }    

  /**
   * Handle the "SET/GET" Brightness requests from HomeKit
   */

  private getBrightness(callback: CharacteristicGetCallback) {    
    const brightness = this.dimmerState.Brightness;

    this.platform.log.debug('[Accesory] Get Characteristic Brightness -> %i %s', brightness, this._name);
    
    callback(null, brightness); //error,value
  }


  private setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.debug('[Accesory] Set Characteristic Brightness -> %i %s', value, this.getName());

    let brightnessVal = value as number;
    const isDimmable = this.getIsDimmable();

    if (isDimmable === false) { // No Dim? Brightness should be 0 or 100%
      if (this.dimmerState.On === true || brightnessVal > 0) {
        brightnessVal = 100;        
      } else {
        brightnessVal = 0;
      } 
    }
        
    this.dimmerState.Brightness = brightnessVal;
    
    if (brightnessVal > 0) {
      this.dimmerState.On = true; 
    } else {
      this.dimmerState.On = false; 
    }    

    if (this.setHomekitBrightnessCallback) {
      this.setHomekitBrightnessCallback(brightnessVal, isDimmable, this); 
    }
    
    

    callback(null); // null or error
  }

  //*************************************
  //* Accesory Interface 

  /**
   * Called from platform when we need to update Homekit
   * With new values from processor.
   */
  
  public updateBrightness(brightnessVal: CharacteristicValue) {
    this.platform.log.debug('[Accesory] Update Characteristic Brightness -> %i %s', brightnessVal, this._name);
    this.dimmerState.Brightness = brightnessVal as number;    
    if (brightnessVal > 0) {
      this.dimmerState.On = true; 
    } else {
      this.dimmerState.On = false;       
    }

    
    if (this.dimmerState.On === true) {
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }
    
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightnessVal);
  }

}
