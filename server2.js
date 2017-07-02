/**********************************
* SyncNote Server App
*
*
**********************************/

var net = require('net');
var mongoose = require('mongoose');
var sockets = [];
var currentText = "This is the current server message\n";

mongoose.connect('mongodb://localhost/SyncNoteTest1');

var noteModel = mongoose.model('Note', { title: String, note: String} );

var firstNote = new noteModel({title: "This is the first note", note: "Congratz"});
var nextNote = new noteModel({title: "This is the second test note", note: "ayeee"});

firstNote.save(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log("Saved first note successfully");
	}
})

nextNote.save(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log("Saved first note successfully");
	}
})

var svr = net.createServer(function(sock) {

    sock.on('error', function(err) {
	console.log('Error');
	console.log(err.stack);
	var idx = sockets.indexOf(sock);
	if (idx != -1) {
		delete sockets[idx];
	}
})

    console.log('Connected: ' + sock.remoteAddress + ':' + sock.remotePort);
    sockets.push(sock);

    var data2 = sock.remoteAddress + ":" + sock.remotePort + '\n';

    sock.on('data', function(data) {
    	console.log(data.toString());

    	var jsonObject;
    	try {
			jsonObject = JSON.parse(data);
			var command = Object.keys(jsonObject)[0];
			console.log(jsonObject.command);
		} catch (e) {
			console.log("error parsing json data: " + data);
			jsonObject = {};
			jsonObject.command = "error";
			jsonObject.data = "";
			jsonObject.target = "";
		}
	
		if (jsonObject.command == "command") {
			if (jsonObject.command == "pull")
			{
				var jsonVariable = {};
				jsonVariable["command"] = "data";
				jsonVariable["data"] = currentText;
				jsonVariable = JSON.stringify(jsonVariable);
				jsonVariable += '\n';
				console.log(jsonVariable);
				console.log(currentText);
				sock.write(jsonVariable);
			}
		}
		else if (jsonObject.command == "create") {
			noteModel.findOne({title: jsonVariable["target"]}, function(err, userObj)
			{
				if (err) {
					console.log(err);
					//Message user of error
				}
				else if (userObj)
				{
					//Message user that note is already created.
				}
				else
				{
					var newNote = noteModel({title: jsonVariable["target"]});
					newNote.save(function(err) {
						console.log(err);
						//Message user of error.
					})
				}

			});

		}

		else if (jsonObject.command == "push") {
			noteModel.findOne({title: jsonObject.target}, function(err, noteObj) {
				if (err) {
					console.log(err);
					//Message error to user
				}
				else if (noteObj) {
					noteObj.note = jsonObject.data;
					noteObj.save();
					//Broadcast here
				}
				else {
					console.log("Note not found, creating");

					noteModel.findOne({title: jsonObject.target}, function(err, userObj)
					{
						if (err) {
							console.log(err);
						}
						else if (userObj)
						{

						}
						else
						{
							var newNote = noteModel({title: jsonObject.target, data: jsonObject.data});
							console.log("Created new note");
							newNote.save(function(err) {
							console.log(err);
						})
					}

					});
				}	
			})
		}

		else if (jsonObject.command == "pull") {
			noteModel.findOne({title : jsonObject.target}, function(err, noteObj) {
				if (err) {
					console.log(err);
				}
				else if (noteObj) {
					var jsonVariable = {};
					jsonVariable["command"] = "update";
					jsonVariable["data"] = noteObj.note;
					jsonVariable = JSON.stringify(jsonVariable);
					jsonVariable += '\n';
					sock.write(jsonVariable);
				}
				else {
					console.log(err);
					//Message error to client
				}
			})
		}
		else if (jsonObject.command == "list") {
			console.log("List command received");
			noteModel.find({}, function(err, list) {
				list.forEach(function(note) {
					console.log("Sending one to list");
					var jsonVariable = {};
					jsonVariable["command"] = "list";
					jsonVariable["data"] = note.title;
					var sending = JSON.stringify(jsonVariable);
					sending += '\n';
					console.log(sending);
					sock.write(sending);
				})
			})

		}

    });

    sock.on('end', function() {
        console.log('Disconnected: ' + sock.remoteAddress + ':' + sock.remotePort);
        var idx = sockets.indexOf(sock);
        if (idx != -1) {
            delete sockets[idx];
        }
    });
});

var svraddr = 'localhost';
var svrport = 4000;

svr.listen(4000);
console.log('Server Created at ' + svraddr + ':' + svrport + '\n');
