var express = require("express");
var bodyParser = require("body-parser");
var mongo = require("mongodb").MongoClient;
var settings = require("./settings.js");

var app = express();

var db = null;

app.use(bodyParser.json());

app.get("/", function (req, res) {
    res.send("Sup lol!");
});

app.post("/webhook", function (req, res) {
    console.log(req.body);
    var type = req.body.name;
    if (type === "app.install") {
        res.sendStatus(200);
    }
});

mongo.connect(settings.mongoUrl, function (mongoConnectErr, connectedDb) {
    if (mongoConnectErr) {
        console.error("Error connecting to MongoDB instance", mongoConnectErr);
        process.exit(-1);
    }

    db = connectedDb;

    app.listen(3001, function (serverStartErr) {
        if (serverStartErr) {
            console.error("Error starting server", serverStartErr);
            process.exit(-1);
        }

        console.log("Started server");
    });
});
