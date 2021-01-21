const express = require("express");
const bodyParser = require("body-parser");
const redis = require("redis");
const register = require("./routes/register");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = redis.createClient();
client.on("error", function (error) {
  console.error(error);
});

app.listen(3000);

app.use("/auth", register);

console.log("Server started");


