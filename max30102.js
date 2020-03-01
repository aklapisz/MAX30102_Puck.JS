const C = {
  
I2C_WRITE_ADDR: 0xAE,
I2C_READ_ADDR: 0xAF,

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


function MAX30102(i2c, options) {
    this.options = options||{};
    this.i2c = i2c;
    this.ad = C.VL6180X_DEFAULT_I2C_ADDR;
}


MAX30102.prototype.read8 = function(reg) {
    this.i2c.writeTo(this.ad, reg >> 8, reg & 0xff);
    var data = this.i2c.readFrom(this.ad, 0x01);
    return data[0];
};

MAX30102.prototype.write8 = function(reg, value) {
    this.i2c.writeTo(this.ad, reg >> 8, reg & 0xff, value);
};


MAX30102.prototype.reset = function(){
    this.i2c.writeTo(this.ad,REG_MODE_CONFIG,0x40);
};


MAX30102.prototype.init = function(){
  i2c_init();
  if(!maxim_max30102_write_reg(REG_INTR_ENABLE_1,0xc0)) // INTR setting
    return false;
  if(!maxim_max30102_write_reg(REG_INTR_ENABLE_2,0x00))
    return false;
  if(!maxim_max30102_write_reg(REG_FIFO_WR_PTR,0x00))  //FIFO_WR_PTR[4:0]
    return false;
  if(!maxim_max30102_write_reg(REG_OVF_COUNTER,0x00))  //OVF_COUNTER[4:0]
    return false;
  if(!maxim_max30102_write_reg(REG_FIFO_RD_PTR,0x00))  //FIFO_RD_PTR[4:0]
    return false;
  if(!maxim_max30102_write_reg(REG_FIFO_CONFIG,0x4f))  //sample avg = 4, fifo rollover=false, fifo almost full = 17
    return false;
  if(!maxim_max30102_write_reg(REG_MODE_CONFIG,0x03))   //0x02 for Red only, 0x03 for SpO2 mode 0x07 multimode LED
    return false;
  if(!maxim_max30102_write_reg(REG_SPO2_CONFIG,0x27))  // SPO2_ADC range = 4096nA, SPO2 sample rate (100 Hz), LED pulseWidth (411uS)
    return false;
  
  if(!maxim_max30102_write_reg(REG_LED1_PA,0x24))   //Choose value for ~ 7mA for LED1
    return false;
  if(!maxim_max30102_write_reg(REG_LED2_PA,0x24))   // Choose value for ~ 7mA for LED2
    return false;
  if(!maxim_max30102_write_reg(REG_PILOT_PA,0x7f))   // Choose value for ~ 25mA for Pilot LED
    return false;
  return true;  
};



exports.connect = function(i2c, options) {
  return new MAX30102(i2c, options);
};
