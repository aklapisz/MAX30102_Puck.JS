//NOTE!!!
/* In order to use this library properly, certain objects in main code need to be declared...

var register_data = {
  un_brightness: 0,
  buffer_length: 100,
  un_min: 0x3FFF,
  un_max: 0,
  un_prev_data: 0,
  ir_buffer: new Array(this.buffer_length),
  red_buffer: new Array(this.buffer_length)
};


var saturated_data = {
  n_spo2: 0,  //SPO2 value
  ch_spo2_valid: false,  //shows if the SPO2 calculation is valid
  n_heart_rate: 0, //heart rate value
  ch_hr_valid: false,
  temperature: 0
};

*/


//object that holds all relavant register addresses on the MAX30102
const C = {
  //main address
  I2C_ADDR: 0b1010111,

  //register addresses
  REG_INTR_STATUS_1: 0x00,
  REG_INTR_STATUS_2: 0x01,
  REG_INTR_ENABLE_1: 0x02,
  REG_INTR_ENABLE_2: 0x03,
  REG_FIFO_WR_PTR: 0x04,
  REG_OVF_COUNTER: 0x05,
  REG_FIFO_RD_PTR: 0x06,
  REG_FIFO_DATA: 0x07,
  REG_FIFO_CONFIG: 0x08,
  REG_MODE_CONFIG: 0x09,
  REG_SPO2_CONFIG: 0x0A,
  REG_LED1_PA: 0x0C,
  REG_LED2_PA: 0x0D,
  REG_PILOT_PA: 0x10,
  REG_MULTI_LED_CTRL1: 0x11,
  REG_MULTI_LED_CTRL2: 0x12,
  REG_TEMP_INTR: 0x1F,
  REG_TEMP_FRAC: 0x20,
  REG_TEMP_CONFIG: 0x21,
  REG_PROX_INT_THRESH: 0x30,
  REG_REV_ID: 0xFE,
  REG_PART_ID: 0xFF
};


//object that holds all data to be used for HR/SpO2 functions
let processingData = {
an_x: new Array(BUFFER_SIZE),
an_y: new Array(BUFFER_SIZE),
f_ir_sumsq: 0.0,
f_red_sumsq: 0.0,
ratio: 0,
correl: 0
};



////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Main functions to communicate with MAX30102 via I2C


//creates software I2C port for Espruino devices
function MAX30102(i2c) {
    this.i2c = i2c;
    this.ad = C.I2C_ADDR;
}


//basic function to read 8 bits from MAX30102 from a specified register via i2c
MAX30102.prototype.read8 = function(reg) {
    this.i2c.writeTo(this.ad, reg);
    return this.i2c.readFrom(this.ad,1);
};



//basic function to write 8 bits to a specified register in the MAX30102 via i2c
MAX30102.prototype.write8 = function(reg, value) {
    this.i2c.writeTo(this.ad, reg, value);
};


//function to reset the MAX30102
//note: this should be called before initilzing the MAX30102 to clear all registers
MAX30102.prototype.reset = function(){
  this.write8(C.REG_MODE_CONFIG,0x40);
};


//initilizes the settings of the MAX30102 by writing a specific configuration to each desired register and also resets FIFO pointers
//note:to use different settings, change the value being written to the register that controls the setting (reference MAX30102 datasheet)
MAX30102.prototype.init = function(){
  
  this.write8(C.REG_INTR_ENABLE_1, 0xc0); // INTR setting  
  this.write8(C.REG_INTR_ENABLE_2, 0x02);
   
  this.write8(C.REG_FIFO_WR_PTR,0x00);  //FIFO_WR_PTR[4:0]
  this.write8(C.REG_OVF_COUNTER, 0x00);  //OVF_COUNTER[4:0]
  this.write8(C.REG_FIFO_RD_PTR, 0x00);  //FIFO_RD_PTR[4:0]
  
  this.write8(C.REG_FIFO_CONFIG, 0x0f);  //sample avg = 4, fifo rollover=false, fifo almost full = 17
  this.write8(C.REG_MODE_CONFIG,0x03);  //0x02 for Red only, 0x03 for SpO2 mode 0x07 multimode LED
  this.write8(C.REG_SPO2_CONFIG,0x27);  // SPO2_ADC range = 4096nA, SPO2 sample rate (100 Hz), LED pulseWidth (411uS)
    
  this.write8(C.REG_LED1_PA,0x24);  //Choose value for ~ 7mA for LED1
  this.write8(C.REG_LED2_PA,0x24);  // Choose value for ~ 7mA for LED2
  this.write8(C.REG_PILOT_PA,0x7f);   // Choose value for ~ 25mA for Pilot LED 
  
};


//reads data stores in FIFO register
//note:this data holds amount of reflected light, NOT the actual heart rate/SPo2.
//in order to get heart rate/SpO2, use this function to collect data and then send collected data to saturate_data
MAX30102.prototype.read_fifo_data = function(register_data, i){
  
  var temp_data_array = new Array(6);
  
  this.read8(C.REG_INTR_STATUS_1);
  this.read8(C.REG_INTR_STATUS_2);
  
  this.i2c.writeTo(this.ad, C.REG_FIFO_DATA);
  temp_data_array = this.i2c.readFrom(this.ad,6);
  
  register_data.red_buffer[i] = temp_data_array[0]<<16;
  register_data.red_buffer[i] = temp_data_array[1]<<8;
  register_data.red_buffer[i] = temp_data_array[2];
  
  register_data.ir_buffer[i] = temp_data_array[3]<<16;
  register_data.ir_buffer[i] = temp_data_array[4]<<8;
  register_data.ir_buffer[i] = temp_data_array[5];
  
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions for temperature reading


//sends an activate bit to MAX30102 to store a temperature reading
//note: this function needs to be called first, then call getTemperature to get the temperature reading
MAX30102.prototype.set_temperature_read = function(){

  heart_sensor.write8(C.REG_TEMP_CONFIG, 0x01);

};

//gets a temperature reading from the MAX30102
//note: set_temperature_read needs to be called first before using this function
MAX30102.prototype.getTemperature = function(saturated_data, unit){
  
  var temperature_int;
  var temperature_frac;
  var temperature;
  
  this.read8(C.REG_INTR_STATUS_1);
  this.read8(C.REG_INTR_STATUS_2);
 
  temperature_int = this.read8(C.REG_TEMP_INTR)[0];  
  temperature_frac = this.read8(C.REG_TEMP_FRAC)[0];
  
  temperature = temperature_int + (temperature_frac * 0.0625);
  
  if(unit == 0){
    saturated_data.temperature = temperature;
  }else{
    saturated_data.temperature = 1.80 * (temperature) + 32.00;
  }
  
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////




////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions for HR/SpO2 calculation

MAX30102.prototype.saturate_data = function(register_data, saturated_data){
////////////////////
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////////////////////////////////
//functions to connect library with espruino


exports.connect = function(i2c) {
  return new MAX30102(i2c);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////
