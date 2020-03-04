const C = {
  
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
REG_PART_ID: 0xFF,
  
};


function MAX30102(i2c) {
    this.i2c = i2c;
    this.ad = C.I2C_ADDR;
}


MAX30102.prototype.read8 = function(reg) {
    this.write8(this.ad, reg);
    return this.i2c.readFrom(this.ad,1);
};

MAX30102.prototype.write8 = function(reg, value) {
    this.i2c.writeTo(this.ad, reg, value);
};


MAX30102.prototype.reset = function(){
  this.write8(C.REG_MODE_CONFIG,0x40);
};


MAX30102.prototype.init = function(){
  
  this.write8(C.REG_INTR_ENABLE_1, 0xc0); // INTR setting
  
  this.write8(C.REG_INTR_ENABLE_2, 0x00);
   
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


MAX30102.prototype.read_fifo = function(){
  this.read8(C.REG_INTR_STATUS_1); 
  this.read8(C.REG_INTR_STATUS_2);
  return this.read8(C.I2C_READ_ADDR);
};

exports.connect = function(i2c) {
  return new MAX30102(i2c);
};
