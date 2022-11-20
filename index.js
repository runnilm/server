const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const five = require('johnny-five');
const board = new five.Board({ 
    port: "/dev/ttyACM1",
    repl: false 
});

const favicon = require('serve-favicon');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const ip = require('ip');
const PORT = 3030;
const serverIP = `${ip.address()}:${PORT}`

const timestamp = require('log-timestamp');
const readline = require('readline');

const nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

var misterToggleText = {
    from: process.env.SMTP_USER,
    to: process.env.SMTP_RECEIVER,
    subject: 'Mister Alert',
    text: 'The misting pump has been turned on.'
};
var uvToggleText = {
    from: process.env.SMTP_USER,
    to: process.env.SMTP_RECEIVER,
    subject: 'UVB Alert',
    text: 'The UVB light has been turned on.'
};
var baskingToggleText = {
    from: process.env.SMTP_USER,
    to: process.env.SMTP_RECEIVER,
    subject: 'Basking Alert',
    text: 'The basking light has been turned on.'
};
var cheToggleText = {
    from: process.env.SMTP_USER,
    to: process.env.SMTP_RECEIVER,
    subject: 'CHE Alert',
    text: 'The CHE has been turned on.'
};
var ledToggleText = {
    from: process.env.SMTP_USER,
    to: process.env.SMTP_RECEIVER,
    subject: 'LED Alert',
    text: 'The LED has been turned on.'
};

var numPOST = 0;
var timeDiff = 0;
var currentPOSTTime;
var lastPOSTTime;
var timeAvg = 0;
var timeMin = 0;
var timeMax = 0;

var temp1 = 0, temp2 = 0, temp3 = 0, temp4 = 0, temp5 = 0,
    dhtHum = 0, dhtTemp = 0, mistLevel = 0, wasteLevel = 0,
    leftDoorState, rightDoorState, leftDoor, rightDoor;

var uvValue,
    misterValue;
    //baskingValue,
    //cheValue;
    //ledValue

