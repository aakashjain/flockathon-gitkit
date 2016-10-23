var express = require("express");
var bodyParser = require("body-parser");
var mongo = require("mongodb").MongoClient;
var request = require("request");
var settings = require("./settings.js");
var cors = require("cors");
var async = require("async");
var Chance = require("chance");
var chance = new Chance();
var fs = require("fs");

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

        res.status(200).json({text: "Processing..."});

        db.collection("users").findOne({_id: req.body.userId}, function (err, doc) {
            if (err) {
                console.log("Error finding user with id", req.body.userId, err);
            }

            if (doc.githubToken == undefined) {
                request(flockPost({
                    "text": "Authorize GitKit to access your Github account: ",
                    "to": req.body.chat,
                    "token": settings.flockBotToken,
                    "attachments": [{
                        // "views": {
                        //     "image": {
                        //         "original": {
                        //             "src": "https://image.shutterstock.com/z/stock-photo-top-view-of-architect-drawing-on-architectural-project-347420135.jpg"
                        //         }
                        //     }
                        // },
                        "buttons": [{
                            "name": "Authorize on GitHub",
                            "action": {
                                "type": "openBrowser",
                                "url": gitOAuth(req.body.userId)
                            },
                            "id": "auth_button"
                        }]
                    }]
                }), function (error, response, body) {
                    if (error) {
                        console.error("Error starting git auth flow", error);
                    }
                });
                
                return;
            }

            var chatId = req.body.userId;
            var command = req.body.text;
            if (command.includes("public")) {
                chatId = req.body.chat;
                command = command.replace("public", "");
            }

            if (command.match("commit map") !== null) {

            } else if (command.match("my commits") !== null) {
                fetchUserCommitsOnRepos(doc, chatId);
            } else if (command.match("^contributions on .+/.+$") !== null) {
                fetchContributorRatioOnRepo(doc, chatId, command.replace("contributions on ", "").replace(" ",""));
            } else if (command.match("^languages in .+/.+$") !== null) {
                fetchLanguageRationOnRepo(doc, chatId, command.replace("languages in ", "").replace(" ",""));
            } else if (command.match("referrers for .+/.+$") !== null) {
                fetchReferrersForRepo(doc, chatId, command.replace("referrers for ", "").replace(" ",""));
            } else if (command.match("popular content for .+/.+$") !== null) {
                fetchPopularContentForRepo(doc, chatId, command.replace("popular content for ", "").replace(" ",""));
            } else if (command.match("views for .+/.+$") !== null) {
                fetchViewsForRepo(doc, chatId, command.replace("views for ", "").replace(" ",""));
            } else if (command.match("clones for .+/.+$") !== null) {
                fetchClonesForRepo(doc, chatId, command.replace("clones for ", "").replace(" ",""));
            } else if (command.match("code frequency for .+/.+$") !== null) {
                fetchCodeFrequencyForRepo(doc, chatId, command.replace("code frequency for ", "").replace(" ",""));
            } else if (command.match("commit activity for .+/.+$") !== null) {
                fetchCommitActivityForRepo(doc, chatId, command.replace("commit activity for ", "").replace(" ",""))
            } else if (command.match("punch card for .+/.+$") !== null) {
                fetchPunchCardForRepo(doc, chatId, command.replace("punch card for ", "").replace(" ",""))
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

        request({
            method: "GET",
            uri: "https://api.github.com/user",
            headers: {
                authorization: "token " + body.access_token,
                'User-Agent': 'Chrome/51.0.2704.103'
            }
        }, function (err, response, body2) {
            if (err) {
                console.error("Error fetching user info from Github", err);
            } else {
                body2 = JSON.parse(body2);
                var updates = {
                    $set: {
                        githubToken: body.access_token,
                        githubUser: body2.login
                    }
                };
                db.collection("users").update({_id: req.params.userid}, updates, function (tokenInsertError) {
                    if (tokenInsertError) {
                        console.log("Error inserting github token", tokenInsertError);
                    }
                });
            }
        });
    });
});


var flockPost = function (body) {
    return {
        url: settings.flockPostUrl,
        method: 'POST',
        json: body
    };
};


var gitOAuth = function (userid) {
    return "https://github.com/login/oauth/authorize?client_id=" + settings.githubClientId
            + "&redirect_uri=" + settings.ngrokUrl + "/github-auth/" + userid + "&scope=repo%20read:org"
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
            redirect_uri: settings.ngrokUrl + "/github-auth",
            state: "d5e497f8-54ff-5924-843d-dfcb52da9f7a"
        }
    };
};


