'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('node-uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');
const TwilioBot = require('./twiliobot');
const TwilioBotConfig = require('./twiliobotconfig');

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');
var geocoding = require('./geocoding');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = "Your_APIAI_ACCESS_TOKEN";
const APIAI_LANG = 'en';
const FB_VERIFY_TOKEN = "YOUR_FB_VERIFY_TOKEN";
const FB_PAGE_ACCESS_TOKEN = "YOUR_FB_PAGE_ACCESS_TOKEN";

const apiAiService = apiai(APIAI_ACCESS_TOKEN, {
  language: APIAI_LANG,
    requestSource: "fb"
});

const botConfig = new TwilioBotConfig(APIAI_ACCESS_TOKEN, APIAI_LANG);
const bot = new TwilioBot(botConfig);
const sessionIds = new Map();
var mysql = require("mysql");
var con = mysql.createConnection( {
  host: "us-cdbr-iron-east-04.cleardb.net",
    user: "ba7644c050aab1",
    password: "fe28d362",
    database: "heroku_f4cca122d17507a"
});

var gcm = require('node-gcm');
var regTokens = ['eTAhKXGmMyk:APA91bG0vkKehF24-57gEg_jUtNXmSAv0RbYfOdHN1eJxh8Vt0SwvnwGdJ0u0s4vYuha4N36fASZb6cASXmosrrsTWj-R3SpasV2A8zWne-TkhCaPNrqyDqSHqSJEIc0Ck_ySDpcl4SU'];

function processEvent(event) {
  var sender = event.sender.id.toString();
    if (event.message && event.message.text) {
        var text = event.message.text;
        // Handle a text message from this sender
        if (!sessionIds.has(sender)) {
            sessionIds.set(sender, uuid.v1());
}

console.log("Text", text);
        let apiaiRequest = apiAiService.textRequest(text, {
  sessionId: sessionIds.get(sender)
});

apiaiRequest.on('response', (response) => {
  if (isDefined(response.result)) {
                let responseText = response.result.fulfillment.speech;
                let responseData = response.result.fulfillment.data;
                let action = response.result.action;
                if (isDefined(responseData) && isDefined(responseData.facebook)) {
                    try {
                        console.log('Response as formatted message');
                        sendFBMessage(sender, responseData.facebook);
}

catch (err) {
                        /*sendFBMessage(sender, {
                            text: err.message
                        }); */
}
                }

else if (isDefined(responseText)) {
  afterResponseData(action, response, responseText);

                    //console.log("params"+params.RefugeeLocation);
                    if (action === "actionID") {
                        let params = response.result.parameters || "";
                        let refugeeID = params.RefugeeID || "";
                        let refugeeZipCode = params.RefugeeLocation || "";
                        let refugeePhone = params.RefugeePhone || "";
                        if (refugeeID != "" && refugeeZipCode != "" && refugeePhone != "") {
                            geocoding.getAllVolunteers(refugeeZipCode, function(response) {
                                //console.log(response);
                                con.connect(function(err) {
                                    if (err) {
                                        console.log('Error connecting to Db');
                                        return;
}

con.query('CALL get_organisation1(' + response.latitude + ',' + response.longitude + ')', function(err, rows) {
  if (err) {
                                            console.log(err);
}

var elements = [];
                                        if (rows[0].length != 0) {
  rows[0].forEach(function(row) {
                                                elements.push({
                                                    "title": row.name,
                                                    "subtitle": row.description,
                                                    "buttons": [{
                                                        "type": "web_url",
                                                        "url": "https://petersapparel.parseapp.com/view_item?item_id=100",
                                                        "title": row.phone
}

]
});
                                            });
                                        }

else {
elements.push({
                                                "title": "MEDAIR",
                                                "subtitle": "Medair helps people who are suffering in remote and devastated communities around the world survive crisis, recover with dignity, and develop skills to build a better future",
                                                "buttons": [{
                                                    "type": "web_url",
                                                    "url": "https://petersapparel.parseapp.com/view_item?item_id=100",
                                                    "title": "4086685302"
}

]
});
                                        }

var message = {
                                            "attachment"
: {
                                                "type": "template",
                                                "payload": {
                                                    "template_type": "generic",
                                                    "elements": elements
}
                                            }
                                        };

sendFBMessage(sender, message);
                                        con.end();
});

                                });
                                /*con.end(function(err) {
                                    // The connection is terminated gracefully
                                    // Ensures all previously enqueued queries are still
                                    // before sending a COM_QUIT packet to the MySQL server.
                                }); */
                            });


                        }
                    }

var splittedText = splitResponse(responseText);
                    async.eachSeries(splittedText, (textPart, callback) => {
sendFBMessage(sender, {
                            text: textPart
},callback);
});
                }
            }
        });

apiaiRequest.on('error', (error) => console.error(error));
        apiaiRequest.end();
}
}

exports.afterResponse = afterResponseData;

