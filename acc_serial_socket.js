const commandLineArgs = require('command-line-args');
const Server = require('socket.io');
const SerialPort = require('socket.io-serialport');
const RealSerialPort = require('serialport');

const optionDefinitions = [
  { name: 'list_ports', alias: 'l', type: Boolean },
  { name: 'port_number', alias: 'p', type: Number, defaultValue: 3 }
];
const options = commandLineArgs(optionDefinitions);

// console.log(JSON.stringify(options));

if( options.list_ports ) {

  RealSerialPort.list(function (err, ports) {
    ports.forEach(function(port) {
      console.log(port.comName);
      console.log(port.pnpId);
      console.log(port.manufacturer);
    });
  });

} else {

  const port_number = parseInt(options.port_number, 10);

  // console.log(JSON.stringify(port_number));

  const io = new Server(8080);

  const serialport = new SerialPort({
    io: io,
    route: '/port/COM'+port_number,
    captureFile: './COM'+port_number+'.out',
    retryPeriod: 1000,
    device: 'COM'+port_number,
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

}