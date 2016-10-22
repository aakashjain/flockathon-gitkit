var express = require('express');

var app = express();

app.get('/', function (req, res) {
	res.send("Sup lol!");
});

app.post('/webhook', function (req, res) {
	//webhook url
	console.log(req);
	res.send("lol k");
});

app.listen(3001, function () {
	console.log("Started");
});
