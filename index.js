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

//POICHE' DOBBIAMO FAR COMUNICARE PIU' FILE CON IL TOKEN OTTENUTO (AUTHUSERS, PRODUCTS, I TEST),
//E PER CERCARE DI AUTOMATIZZARE L'INSERIMENTO DEL TOKEN STESSI, CHE CAMBIA SEMPRE, PROCEDIAMO COME SEGUE:
let loggedUser = { userToken: "", userMail: "" }; //CREIAMO UN OGGETTO CHE SIMULERA' IL TOKEN CHE IL BROWSER MANDA AL SERVER
//CREO UN OGGETTO PER AVERNE IL RIFERIMENTO DI MEMORIA, COSI' DA SEGUIRE I SUOI VALORI ANCHE SE ESPORTATO IN PRODUCTS.JS
export let { userToken, userMail } = loggedUser
export const setUserToken = (value) => userToken = value;
export const setUserMail = (value) => userMail = value;
//ANZICHE' SCRIVERE A MANO IL TOKEN DINAMICIZZIAMO IL TUTTO,
//VALORIZZANDO IL TOKEN CHE INSERIREMMO IN POSTMAN COME UGUALE ALL'USERTOKEN CHE OTTENIAMO AL LOGIN

app.listen(3000);

app.use("/auth", authUsers); //GRAZIE AL ROUTER AGGIUNGO AD /AUTH L'URI DELLA CHIAMATA CORRISPONDENTE IN AUTOMATICO, ES. /AUTH/REGISTER
app.use("/", products); //STESSA COSA PER PRODUCTS

console.log("Server started");
