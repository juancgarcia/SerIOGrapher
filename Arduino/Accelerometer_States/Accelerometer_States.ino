/* ============================================
I2Cdev device library code is placed under the MIT license
Copyright (c) 2011 Jeff Rowberg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
===============================================
*/

// I2Cdev and MPU6050 must be installed as libraries, or else the .cpp/.h files
// for both classes must be in the include path of your project
#include "I2Cdev.h"
#include "MPU6050.h"

// Arduino Wire library is required if I2Cdev I2CDEV_ARDUINO_WIRE implementation
// is used in I2Cdev.h
#if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
    #include "Wire.h"
#endif

// class default I2C address is 0x68
// specific I2C addresses may be passed as a parameter here
// AD0 low = 0x68 (default for InvenSense evaluation board)
// AD0 high = 0x69
MPU6050 accelgyro;
//MPU6050 accelgyro(0x69); // <-- use for AD0 high

int16_t ax, ay, az;
int16_t gx, gy, gz;


// uncomment "OUTPUT_READABLE_ACCELGYRO" if you want to see a tab-separated
// list of the accel X/Y/Z and then gyro X/Y/Z values in decimal. Easy to read,
// not so easy to parse, and slow(er) over UART.
//#define OUTPUT_READABLE_ACCELGYRO

// #define DEBUG

#ifdef DEBUG
 #define DEBUG_PRINT(x)  Serial.print (x)
 #define DEBUG_PRINTLN(x)  Serial.println (x)
#else
 #define DEBUG_PRINT(x)
 #define DEBUG_PRINTLN(x)
#endif

#define USE_ACCEL 3
// #define USE_GYRO 3


#define LED_PIN 13
bool blinkState = false;

uint16_t lastReport;

const int numReadings = 25;

#if defined(USE_ACCEL) && defined(USE_GYRO)
const int numAxis = USE_ACCEL + USE_GYRO;
const int AX = 0;
const int AY = 1;
const int AZ = 2;
const int GX = 3;
const int GY = 4;
const int GZ = 5;
#elif defined(USE_ACCEL)
const int numAxis = USE_ACCEL;
const int AX = 0;
const int AY = 1;
const int AZ = 2;
#elif defined(USE_GYRO)
const int numAxis = USE_GYRO;
const int GX = 0;
const int GY = 1;
const int GZ = 2;
#endif

int32_t readings[numAxis][numReadings];  // the reading history
int32_t readIndex[numAxis];              // the index of the current reading
int32_t total[numAxis];                  // the running total
int32_t average[numAxis];                // the average

boolean flat = false;
uint32_t flatStarted = 0;
uint32_t flatDuration = 0;
uint32_t flatLastEnded = 0;

boolean vertical = false;
uint32_t verticalStarted = 0;
uint32_t verticalDuration = 0;
uint32_t verticalLastEnded = 0;

boolean glowing = false;
uint32_t glowEnd = -1;
const uint32_t glowDuration = 2500;



void setup() {
  lastReport = millis();
    // join I2C bus (I2Cdev library doesn't do this automatically)
    #if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
        Wire.begin();
    #elif I2CDEV_IMPLEMENTATION == I2CDEV_BUILTIN_FASTWIRE
        Fastwire::setup(400, true);
    #endif

    // initialize serial communication
    // (38400 chosen because it works as well at 8MHz as it does at 16MHz, but
    // it's really up to you depending on your project)
    Serial.begin(38400);

    // initialize device
    DEBUG_PRINTLN("Initializing I2C devices...");
    accelgyro.initialize();

    // supply your own gyro offsets here, scaled for min sensitivity
    accelgyro.setXGyroOffset(-1100);
    accelgyro.setYGyroOffset(271);
    accelgyro.setZGyroOffset(-60);
    accelgyro.setXAccelOffset(-2509);
    accelgyro.setYAccelOffset(-101);
    accelgyro.setZAccelOffset(925); // 1688 factory default for my test chip

    // verify connection
    DEBUG_PRINTLN("Testing device connections...");
    DEBUG_PRINTLN(accelgyro.testConnection() ? "MPU6050 connection successful" : "MPU6050 connection failed");

    // configure Arduino LED for
    pinMode(LED_PIN, OUTPUT);
    

    // zero-fill all the arrays:
    for (int axis = 0; axis < numAxis; axis++) {
        readIndex[axis] = 0;
        total[axis] = 0;
        average[axis] = 0;
        for (int i = 0; i<numReadings; i++){
            readings[axis][i] = 0;
        }
    }
}


