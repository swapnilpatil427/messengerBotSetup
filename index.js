'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('node-uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = "aae85be98a3747b2ae00b8f9654e3ab4";
const APIAI_LANG = 'en';
const FB_VERIFY_TOKEN = "i_need_help_here";
const FB_PAGE_ACCESS_TOKEN = "EAAZAqQj1VP6wBAOjsswZAQFIBBfCo482jaMG4489l9GsWTMHZBIyKQvXGyhI0vtEj6RsrnpY5ZBHaDAzyyZC5OyYEoyxGTmLmtSZAqm1U73IQ4QqzxnpCHQ95ykB4DlRNEk4Aqof5lWYAMtAcAaH7nmS4R4s4iwglAMNy2oxylkwZDZD";

const apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
const sessionIds = new Map();

function processEvent(event) {
    var sender = event.sender.id.toString();
    if (event.message && event.message.text) {
        var text = event.message.text;
        // Handle a text message from this sender
        if (!sessionIds.has(sender)) {
            sessionIds.set(sender, uuid.v1());
        }
        console.log("Text", text);
        let apiaiRequest = apiAiService.textRequest(text,
            {
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
                    } catch (err) {
                        sendFBMessage(sender, {text: err.message });
                    }
                } else if (isDefined(responseText)) {
                    if(action === "actionID") {
                        //let params = response.result.parameters || "";
                    //    let refugeeID = params.RefugeeID || "";
                    //    let refugeeZipCode = params.RefugeeLocation || "";
                    //    if(refugeeID != "" && refugeeZipCode != "") {
                    //        console.log("Got all the parameters");
                    //    }
                        console.log("params"+JSON.stringify(response.result));
                    }
                    //console.log("params"+params.RefugeeLocation);
                    var splittedText = splitResponse(responseText);
                    async.eachSeries(splittedText, (textPart, callback) => {
                        sendFBMessage(sender, {text: textPart}, callback);
                    });
                }
            }
        });

        apiaiRequest.on('error', (error) => console.error(error));
        apiaiRequest.end();
    }
}

function splitResponse(str) {
    if (str.length <= 320)
    {
        return [str];
    }

    var result = chunkString(str, 300);

    return result;

}

function chunkString(s, len)
{
    var curr = len, prev = 0;

    var output = [];

    while(s[curr]) {
        if(s[curr++] == ' ') {
            output.push(s.substring(prev,curr));
            prev = curr;
            curr += len;
        }
        else
        {
            var currReverse = curr;
            do {
                if(s.substring(currReverse - 1, currReverse) == ' ')
                {
                    output.push(s.substring(prev,currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while(currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}

function sendFBMessage(sender, messageData, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: messageData
        }
    }, function (error, response, body) {
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
        function (error, response, body) {
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

app.use(bodyParser.text({ type: 'application/json' }));

app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function () {
            doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook/', function (req, res) {
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

app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});

doSubscribeRequest();
