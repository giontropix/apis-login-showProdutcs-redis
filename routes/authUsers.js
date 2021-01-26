import express from "express";
import { body, header, validationResult } from "express-validator";
import redis from "redis";
import bluebird from "bluebird";
import TokenGenerator from "uuid-token-generator";
import {userToken, setUserToken, setUserMail } from "../index.js"; //TOKEN IN AUTHUSERS.JS CHE IN AUTOMATICO SINCRONIZZERA' LE SUE EVOLUZIONI DA QUEL FILE

const router = express.Router();

const client = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

export const handleErrors = (req, res, next) => { //! PENSAVO DI PORTARLO IN INDEX.JS PER AVERE QUI SOLO ROUTER MA RICEVO UN ERRORE: CANNOT ACCESS BEFORE INITIALIZATION
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors);
  else next();
};

//REGISTRARE UN NUOVO UTENTE
router.post("/register/", body("mail").exists().isEmail().normalizeEmail(), body("user_name").exists().trim().escape().notEmpty(), body("password").exists().isLength({ min: 4 }), handleErrors, async ({ body: { mail, user_name, password } }, res) => {
  if(await client.getAsync(mail) !== null) return res.status(403).json({error: "user already exists"}) //SE TROVO L'UTENTE CON LA CHIAVE MAIL VUOL DIRE CHE E' GIA' LOGGATO, QUINDI RITORNO CON UN MESSAGGIO D'ERRORE
  client.set(mail, JSON.stringify({ user_name, password, is_logged: false }), redis.print); //SE NO CREO L'UTENTE COME OGGETTO DEL DB
  return res.status(201).json({ message: "user successfully registered", user: {user_name, mail} }); //E NE MOSTRO I DATI COME RISPOSTA
  });

//?ASSEGNO AGLI ELEMENTI DESTRUTTURATI DELL'HEADER IL VALORE USERTOKEN OPPURE USERMAIL COSI' LE RICHIESTE DI POSTMAN
//?SEGUIRANNO VIA VIA IL VALORE CHE L'USERTOKEN O LA USERMAIL AVRANNO, SENZA INSERIRLI MANUALMENTE.
//?CIO' PERMETTE ANCHE DI EVITARE LOGIN O LOGOUT MULTIPLI

//LOGIN UTENTE
router.get("/login/", header("mail").exists().isEmail().normalizeEmail(), header("password").exists().notEmpty(), handleErrors, async ({headers: {token = userToken, mail, password} }, res) => {
  if(await client.getAsync(token) !== null) return res.status(400).json({error: "user already logged", userToken})//SE TROVO EVENTUALI TOKEN RIFERITI ALL'UTENTE, QUINDI UTENTE E' GIA' LOGGATO RITORNO CON UN MESSAGGIO D'ERRORE
  const user = JSON.parse(await client.getAsync(mail)); //CERCO L'UTENTE CON LA CHIAVE MAIL
  if(user === null) return res.status(404).json({error: "user not found"}) //SE NON TROVO L'UTENTE CON LA CHIAVE MAIL VUOL DIRE CHE L'UTENTE NON ESISTE NEL DB QUINDI RITORNO CON UN MESSAGGIO D'ERRORE
  if(user.password !== password) return res.status(401).json({error: "Invalid password"})//SE LA PASSWORD INSERITA NON CORRISPONDE ALLA PASSWORD DELL'UTENTE RITORNO CON UN MESSAGGIO D'ERRORE
  setUserToken(tokgen.generate()); // SE SUPERO I CONTROLLI PRECEDENTI GENERO UN TOKEN CHE SIMULO SIA MANDATO AL BROWSER DELL'UTENTE
  setUserMail(mail) //ASSOCIO LA MAIL CHE FITTIZIAMENTE APPARTIENE AL BROWSER DELL'UTENTE ALLA MAIL INSERITA DALL'UTENTE STESSO (CREO UNA SPECIE DI COOKIE)
  client.set(userToken, JSON.stringify(mail), 'EX', 60, redis.print); //POI CREO UN OGGETTO NEL DB CON CHIAVE TOKEN E VALORE LA MAIL DELL'UTENTE
  client.set(mail, JSON.stringify({user_name: user.user_name, password, is_logged: true}), redis.print) //RISCRIVO L'UTENTE DICENDO CHE E' LOGGATO
  return res.status(201).json({ message: "login done", get_user_db: JSON.parse(await client.getAsync(userToken)), token: userToken}) //RITORNO L'UTENTE
  })

//LOGOUT UTENTE
router.delete("/logout/", async ({ headers: { token = userToken } }, res) =>{
  const mail = JSON.parse(await client.getAsync(token)) //CERCO IL TOKEN NEL DB
  if(mail === null) return res.status(400).json({error: "user not logged"}) //SE NON TROVO TOKEN REGISTRATI NEL DB L'UTENTE NON E' COLLEGATO, RITORNO CON UN MESSAGGIO D'ERRORE
  const {user_name, password} = JSON.parse(await client.getAsync(mail)); //ALTRIMENTI, POICHE' LA CHIAVE TOKEN IN DB MI TORNA L'EMAIL DELL'UTENTE, USO QUESTA MAIL PER CERCARE L'UTENTE NEL DB
  client.set(mail, JSON.stringify({user_name, password, is_logged: false}), redis.print); //UNA VOLTA TROVATO, SETTO NEL DB IL SUO STATO IN IS_LOGGED = FALSE
  client.del(token) //ED INFINE ELIMINO L'OGGETTO NEL DB CON CHIAVE IL TOKEN ASSEGNATO AL LOGIN
  setUserToken(""); //? IMMAGINO CHE FATTO IL LOGOUT ANCHE LA SESSION O IL COOKIE VENGANO CANCELLATI DAL BROWSER DELL'UTENTE?
  setUserMail(""); //? IMMAGINO CHE FATTO IL LOGOUT ANCHE LA SESSION O IL COOKIE VENGANO CANCELLATI DAL BROWSER DELL'UTENTE?
  return res.status(201).json({message: "logout done", get_user_db: JSON.parse(await client.getAsync(token))}) //RITORNO UNA RISPOSTA
  })

export {router as authUsers} //ESPORTO IL ROUTER COSI' POSSO IMPORTARLO SU INDEX.JS
