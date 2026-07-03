const mongoose = require('mongoose');

const uri = "mongodb+srv://GHINEA_TUDOR:stud@utaytsq.mongodb.net/masterclass?retryWrites=true&w=majority";

console.log("Connecting to:", uri.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
}).then(() => {
  console.log("Connected successfully!");
  process.exit(0);
}).catch(err => {
  console.error("Connection error:", err);
  process.exit(1);
});
