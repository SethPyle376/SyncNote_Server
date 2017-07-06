/**********************************
* SyncNote Server App
*
*
**********************************/

var net = require('net');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sockets = [];
var currentText = "This is the current server message\n";

var Note = new Schema({
	title: String,
	note: String,
	users: [{type: String}]
});
mongoose.model("Note", Note);

var noteModel = mongoose.model('note', Note);
var firstNote = new noteModel({title: "test", data: "it works", users: ["Seth", "Test"]});


mongoose.connect('mongodb://localhost/SyncNoteTest2');

//REFERENCE
/*
firstNote.save(function(err) {
	if (err) {
		console.log(err);
	}
	else {
		console.log("Saved first note successfully");
	}
})

noteModel.findOne({users: "Seth"}, function(err, noteObj) {
			if (err) {
				console.log(err);
				//Message error to user
			}
			else if (noteObj) {
				console.log("Found");
				//Broadcast here
			}
			else {
				console.log("Note not found");
			}
		});

noteModel.findOneAndUpdate({users: "Seth"}, {$push: {users: "Test2"}}, {new: true}, function(err, note) {
	if (err) {
		console.log("Error writing to array");
	}
	else
	{
		console.log(note.users);
	}
	}
);
*/

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


	if (jsonObject.command == "login") {
		sock.email = jsonObject.target;
		console.log(sock.email + " has logged in.");
	}

	else if (jsonObject.command == "create") {
		var newNote = noteModel({title: jsonObject.target, note: jsonObject.data, users: [sock.email]});
		newNote.save(function(err) {
				console.log(err);
				//Message user of error.
			});
	}

	else if (jsonObject.command == "addUser") {
		noteModel.findOneAndUpdate({title: jsonObject.target}, {$push: {users: jsonObject.data}}, {new: true}, function(err, note) {
		if (err) {
			console.log("Error writing to array");
		}
		else
		{
			console.log(note.users);
		}
	})
	//TODO Send email notification

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
				console.log(noteObj.data);
				//Broadcast here
			}
			else {
				var newNote = noteModel({title: jsonObject.target, note: jsonObject.data, users: [sock.email]});
				newNote.save(function(err) {
				console.log(err);
				//Message user of error.
				});
				console.log("Note not found, creating");
			}
				});
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
				console.log(noteObj.data);
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
		noteModel.find({users: sock.email}, function(err, list) {
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
var svrport = 5000;

svr.listen(6000);
console.log('Server Created at ' + svraddr + ':' + svrport + '\n');
