import express from "express";
import bodyParser from "body-parser";
import redis from "redis";
import { authUsers } from "./routes/authUsers.js"; //IMPORTO IL ROUTER DI AUTHUSERS
import { products } from "./routes/products.js"; //IMPORTO IL ROUTER DI PRODUCTS

export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = redis.createClient(); //CREO UN CLIENT PER POTER COMUNICARE COL DB REDIS
client.on("error", function (error) { //AVVIO IL COLLEGAMENTO COL DB REDIS
  console.error(error); //SE NEL COLLEGARMI HO PROBLEMI LI STAMPO
});

app.listen(3000);

app.use("/auth", authUsers); //GRAZIE AL ROUTER AGGIUNGO AD /AUTH L'URI DELLA CHIAMATA CORRISPONDENTE IN AUTOMATICO, ES. /AUTH/REGISTER
app.use("/", products); //STESSA COSA PER PRODUCTS

console.log("Server started");
