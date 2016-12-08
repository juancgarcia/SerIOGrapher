// Reads 6-axis data from an MPU6050 accelerometer via an arduino
// dumps data to console
//
// Arduino Sketch:
//  MPU6050_raw from examples here: https://github.com/jrowberg/i2cdevlib

const SerialPort = require('serialport');

// SerialPort.list(function (err, ports) {
//   ports.forEach(function(port) {
//     console.log(JSON.stringify(port, null, 4));
//   });
// });
 
var port = new SerialPort('COM3'/*'/dev/ttyS2'*/, {
  baudRate: 38400,
  parser: SerialPort.parsers.readline('\r\n')
});

port.on('data', function (data) {
  var parts = data.split("\t");
  var obj = {
    ax: parts[0],
    ay: parts[1],
    az: parts[2],
    gx: parts[3],
    gy: parts[4],
    gz: parts[5]
  };
  console.log(JSON.stringify(obj, null ,4));
});