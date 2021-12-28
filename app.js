const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const _ = require('lodash');

// Setting up packages
const app = express();
app.use(express.static(__dirname + "/public/"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');

function arrayRemove(arr, value) {
    return arr.filter(function(ele){
        return ele != value;
    });
}

// Setting up the mongoose database

mongoose.connect("mongodb+srv://Serenacula:Ld5sMApKk2ZzqCavJw@cluster0-opzi9.mongodb.net/TodoList?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Making our database models

const taskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 120
    }
});

const listSchema = new mongoose.Schema({
    name: String,
    tasks: [taskSchema]
});

const Task = mongoose.model("Task", taskSchema);

const List = mongoose.model("List", listSchema);

// Creating some example tasks

const example1 = new Task({
    text: "Welcome to this todo list app!"
});
const example2 = new Task({
    text: "Write new tasks at the bottom. You can have up to 7. :)"
});
const example3 = new Task({
    text: "<-- Tick the checkbox to delete a task off the list!"
});
let exampleList = [example1, example2, example3];
// Checking if the examples are in the DB, and adding if not

Task.find({}, function(error, foundItems) {
    if (error) {
        console.log(error);
    } else if (foundItems.length == 0) {
        Task.insertMany(exampleList, function(error) {
            if (error) {
                console.log(error);
            } else {
                console.log("Created examples");
            }
        });
    } else {
        // console.log("Startup items: " + foundItems);
    }
});

// Declaring variables
let showInput = true; // Whether we want the user to be able to add more items.


//// Browser Responses ////


// Responding to browser GET requests

app.get('/', function(request, response) {

    response.render("index");

});

// GET request for custom list

app.get("/:customList", function(request, response) {
    const customList = _.capitalize(request.params.customList);

    // Getting the day for the title
    let options = {
        weekday: "long",
    }
    let date = new Date();
    date = date.toLocaleDateString("en-GB", options);

    // Check if the list already exists
    let foundItems = [];
    List.findOne({name: customList}, function(error, foundList) {
        if (error) {console.log(error);}

        if (foundList) {
            // If it does exist, use that data
            console.log("getting data from DB");
            foundItems = foundList.tasks;
        } else {
            // If it doesn't exist, make a new list
            console.log("No list found, making new list");
            const newList = new List({
                name: customList,
                tasks: exampleList
            });
            newList.save();
            foundItems = newList.tasks;
        }
        // console.log(foundItems);

        // Check if the list has enough items
        if (foundItems.length > 6) {
            showInput = false;
        } else {
            showInput = true;
        }

        // Send the webpage, telling ejs what to build
        response.render("tasklist", {
            listName: customList,
            htmlDate: date,
            items: foundItems,
            showInput: showInput,
        });
    });



});

// Responding to browser POST requests

app.post('/', function(postRequest, postResponse) {
    const listName = _.capitalize(postRequest.body.listName);
    console.log(listName);

    List.findOne({name: listName}, function (error, foundList) {
        if (error) {
            console.log(error);
        }
        if (foundList) {
            postResponse.redirect("/" + listName);
        } else {
            const newList = new List({
                name: listName,
                tasks: exampleList
            });

            postResponse.redirect("/" + listName);
        }
    });



});

app.post('/delete', function(postRequest, postResponse) {
    const itemID = postRequest.body.deleteItem;
    const customList = postRequest.body.listName;
    // If the item and list exist
    if (itemID && customList) {
        // Get the appropriate list

        List.findOneAndUpdate(
            {name: customList},
            {$pull: {tasks: {_id: itemID}}},
            function (error, foundList) {
                if (error) {console.log(error)}
                foundList.save();
                postResponse.redirect("/" + customList);
            }
        );

    }

});

app.post("/:customList", function(postRequest, postResponse) {
    const customList = _.capitalize(postRequest.params.customList);
    console.log(customList);
    const itemText = postRequest.body.itemText;

    const newItem = new Task({
        text: itemText
    });

    // Get the appropriate list
    List.findOne({name: customList}, function(error, foundList) {
        if (error) {console.log(error);}

        if (foundList) {
            console.log(foundList);
        } else {
            console.log("no list?");
        }
        foundList.tasks.push(newItem);
        foundList.save(function(error) {
            if (error) {
                console.log(error);
            } else {
                console.log("updated DB");
            }
            postResponse.redirect("/" + customList);
        });

    });
});


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function() {
    console.log("Server is listening on port " + port);
});
