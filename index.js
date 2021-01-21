console.log("Server started");
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

app.use("/auth", register);

app.listen(3000);