board.on('ready', function () {
    // 8-channel relay
    const uvRelay       = new five.Relay(50);   // uv light
    const misterRelay   = new five.Relay(49);   // misting pump
    //const baskingRelay  = new five.Relay(3);  // basking lamp
    //const cheRelay      = new five.Relay(4);  // ceramic heat emitter
    //const ledRelay      = new five.Relay(5);  // led grow light

    // boot with relays off (active low)
    uvRelay.close(); // close() == OFF, open() == ON
    misterRelay.close(); // UNTIL NPN TRANSISTOR IS FIXED
    //baskingRelay.close();
    //cheRelay.close();
    //ledRelay.close();

    uvValue         = false;
    misterValue     = false;
    //baskingValue    = false;
    //cheValue        = false;
    //ledValue        = false;

    io.on('connection', function (socket) {
        process.stdout.cursorTo(0, 9);
        process.stdout.clearLine(0);
        process.stdout.write('Client connected... @' + new Date());

        socket.on('toggleUV', function() {
            uvRelay.toggle();
            uvValue = !uvValue;

            if (uvValue) {
                transporter.sendMail(uvToggleText, function(error, info) {
                    if (error) {
                        console.log('sendmail' + error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }

            /* // active high
            if (value) {
                uvRelay.open();
            } else {
                uvRelay.close();
            }
            uvValue = value;
            socket.emit('uvValue', value); */
        });

        socket.on('toggleMister', function() {
            misterRelay.toggle();
            misterValue = !misterValue;

            if (misterValue) {
                transporter.sendMail(misterToggleText, function(error, info) {
                    if (error) {
                        console.log('sendmail' + error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }
            
            /* // active high
            if (value) {
                misterRelay.open();
            } else {
                misterRelay.close();
            }
            misterValue = value;
            socket.emit('misterValue', value); */
        });

        /* socket.on('toggleBasking', function (value) {
            baskingRelay.toggle();
            baskingValue = !baskingValue;

            if (baskingValue) {
                transporter.sendMail(baskingToggleText, function(error, info) {
                    if (error) {
                        console.log('sendmail' + error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }

            // active high
            if (value) {
                baskingRelay.open();
            } else {
                baskingRelay.close();
            }
            baskingValue = value;
            socket.emit('baskingValue', value);
        }) */

        /* socket.on('toggleCHE', function (value) {
            cheRelay.toggle();
            cheValue = !cheValue;

            if (cheValue) {
                transporter.sendMail(cheToggleText, function(error, info) {
                    if (error) {
                        console.log('sendmail' + error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }

            // active high
            if (value) {
                cheRelay.open();
            } else {
                cheRelay.close();
            }
            cheValue = value;
            socket.emit('cheValue', value);
        }) */

        /* socket.on('toggleLED', function() {
            ledRelay.toggle();
            ledValue = !ledValue;

            if (ledValue) {
                transporter.sendMail(ledToggleText, function(error, info) {
                    if (error) {
                        console.log('sendmail' + error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }
            
            //// active high
            if (value) {
                ledRelay.open();
            } else {
                ledRelay.close();
            }
            ledValue = value;
            socket.emit('ledValue', value);
        }); */

        socket.emit('uvValue', uvValue);
        socket.emit('misterValue', misterValue);
        //socket.emit('baskingValue', baskingValue);
        //socket.emit('cheValue', cheValue);
        //socket.emit('ledValue', ledValue);
    });

    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use('/css', express.static(path.join(__dirname, 'public/css')));
    app.use(favicon(path.join(__dirname, 'public', 'images', 'reptile.ico')));

    app.use('/', (req, res, next) => {
        res.render('index.pug', { temp1: temp1, temp2: temp2, temp3: temp3, 
                                temp4: temp4, temp5: temp5, dhtHum: dhtHum,
                                leftDoor: leftDoor, rightDoor: rightDoor,
                                mistLevel: mistLevel, wasteLevel: wasteLevel });
        next();
    });

    app.post('/temperatures', (req, res, next) => {
        getTime();

        let body = JSON.parse(JSON.stringify(req.body));
        let reading = {
            date: new Date(),
            temp1: body.temp1,
            temp2: body.temp2,
            temp3: body.temp3,
            temp4: body.temp4,
            temp5: body.temp5,
            dhtHum: body.dhtHum,
            dhtTemp: body.dhtTemp,
            leftDoorState: body.leftDoorState,
            rightDoorState: body.rightDoorState,
            mistLevel: body.mistLevel,
            wasteLevel: body.wasteLevel
        }

        temp1 = reading.temp1;
        temp2 = reading.temp2;
        temp3 = reading.temp3;
        temp4 = reading.temp4;
        temp5 = reading.temp5;
        dhtHum = reading.dhtHum;
        dhtTemp = reading.dhtTemp;
        mistLevel = reading.mistLevel;
        wasteLevel = reading.wasteLevel;

        leftDoorState = reading.leftDoorState;
            if (leftDoorState == 0) {
                leftDoor = 'closed';
            } else if (leftDoorState == 1) {
                leftDoor = 'open';
            }
            
        rightDoorState = reading.rightDoorState;
            if (rightDoorState == 0) {
                rightDoor = 'closed';
            } else if (rightDoorState == 1) {
                rightDoor = 'open';
            }

        //res.sendStatus(200); // send 'OK' ***CAUSES ERROR***
        next();
    });

    app.post('/toggleUV', (req, res, next) => {
        if (uvValue === true) {
            uvRelay.open();
            uvValue = true;
        } else {
            uvRelay.close();
            uvValue = false;
        }
        io.sockets.emit('uvValue', uvValue);
        //res.sendStatus(200); send 'OK' ***CAUSES ERROR*** 
        next();
    });

    app.post('/toggleMister', (req, res, next) => {
        if (misterValue === true) {
            misterRelay.open();
            misterValue = true;
        } else {
            misterRelay.close();
            misterValue = false;
        }
        io.sockets.emit('misterValue', misterValue);
        //res.sendStatus(200); send 'OK' ***CAUSES ERROR***
        next();
    });

    /* app.post('/toggleBasking', (req, res, next) => {
        if (baskingValue === true) {
            baskingRelay.open();
            baskingValue = true;
        } else {
            baskingRelay.close();
            baskingValue = false;
        }
        io.sockets.emit('baskingValue', baskingValue);
        res.sendStatus(200); send 'OK' ***CAUSES ERROR***
        next();
    }) */

    /* app.post('/toggleCHE', (req, res, next) => {
        if (cheValue === true) {
            cheRelay.open();
            cheValue = true;
        } else {
            cheRelay.close();
            cheValue = false;
        }
        io.sockets.emit('cheValue', cheValue);
        res.sendStatus(200); send 'OK' ***CAUSES ERROR***
        next();
    }) */

    /* app.post('/toggleLED', (req, res, next) => {
        if (ledValue === true) {
            ledRelay.open();
            ledValue = true;
        } else {
            ledRelay.close();
            ledValue = false;
        }
        io.sockets.emit('ledValue', ledValue);
        res.sendStatus(200); send 'OK' ***CAUSES ERROR***
        next();
    }) */
});

server.listen(PORT, () => {
    console.log(`listening on ${serverIP}`);
});

function nFormatter(num) {
    const lookup = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'k' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'G' }
    ];
    const rx = /\.0+$|(\.[0-9])0+$/;
    var item = lookup.slice().reverse().find(function(item) {
        return num >= item.value;
    });
    return item ? (num / item.value).toFixed(1).replace(rx, '$1') + item.symbol : '0';
}

function getTime() {
    if (numPOST == 0) {
        lastPOSTTime = currentPOSTTime = performance.now();
    } else {
        lastPOSTTime = currentPOSTTime;
        currentPOSTTime = performance.now();
        timeDiff = ((currentPOSTTime - lastPOSTTime) / 1000);

        if (timeDiff > timeMax) {
            timeMax = timeDiff;
        }

        if (numPOST == 1) {
            timeMin = timeDiff;
        }

        if (timeDiff < timeMin && numPOST >= 1) {
            timeMin = timeDiff;
        }

        timeAvg = (timeMax + timeMin) / 2.0;
    }

    readline.cursorTo(process.stdout, 0, 4);
    process.stdout.clearLine(0);
    process.stdout.write('Received POST req.' + nFormatter(numPOST));
    process.stdout.cursorTo(0, 5);
    process.stdout.clearLine(0);
    process.stdout.write('\tET:  ' + timeDiff.toFixed(3) + 's');
    process.stdout.cursorTo(0, 6);
    process.stdout.clearLine(0);
    process.stdout.write('\tAvg: ' + timeAvg.toFixed(3) + 's');
    process.stdout.cursorTo(0, 7);
    process.stdout.clearLine(0);
    process.stdout.write('\tMax: ' + timeMax.toFixed(3) + 's');
    process.stdout.cursorTo(0, 8);
    process.stdout.clearLine(0);
    process.stdout.write('\tMin: ' + timeMin.toFixed(3) + 's');

    process.stdout.cursorTo(0, 10);

    numPOST++;
}