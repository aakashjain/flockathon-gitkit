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
        var newUser = {
            _id: req.body.userId,
            userToken: req.body.userToken,
            token: req.body.token,
            installed: true
        };
        db.collection("users").update({_id: newUser._id}, newUser, {upsert: true}, function (newUserErr) {
            if (newUserErr) {
                console.error("Error creating new user install", newUser._id);
                res.sendStatus(500);
            } else {
                console.log("Created new user", newUser._id);
                res.sendStatus(200);
            }
        });
    } else if (type === "app.uninstall") {
        db.collection("users").update({_id: req.body.userId}, {$set: {installed: false}}, function (uninstallErr) {
            if (uninstallErr) {
                console.error("Error setting user uninstalled", req.body.userId);
                res.sendStatus(500);
            } else {
                console.log("Uninstalled user", req.body.userId);
                res.sendStatus(200);
            }
        });
    }

    else if (type === "client.slashCommand"){
        if(req.body.text === "p p"){
            var response = {text: "Processing..."};
            res.status(200).json(response);
        }
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
