import express from "express";
import redis from "redis";
import bluebird from "bluebird"; //INTRODUCE LE CHIAMATE ASINCRONE IN REDIS (GETASYNC)
import listOfProducts from "../listOfproducts.js"; //LISTA DEI PRODOTTI
import {userToken, userMail, setUserToken} from "../index.js"; //TOKEN IN AUTHUSERS.JS CHE IN AUTOMATICO SINCRONIZZERA' LE SUE EVOLUZIONI DA QUEL FILE
import TokenGenerator from "uuid-token-generator";

const router = express.Router();

const client = redis.createClient();

const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const updateExpiredToken = async ({ headers: { token = userToken, mail = userMail } }, res, next) => { //SE IL TOKEN E' SCADUTO LO RINNOVO
  if(token && await client.getAsync(token) === null) { //SE C'E' UN TOKEN MA CON QUESTO TOKEN NON TROVIAMO NIENTE...
    if(mail){ //PERO' L'UTENTE SEMBRA UN UTENTE REGISTRATO
      const user = JSON.parse(await client.getAsync(mail)); //RICAVIAMO L'UTENTE CON LA MAIL OTTENUTA
      if(user && user.is_logged){ //SE NONOSTANTE L'ASSENZA DI UN TOKEN L'UTENTE ESISTE IN DB E RISULTA ANCORA LOGGATO
        setUserToken(tokgen.generate()); //GENERO UN NUOVO TOKEN PER L'UTENTE
        client.set(userToken, JSON.stringify(mail), 'EX', 60, redis.print); //RINNOVA IL TOKEN A NOME DELL'UTENTE
      }
    } else return res.status(401).json({ error: "User must be logged to see products list" });
  }
  next();
}

router.get("/products/", updateExpiredToken, async ({ headers: { token } }, res) => {
  token = userToken; //?A DIFFERENZA DELLE ALTRE API L'ASSEGNAZIONE LA METTO QUI PERCHE' NEI TEST DO UN TOKEN NELLA REQ, CHE SOVRASCRIVE L'ASSEGNAZIONE DIRETTAMENTE NELLA DESTRUTTURAZIONE
  if(!token || await client.getAsync(token) === null) return res.status(401).json({ error: "User must be logged to see products list" });
  return res.status(200).json(listOfProducts); //SE TROVO CORRISPONDENZA CON IL TOKEN RITORNO TUTTI GLI OGGETTI
  });

router.get("/products/:id", updateExpiredToken, async ({ params: { id }, headers: { token } }, res) => {
  token = userToken; //?A DIFFERENZA DELLE ALTRE API L'ASSEGNAZIONE LA METTO QUI PERCHE' NEI TEST DO UN TOKEN NELLA REQ, CHE SOVRASCRIVE L'ASSEGNAZIONE DIRETTAMENTE NELLA DESTRUTTURAZIONE
  if(!token || await client.getAsync(token) === null) return res.status(401).json({ error: "User must be logged to see products list" }); //SE NON TROVO CORRISPONDENZA CON IL TOKEN INSERITO RITORNO CON UN MESSAGGIO D'ERRORE
  const product = listOfProducts.find((product) => product.id === id); //SE NO CERCO L'OGGETTO NELLA LISTA CHE HA L'ID DESIDERATO
  if(!product) return res.status(404).json({error: "Product not found"})//SE  NON TROVO IL PRODOTTO RITORNO CON UN MESSAGGIO D'ERRORE
  return res.status(200).json(product); //SE NO RITORNO IL PRODOTTO TROVATO COME RISPOSTA
  });

export {router as products} //ESPORTO IL ROUTER COSI' POSSO IMPORTARLO SU INDEX.JS