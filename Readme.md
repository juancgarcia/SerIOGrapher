# SerIOGrapher

read streaming serial data (from an arduino for instance) and plot it on a moving graph in your browser. 


Uses [Rickshaw](https://github.com/shutterstock/rickshaw), socket.io, socket.io-serialport


## Installation

Git clone or download/extract zip

```bash
cd SerIOGrapher
npm install
```

## Usage

### List serial port(s) info

```bash
node acc_serial_socket.js -l
```

### Run serial socket server

default serialport is number 3
(`COM3` on windows, `/dev/ttyS3` on linux *)

```bash
node acc_serial_socket.js
```

specifying a different port number

```bash
node acc_serial_socket.js -p 2
```

(* Mac users will need to manually edit the `portPrefix` section in `acc_serial_socket.js` to whatever is appropriate for their system)


### Run graph webpage

open [http://localhost:8080](http://localhost:8080) in your browser of choice to see the data rendered. (tested on Chrome 55.0.2883.87 m 64-bit)

![graph](img/graph.png)

Click Snapshot to duplicate a frozen copy of the current graph window.

![graph](img/snapped.png)

Trace over the snapshot with your cursor to see data values.

![graph](img/trace.png)

Use the slider to zoom in on the relevant data.

![graph](img/zoom.png)