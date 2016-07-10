'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request');
const xmlescape = require('xml-escape');
var common = require('./index.js');
var geocoding = require('./geocoding');
var mysql = require("mysql");
var con = mysql.createConnection({
    host: "us-cdbr-iron-east-04.cleardb.net",
    user: "ba7644c050aab1",
    password: "fe28d362",
    database: "heroku_f4cca122d17507a"
});



module.exports = class TwilioBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "twilio"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();
    }

    processMessage(req, res) {
        if (this._botConfig.devConfig) {
            console.log("body", req.body);
        }
        console.log("JSON.stringify(req)");
        if (req.body && req.body.From && req.body.Body) {
            let chatId = req.body.From;
            let messageText = req.body.Body;

            console.log(chatId, messageText);

            if (messageText) {
                if (!this._sessionIds.has(chatId)) {
                    this._sessionIds.set(chatId, uuid.v1());
                }

                let apiaiRequest = this._apiaiService.textRequest(messageText, {
                    sessionId: this._sessionIds.get(chatId)
                });

                apiaiRequest.on('response', (response) => {
                    console.log(response);
                    if (TwilioBot.isDefined(response.result)) {
                        let responseText = response.result.fulfillment.speech;
                        let action = response.result.action;
                        if (TwilioBot.isDefined(responseText)) {
                            common.afterResponse(action, response, responseText);
                            //console.log("params"+params.RefugeeLocation);
                            var elements = "";
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
                                                var elements = "";
                                                if (rows[0].length != 0) {
                                                    rows[0].forEach(function(row) {
                                                        elements = "Name : " + row.name + "Description :" + row.description + "phoneNumber :" + row.phone;
                                                    });
                                                }

                                                console.log(elements);

                                                con.end();

                                            });
                                            /*con.end(function(err) {
                                                // The connection is terminated gracefully
                                                // Ensures all previously enqueued queries are still
                                                // before sending a COM_QUIT packet to the MySQL server.
                                            }); */
                                        });
                                    });
                                }
                            }
                            console.log('Response as text message');
                            res.setHeader("Content-Type", "application/xml");
                            res.status(200).end("<Response><Message>" + xmlescape(responseText)+ xmlescape(elements) + "</Message></Response>");
                        } else {
                            console.log('Received empty speech');
                        }
                    } else {
                        console.log('Received empty result')
                    }
                });

                apiaiRequest.on('error', (error) => console.error(error));
                apiaiRequest.end();
            } else {
                console.log('Empty message');
                return res.status(400).end('Empty message');
            }
        } else {
            console.log('Empty message');
            return res.status(400).end('Empty message');
        }
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}
