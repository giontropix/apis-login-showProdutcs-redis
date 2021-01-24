import express from "express";
import redis from "redis";
import bluebird from "bluebird"; //INTRODUCE LE CHIAMATE ASINCRONE IN REDIS (GETASYNC)
import listOfProducts from "../listOfproducts.js"; //LISTA DEI PRODOTTI
import {userToken, userMail, setUserToken, notSetted} from "./authUsers.js"; //TOKEN IN AUTHUSERS.JS CHE IN AUTOMATICO SINCRONIZZERA' LE SUE EVOLUZIONI DA QUEL FILE
import TokenGenerator from "uuid-token-generator";

const router = express.Router();

const client = redis.createClient();

const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const updateExpiredToken = async ({ headers: { token = userToken, mail = userMail } }, _, next) => { //SE IL TOKEN E' SCADUTO LO RINNOVO
  const tokenMail = JSON.parse(await client.getAsync(token)) //RICAVIAMO LA MAIL PER CERCARE L'UTENTE
  if(tokenMail === null && mail !== notSetted) { //SE NON C'E' UN TOKEN MA L'UTENTE RISULTA CONNESSO
    const {is_logged} = JSON.parse(await client.getAsync(mail)); //RICAVIAMO L'UTENTE CON LA MAIL OTTENUTA
    if(is_logged){ //SE NONOSTANTE L'ASSENZA DI UN TOKEN L'UTENTE RISULTA ANCORA LOGGATO
      setUserToken(tokgen.generate());
      client.set(token, JSON.stringify(mail), 'EX', 60 * 60, redis.print); //RINNOVA IL TOKEN A NOME DELL'UTENTE
    }
  }
  next();
}

router.get("/products/", updateExpiredToken, async ({ headers: { token = userToken } }, res) => {
  if ((await client.getAsync(token)) !== null) return res.status(200).json(listOfProducts); //SE TROVO CORRISPONDENZA CON IL TOKEN RITORNO TUTTI GLI OGGETTI
  return res.status(401).json({ error: "user must be logged to see products list" }); //SE NO RITORNO UN MESSAGGIO D'ERRORE
  });

router.get("/products/:id", updateExpiredToken, async ({ params: { id }, headers: { token = userToken } }, res) => {
  if ((await client.getAsync(token)) === null) return res.status(401).json({ error: "user must be logged to see products list" }); //SE NON TROVO CORRISPONDENZA CON IL TOKEN INSERITO RITORNO CON UN MESSAGGIO D'ERRORE
  const product = listOfProducts.find((product) => product.id === id); //SE NO CERCO L'OGGETTO NELLA LISTA CHE HA L'ID DESIDERATO
  if(!product) return res.status(404).json({error: "product not found"})//SE  NON TROVO IL PRODOTTO RITORNO CON UN MESSAGGIO D'ERRORE
  return res.status(200).json(product); //SE NO RITORNO IL PRODOTTO TROVATO COME RISPOSTA
  });

export {router as products} //ESPORTO IL ROUTER COSI' POSSO IMPORTARLO SU INDEX.JS