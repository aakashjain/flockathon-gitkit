var express = require("express");
var bodyParser = require("body-parser");
var mongo = require("mongodb").MongoClient;
var request = require("request");
var settings = require("./settings.js");
var cors = require("cors");

var app = express();

var db = null;

app.use(bodyParser.json());
app.use(cors());

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

    } else if (type === "client.slashCommand") {

        if (req.body.text === "p p"){
            var response = {text: "Processing..."};
            res.status(200).json(response);
        }

        request(flockPost({
            "text": "Authorize GitKit to access your Github account: " + gitOAuth(req.body.userId)
            // "attachments": [{
            //     "title": "Authorize GitHub",
            //     "description": "Do it!",
            //     "views": {
            //         // "widget": { "src": "https://google.com", "width": 1000, "height": 400 }
            //         // "flockml": '<flockml><action "type"="openBrowser" "url"="' + gitOAuth + '">Authorize GitKit</action> to access your GitHub account</flockml>'
            //     }
            //     "buttons": [{
            //         "name": "Authorize on GitHub",
            //         "action": {
            //             "type": "openWidget",
            //             "url": gitOAuth(),
            //             "desktopType": "sidebar",
            //             "mobileType": "modal"
            //         },
            //         "id": "dettol_peele"
            //     }]
            // }]
        }), function (error, response, body) {
            if (error) {
                console.error("Error starting git auth flow", error);
            }
        });

    }
});

app.get('/github-auth/:userid', function (req, res) {
    request(gitTokenPost(req.query.code), function (error, response, body) {
        if (error) {
            console.error("Error getting git auth token", error);
        }
        console.log(body);
        res.send("You have authorized GitKit to access your Github account. You may now close this window.");

        db.collection("users").update({_id: req.params.userid}, {$set: {githubToken: body.access_token}}, function (tokenInsertError) {
            if (tokenInsertError) {
                console.log("Error inserting github token", tokenInsertError);
            }
        });
    });
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

var flockPost = function (body) {
    return {
        url: settings.incomingWebhookUrl,
        method: 'POST',
        json: body
    };
};

var gitOAuth = function (userid) {
    return "https://github.com/login/oauth/authorize?client_id=" + settings.githubClientId
            + "&redirect_uri=https://a9291a1d.ngrok.io/github-auth/" + userid + "&scope=repo:status"
            + "&state=d5e497f8-54ff-5924-843d-dfcb52da9f7a&allow_signup=true";
};

var gitTokenPost = function (code) {
    return {
        uri: "https://github.com/login/oauth/access_token",
        method: "POST",
        json: {
            client_id: settings.githubClientId,
            client_secret: settings.githubClientSecret,
            code: code,
            redirect_uri: "https://a9291a1d.ngrok.io/github-auth",
            state: "d5e497f8-54ff-5924-843d-dfcb52da9f7a"
        }
    };
};