void loop() {
    // read raw accel/gyro measurements from device
    accelgyro.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    #ifdef USE_ACCEL
        smooth(AX, ax);
        smooth(AY, ay);
        smooth(AZ, az);
    #endif

    #ifdef USE_GYRO
        smooth(GX, gx);
        smooth(GY, gy);
        smooth(GZ, gz);
    #endif

    #ifdef OUTPUT_READABLE_ACCELGYRO
        reportAcccelGyro();
    #endif

    checkFlat();
    checkVertical();
    reportStates();

    if(wasLifted()){
        glowing = true;
    }

    handleLights();
}


void checkFlat(){
    #ifdef USE_ACCEL
    if( abs(average[AZ]) > 15000 && abs(average[AY]) < 5100 ){
        if(!flat){
            flatStarted = millis();
        }
        flatLastEnded = millis();
            
        flatDuration = millis() - flatStarted;
        
        flat = true;
    } else {
        flat = false;
    }
    #endif
}


void checkVertical(){
    #ifdef USE_ACCEL
    boolean AZ_in_range = abs(average[AZ]) < 8000;
    boolean AX_in_range = abs(average[AX]) < 8000;
    boolean AY_in_range = average[AY] < -13500;
    if( AZ_in_range && AX_in_range && AY_in_range ){
        if(!vertical){
            verticalStarted = millis();
        }
        verticalLastEnded = millis();
            
        verticalDuration = millis() - verticalStarted;
        
        vertical = true;
    } else {
        vertical = false;
    }
    #endif
}


void reportStates(){
    DEBUG_PRINT("flat: ");
    DEBUG_PRINT(flat);
    DEBUG_PRINT(" duration: ");
    DEBUG_PRINT(flatDuration);
    DEBUG_PRINT(" since last: ");
    DEBUG_PRINT(millis() - flatLastEnded);

    DEBUG_PRINT(" | vertical: ");
    DEBUG_PRINT(vertical);
    DEBUG_PRINT(" duration: ");
    DEBUG_PRINT(verticalDuration);
    DEBUG_PRINT(" since last: ");
    DEBUG_PRINT(millis() - verticalLastEnded);

    DEBUG_PRINT(" Glowing?: ");
    DEBUG_PRINTLN(glowing);
}


// display tab-separated accel/gyro x/y/z values
void reportAcccelGyro(){

    #ifdef USE_ACCEL
        DEBUG_PRINT(average[AX]);
        DEBUG_PRINT("\t");

        DEBUG_PRINT(average[AY]);
        DEBUG_PRINT("\t");

        DEBUG_PRINT(average[AZ]);
        DEBUG_PRINT("\t");
    #endif

    #ifdef USE_GYRO
        DEBUG_PRINT(average[GX]);
        DEBUG_PRINT("\t");

        DEBUG_PRINT(average[GY]);
        DEBUG_PRINT("\t");

        DEBUG_PRINT(average[GZ]);
        DEBUG_PRINT("\t");
    #endif

        DEBUG_PRINT(millis());
        DEBUG_PRINT("\t");

        DEBUG_PRINTLN(millis() - lastReport);
        lastReport = millis();
}


boolean wasLifted(){
    if(vertical && verticalDuration > 200 && millis() - flatLastEnded < 1000 && 250 < flatDuration && flatDuration < 2500 ){
        // Sword of Omens, Give Me Sight Beyond Sight!
        return true;
    }

    return false;
}


void handleLights(){
    if(glowing){
        DEBUG_PRINTLN("GLOWING!");
        if(glowEnd == -1)
            glowEnd = millis() + glowDuration;

        if(millis() > glowEnd)
            glowing = false;

        // run glow function here

        blinkState = !blinkState;
    }
    if(!glowing){
        // do some variable cleanup
        glowEnd = -1;
        blinkState = false;
    }
    digitalWrite(LED_PIN, blinkState);
}


void smooth(int axis, int32_t val) {
    // pop and subtract the last reading:
    total[axis] -= readings[axis][readIndex[axis]];
    total[axis] += val;

    // add value to running total
    readings[axis][readIndex[axis]] = val;
    readIndex[axis]++;

    if(readIndex[axis] >= numReadings)
        readIndex[axis] = 0;

    // calculate the average:
    average[axis] = total[axis] / numReadings;
}