import express from "express";
import { body, validationResult } from "express-validator";
import redis from "redis";
import bluebird from "bluebird";
import TokenGenerator from "uuid-token-generator";

const router = express.Router();

const client = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

const handeErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors);
  else next();
};

let loggedUserToken = {userToken: "undefined"}; //OGGETTO CHE SIMULERA' IL TOKEN CHE IL BROWSER MANDA AL SERVER
export let {userToken} = loggedUserToken; //DESTRUTTURO SOLO IL TOKEN CHE MANDERO' IN PRODUCTS.JS
//CREO UN OGGETTO PER AVERNE IL RIFERIMENTO DI MEMORIA, COSI' DA SEGUIRE I SUOI VALORI ANCHE SE ESPORTATO IN PRODUCTS.JS

router.post("/register/", body("mail").exists(), body("user_name").exists(), body("password").exists(), handeErrors, async ({ body: { mail, user_name, password } }, res) => {
  if(await client.getAsync(mail) === null){ //SE NON TROVO L'UTENTE CON LA CHIAVE MAIL
    client.set(mail, JSON.stringify({ user_name, password }), redis.print); //CREO L'UTENTE COME OGGETTO DEL DB
    const {user_name: name} = JSON.parse(await client.getAsync(mail)); //DOPO AVERLO CREATO, ME LO PRENDO PER VERIFICARNE LA CORRETTEZZA
    return res.status(201).json({ name, mail }); //E NE MOSTRO I DATI COME RISPOSTA
  } else return res.status(403).json({error: "user already exists"}) //SE L'UTENTE GIA' ESISTE NON LO REGISTRO DI NUOVO
});

router.get("/login/", async ({headers: {token = userToken, mail, password} }, res) => {
  if(await client.getAsync(mail) !== null) { //SE TROVO L'UTENTE CON LA CHIAVE MAIL
    if(await client.getAsync(token) === null) { //SE NON TROVO EVENTUALI TOKEN INVIATI DAL BROWSER
      const user = JSON.parse(await client.getAsync(mail)); //PRENDO L'UTENTE CERCANDOLO CON LA CHIAVE MAIL
      if(user.password === password){ //SE LA PASSWORD INSERITA CORRISPONDE ALLA PASSWORD DELL'UTENTE
        userToken = tokgen.generate(); //GENERO UN TOKEN
        client.set(userToken, JSON.stringify(mail), redis.print); //CREO UN OGGETTO NEL DB CON CHIAVE TOKEN E VALORE LA MAIL DELL'UTENTE
        return res.status(201).json({ userToken, debug: user }) //RITORNO L'UTENTE
      } else return res.status(401).json({error: "Invalid password"}) //SE LA PASSWORD NON CORRISPONDE RISPONDO CHE E' ERRATA
    } else return res.status(400).json({error: "user already logged", userToken}) //SE ESISTE IN DB IL TOKEN DICO CHE L'UTENTE E' GIA' LOGGATO
  } return res.status(404).json({error: "user not found"}) //SE CON LA MAIL NON TROVO CHIAVI L'UTENTE NON ESISTE
})

router.delete("/logout/", async ({ headers: { token = userToken } }, res) =>{
  if(await client.getAsync(token) !== null) { //SE TROVO L'UTENTE CON LA CHIAVE MAIL
    client.del(token) //ELIMINO L'OGGETTO DEL DB CON CHIAVE IL TOKEN ASSEGNATO AL LOGIN
    userToken="undefined"; //RESETTO LA VARIABILE LOCALE TOKEN CHE SIMULA IL TOKEN CHE IL BROWSER MANDA AL SERVER
    return res.status(201).json({message: "logout done"}) //RITORNO UNA RISPOSTA
  } else return res.status(400).json({error: "user not logged"}) //SE NON TROVO L'UTENTE DA SCOLLEGARE FORSE L'UTENTE NON E' LOGGATO
})

export {router as authUsers} //ESPORTO IL ROUTER COSI' POSSO IMPORTARLO SU INDEX.JS