function afterResponseData(action, response, responseText) {
if (action === "actionID") {
        let params = response.result.parameters || "";
        let refugeeID = params.RefugeeID || "";
        let refugeeZipCode = params.RefugeeLocation || "";
        let refugeePhone = params.RefugeePhone || "";
        if (refugeeID != "" && refugeeZipCode != "" && refugeePhone != "") {
            // Set up the sender with you API key, prepare your recipients' registration tokens.

            /*    con.query('CALL read_refugee()', function(err, rows) {
                    if (err) {
                        console.log(err);
                    }

                    console.log('Data received from Db: \n');
                    console.log(rows);
                }); */
            /*    con.query('CALL get_refugee(37.383411,121.919662)', function(err, rows) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(rows);
                }); */
            geocoding.getAllVolunteers(refugeeZipCode, function(response) {
                console.log("I am here");
                insertDb (refugeeID,refugeeZipCode,refugeePhone);
                //    console.log("latitude" +response.latitude);
                //    console.log("longitude" + response.longitude);
                var message = new gcm.Message({
                    data: {
                        refugeeID: refugeeID,
                        refugeeZipCode: refugeeZipCode,
                        refugeePhone: refugeePhone,
                        message: "I am here, please find me, i need your help."
                    },
                    notification: {
                        title: "New Refugee Found",
                        body: "New Refugee found at location." + refugeeZipCode
                    }
                });
                new gcm.Sender('AIzaSyCu2ty53tCN0nCW94WCOlbbvATbZKoT3TU').send(message, {
                    registrationTokens: regTokens
                }, function(err, response) {
                    console.log("sdf");
                    if (err) console.error(err);
                });


            });

        }
    }
}

function splitResponse(str) {
    if (str.length <= 320) {
        return [str];
    }

    var result = chunkString(str, 300);

    return result;

}

function chunkString(s, len) {
    var curr = len,
        prev = 0;

    var output = [];

    while (s[curr]) {
        if (s[curr++] == ' ') {
            output.push(s.substring(prev, curr));
            prev = curr;
            curr += len;
        } else {
            var currReverse = curr;
            do {
                if (s.substring(currReverse - 1, currReverse) == ' ') {
                    output.push(s.substring(prev, currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while (currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}

function sendFBMessage(sender, messageData, callback) {
    request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: FB_PAGE_ACCESS_TOKEN
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                message: messageData

            }
        },
        function(error, response, body) {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }

            if (callback) {
                callback();
            }
        });
}

function doSubscribeRequest() {
    request({
            method: 'POST',
            uri: "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN
        },
        function(error, response, body) {
            if (error) {
                console.error('Error while subscription: ', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.text({
    type: 'application/json'
}));

app.get('/listrefugees', function(req, res) {
    con.connect(function(err) {
        if (err) {
            console.log('Error connecting to Db');
            return;
        }
        con.query('CALL read_refugee()', function(err, rows) {
            if (err) {
                console.log(err);
            }
            res.write(JSON.stringify(rows));
            res.end();
        });
        con.end();
    });
});

app.get('/refugee/:id', function(req, res) {
    con.connect(function(err) {
        if (err) {
            console.log('Error connecting to Db');
            return;
        }
        con.query('CALL get_refugee(' + req.params.id + ')', function(err, rows) {
            if (err) {
                console.log(err);
            }
            res.write(JSON.stringify(rows));
            res.end();
        });
        con.end();
    });
});

app.post('/refugee', function(req, res) {
    //console.log()
    //res.write("fd");
    var id = req.body.refugeeID;
    var address = req.body.refugeeAddress;
    var phoneNumber = req.body.refugeePhone;
    insertDb(id,address,phoneNumber);
});

function insertDb (id,address,phoneNumber) {
    var http = require('http');

    //The url we want is `www.nodejitsu.com:1337/`
    var options = {
      host: 'https://helpbotsite.herokuapp.com',
      path: '/update',
     // data: {refugeeID : id,refugeeAddress:address, refugeePhone :phoneNumber },
      //since we are listening on a custom port, we need to specify it by hand
      //This is what changes the request to a POST request
      method: 'POST'
    };

    callback = function(response) {
      var str = ''
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        console.log(str);
      });
    }

    var req = http.request(options, callback);
    //This is the data we are posting, it needs to be a string or a buffer
    req.write({refugeeID : id,refugeeAddress:address, refugeePhone :phoneNumber });
    req.end();


    var outString = address.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, ' ');
    con.connect(function(err) {
        if (err) {
            console.log('Error connecting to Db');
            return;
        }
        con.query('CALL insert_refugee(' + id + ',"kartik",' + outString + ',"95112",' + phoneNumber + ',"25","male","no",37.383411,121.919662)', function(err, rows) {
            if (err) {
                console.log(err);
            }
            //    res.write(JSON.stringify(rows));
            res.end();
        });
        con.end();
    });
}

app.post('/sms', (req, res) => {
    console.log('POST sms received');
    try {
        bot.processMessage(req, res);
    } catch (err) {
        return res.status(400).send('Error while processing ' + err.message);
    }
});



app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function() {
            doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook/', function(req, res) {
    try {
        var data = JSONbig.parse(req.body);

        var messaging_events = data.entry[0].messaging;
        for (var i = 0; i < messaging_events.length; i++) {
            var event = data.entry[0].messaging[i];
            processEvent(event);
        }
        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.listen(REST_PORT, function() {
    console.log('Rest service ready on port ' + REST_PORT);
});

doSubscribeRequest();
