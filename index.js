import express from "express";
import bodyParser from "body-parser";
import redis from "redis";
import { authUsers } from "./routes/authUsers.js";
import { products } from "./routes/products.js";

export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = redis.createClient();
client.on("error", function (error) {
  console.error(error);
});

app.listen(3000);

app.use("/auth", authUsers);
app.use("/", products);

console.log("Server started");
