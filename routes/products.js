import express from "express";
import redis from "redis";
import bluebird from "bluebird"; //INTRODUCE LE CHIAVATE ASINCRONE IN REDIS (GETASYNC)
import listOfProducts from "../listOfproducts.js"; //LISTA DEI PRODOTTI
import {userToken} from "./authUsers.js"; //TOKEN IN AUTHUSERS.JS CHE IN AUTOMATICO SINCRONIZZERA' LE SUE EVOLUZIONI DA QUEL FILE

const router = express.Router();

const client = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

router.get("/products/", async ({ headers: { token = userToken } }, res) => {
    if ((await client.getAsync(token)) !== null) {//SE TROVO CORRISPONDENZA CON IL TOKEN INSERITO
      return res.status(200).json(listOfProducts); //RITORNO TUTTI GLI OGGETTI
    }
    return res.status(401).json({ error: "user must be logget to see products list" }); //SE NO RISPONDO NEGATIVAMENTE
  });

router.get("/products/:id", async ({ params: { id }, headers: { token = userToken } }, res) => {
    if ((await client.getAsync(token)) !== null) { //SE TROVO CORRISPONDENZA CON IL TOKEN INSERITO
      const product = listOfProducts.find((product) => product.id === id); //CDRCO L'OGGETTO NELLA LISTA CHE HA L'ID DESIDERATO
      if(product) {//SE TROVO IL PRODOTTO
        return res.status(200).json(product); //LO RITORNO COME RISPOSTA
      } else return res.status(404).json({error: "product not found"}) //SE NO RISPONDO CHE NON L'HO TROVATO
    }
    return res.status(401).json({ error: "user must be logget to see products list" }); //SE NO RISPONDO NEGATIVAMENTE
  });

export {router as products} //ESPORTO IL ROUTER COSI' POSSO IMPORTARLO SU INDEX.JS
