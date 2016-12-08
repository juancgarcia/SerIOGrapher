// Make raw serial port data available via websocket

const Server = require('socket.io');
const SerialPort = require('socket.io-serialport');
const RealSerialPort = require('serialport');
 
const io = new Server(8080);
 
const serialport = new SerialPort({
  io: io,
  route: '/port/COM3',
  captureFile: './COM3.out',
  retryPeriod: 1000,
  device: 'COM3',
  options: {
    baudrate: 38400,
    parser: RealSerialPort.parsers.readline('\r\n')
  }
});
 
serialport.open()
.then(() => {
  console.log('port opened');
 
  // And when done (shutting down, etc) 
  // serialport.close()
  // .then(() => {
  //   console.log('port closed');
  // });
});