var fetchUserCommitsOnRepos = function (user, chatId) {
    var githubUser = user.githubUser;
    var githubToken = user.githubToken;
    var commits = [];
    request({
        method: "GET",
        uri: "https://api.github.com/user/repos",
        headers: {
            authorization: "token " + githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        async.eachSeries(body, function (repo, cb) {
            var reponame = repo.full_name;
            request({
                method: "GET",
                uri: "https://api.github.com/repos/" + reponame + "/commits",
                qs: { author: githubUser },
                headers: {
                    authorization: "token " + githubToken,
                    "User-Agent": "Chrome/51.0.2704.103"
                }
            }, function (err, response, body) {
                if (err) {
                    console.error(err);
                    return cb();   
                }
                body = JSON.parse(body);
                body.forEach(function (commit) {
                    commits.push({
                        repo: reponame,
                        date: commit.commit.committer.date
                    });
                });
                cb();
            });

        }, function (err) {

            createAndSendChart(commits, "userCommitRepos.js", chatId);
            
        });
    });
};


var fetchContributorRatioOnRepo = function (user, chatId, repo) {
    var contributors = [];
    var githubToken = user.githubToken;
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/contributors",
        qs: { anon: false },
        headers: {
            authorization: "token " + githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        body.forEach(function (contrib) {
            contributors.push({
                user: contrib.login,
                commits: contrib.contributions
            });
        });
        createAndSendChart(contributors, "repoContributorRatio.js", chatId);
    });
};


var fetchLanguageRationOnRepo = function (user, chatId, repo) {
    var languages = [];
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/languages",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        Object.keys(body).forEach(function (language) {
            languages.push({
                language: language,
                bytes: body[language]
            });
        });
        createAndSendChart(languages, "repoLanguageRatio.js", chatId);
    });
}


var fetchReferrersForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/traffic/popular/referrers",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103",
            accept: "application/vnd.github.spiderman-preview"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        createAndSendChart(body, "repoReferrers.js", chatId);
    });
};

var fetchPopularContentForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/traffic/popular/paths",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103",
            accept: "application/vnd.github.spiderman-preview"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        createAndSendChart(body, "repoPopularContent.js", chatId);
    });
};

var fetchViewsForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/traffic/views",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103",
            accept: "application/vnd.github.spiderman-preview"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(body);
        body = JSON.parse(body);
        createAndSendChart(body.views, "repoViews.js", chatId);
    });
};

var fetchClonesForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/traffic/clones",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103",
            accept: "application/vnd.github.spiderman-preview"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        body = JSON.parse(body);
        createAndSendChart(body.clones, "repoClones.js", chatId);
    });
};

var fetchCodeFrequencyForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/stats/code_frequency",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(body);
        body = JSON.parse(body);
        createAndSendChart(body, "repoCodeFrequency.js", chatId);
    });
};

var fetchCommitActivityForRepo = function (user, chatId, repo) {
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/stats/commit_activity",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(body);
        body = JSON.parse(body);
        createAndSendChart(body, "repoCommitActivity.js", chatId);
    });
};

var fetchPunchCardForRepo = function (user, chatId, repo) {
    console.log(repo);
    request({
        method: "GET",
        uri: "https://api.github.com/repos/" + repo + "/stats/punch_card",
        headers: {
            authorization: "token " + user.githubToken,
            "User-Agent": "Chrome/51.0.2704.103"
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(body);
        body = JSON.parse(body);
        createAndSendChart(body, "repoPunchCard.js", chatId);
    });
};

var createAndSendChart = function (data, script, chatId) {
    var chart = {
        _id: chance.guid(),
        data: JSON.stringify(data, null, 0),
        script: script
    };

    db.collection("charts").insert(chart, function (err) {
        if (err) {
            console.error("Error creating new chart", err);
            return;
        }

        request(flockPost({
            to: chatId,
            token: settings.flockBotToken,        
            text: "Here's the chart!",
            attachments: [{
                buttons: [{
                    "name": "Open preview",
                    "action": {
                        "type": "openWidget",
                        "url": settings.ngrokUrl + "/charts/" + chart._id,
                        "desktopType": "modal",
                        "mobileType": "modal"
                    },
                    "id": "chart_widget_button"
                }, {
                    "name": "Open in browser",
                    "action": {
                        "type": "openBrowser",
                        "url": settings.ngrokUrl + "/charts/" + chart._id
                    },
                    "id": "chart_button"
                }
                ]
            }]
        }), function (err, response, body) {
            if (err) {
                console.error("Error posting chart url", err);
            }
        });
    });
};


app.get("/charts/:chartId", function (req, res) {
    db.collection("charts").findOne({_id: req.params.chartId}, function (err, doc) {
        if (err) {
            console.log("Error fetching chart with id", req.params.chartId, err);
            return res.sendStatus(500);
        }

        if (doc == null) {
            return res.send("This chart has expired.");
        }

        var html = fs.readFileSync("charts/chart.html", {encoding: "utf8"});
        var js = fs.readFileSync("charts/" + doc.script, {encoding: "utf8"});
        js = "var rawData = " + doc.data + ";" + js;
        html =  html.replace("$$SCRIPT$$", js);

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(html);
        res.end();
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
