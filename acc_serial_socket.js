const commandLineArgs = require('command-line-args');
const socketio = require('socket.io');
const SocketIOSerialPort = require('socket.io-serialport');
const RealSerialPort = require('serialport');

const express = require('express')
const http = require('http')
const app = express()
const server = http.Server(app)
let port_number = 0
let serialBaudrate = 38400
let serialRoute
let serialDevice

app.set('port', process.env.PORT || 8080)
app.use('/', express.static('./public'))

const optionDefinitions = [
  { name: 'list_ports', alias: 'l', type: Boolean },
  { name: 'port_number', alias: 'p', type: Number, defaultValue: 3 }
];
const options = commandLineArgs(optionDefinitions);

let portPrefix = ''
if (process.platform === 'linux') {
  portPrefix = '/dev/ttyS'
} else if (process.platform === 'win32') {
  portPrefix = 'COM'
} else {
  console.log('Currently only supports linux and windows, Sorry!')
  console.log('Feel free to edit submit a PR for enumerating/reading serial ports on other systems')
  process.exit()
}

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

  port_number = parseInt(options.port_number, 10);

  // console.log(JSON.stringify(port_number));

  const io = new socketio(server);
  
  serialRoute = '/port/COM'+port_number
  serialDevice = portPrefix+port_number

  const serialport = new SocketIOSerialPort({
    io: io,
    route: serialRoute,
    captureFile: './COM'+port_number+'.out',
    retryPeriod: 1000,
    device: serialDevice,
    options: {
      baudrate: serialBaudrate,
      parser: RealSerialPort.parsers.readline('\r\n')
    }
  });
  
  serialport.on('log', (msg) => {console.log(msg)})
  serialport.on('status', (msg) => {console.log(msg)})

  serialport.open()
  .then(() => {
    console.log(`port opened: ${port_number}`);

    // And when done (shutting down, etc) 
    // serialport.close()
    // .then(() => {
    //   console.log('port closed');
    // });
  });

}

app.get('/serial_config', (req, res) => {
  const config = {
    port: port_number,
    route: serialRoute,
    device: serialDevice,
    baudrate: serialBaudrate
  }
  res.send(`${JSON.stringify(config)}`);
})

const listener = server.listen(app.get('port'), (err) => {
  if (err) console.error(err)
  console.log(`Listening on ${listener.address().port}`)
})