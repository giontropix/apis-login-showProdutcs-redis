import chai from "chai";
import request from "supertest";
import { app } from "../index.js";
import redis from "redis";
import bluebird from "bluebird";
import {userToken, setUserToken} from "../index.js"

const client = redis.createClient();
chai.should();
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//FUNZIONI CON ALL'INTERNO DELLE CHIAMATE CHE VERRANNO FATTE SPESSO, ESSENDO DENTRO UN DB TUTTE LE NOSTRE MODIFICHE VERRANNO MEMORIZZATE
//QUINDI MOLTI TEST HANNO BISOGNO DEI DATI GIA' PRESENTI PER POTER FUNZIONARE, CON BEFORE GESTISCO I DATI CHE DEVONO ESSERCI PRIMA DEI TEST
//(PER FARE UN LOGIN, PER ESEMPIO, DEVE PRIMA ESSERCI UN UTENTE) E POI ALLA FINE ELIMINO L'UTENTE FITTIZIO CREATO

//REGISTRO UN UTENTE FITTIZIO
export const regUser = () =>
  request(app).post("/auth/register").set("Accept", "application/json").send({
    mail: "sara@mail.it",
    user_name: "Rosaria",
    password: "sara",
  });

//LOGGO UN UTENTE FITTIZIO
export const logUser = () =>
  request(app).get("/auth/login").set({
    Accept: "application/json",
    token: userToken,
    mail: "sara@mail.it",
    password: "sara",
  });

//SLOGGO UN UTENTE FITTIZIO
export const logOutUser = (token) =>
  request(app)
    .delete("/auth/logout")
    .set({ Accept: "application/json", token });

//TESTING REGISTER USER

describe("Register user", () => {

  before(() => regUser()); //REGISTRO UN UTENTE PER VERIFICARE SE INSERENDOLO DI NUOVO IL SISTEMA MI FERMA

  after(() => client.del("saro@mail.it")); //DOPO I TEST ELIMINO GLI UTENTI FITTIZI CREATI
  after(() => client.del("sara@mail.it")); //DOPO I TEST ELIMINO GLI UTENTI FITTIZI CREATI

  it("Register new user", async () => {
    const { status, body } = await request(app).post("/auth/register").set("Accept", "application/json")
      .send({
        mail: "saro@mail.it",
        user_name: "Rosario",
        password: "saro",
      });
    status.should.equal(201);
    body.should.not.have.property("error");
    body.user.should.have.property("user_name")
    body.user.should.have.property("mail")
  });

  it("Register an user already exists", async () => {
    const { status, body } = await regUser()
    status.should.equal(403);
    body.should.have.property("error");
  });
});

//TESTING LOGIN USER

describe("Login user", () => {

  before(() => regUser()); //PRIMA...REGISTRO L'UTENTE

  after(async () => logOutUser(userToken)); //DOPO I TEST...SLOGGO L'UTENTE
  after(() => client.del("sara@mail.it")); //CANCELLO L'UTENTE DAL DB

  it("Login the first time", async () => {
    const { status, body } = await logUser();
    status.should.equal(201);
    body.should.have.property("token");
    body.should.not.have.property("error");
    setUserToken(body.token); //AGGIORNO IL VALORE DEL TOKEN DELL'UTENTE SECONDO QUELLO CHDE E' STATO GENERATO DAL SISTEMA
  });

  it("login the second time without logout", async () => {
    const { status, body } = await logUser();
    status.should.equal(400);
    body.should.have.property("error");
  });
});

//TESTING LOGOUT METHOD -----------

describe("Logout", () => {
  describe("Logout user", () => {

    before(async () => await regUser()); //PRIMA REGISTRO L'UTENTE
    before(async () => { //DOPO AVERLO REGISTRATO FACCIO IL LOGIN E MEMORIZZO IL TOKEN ASSEGNATO
      const { body: {token} } = await logUser();
      setUserToken(token); //QUI E' DOVE MEMORIZZO IL TOKEN PER SIMULARE IL SUO SALVATAGGIO NEL BROWSER DELL'UTENTE
    });

    after(async () => await client.del("sara@mail.it")); //FINITI I TEST ELIMINO L'UTENTE FITTIZIO CREATO

    it("Logout successfully", async () => {
      const { status, body } = await logOutUser(userToken);
      status.should.equal(201);
      body.should.not.have.property("error");
      client.get(body.userToken, (_, rep) => rep).should.equal(false); //INSERENDO IL TOKEN CHE IL LOGOUT ELIMINA NON DEVO PIU' TROVARLO NEL DB
    });
  });

  describe("Logout error", () => {
    it("Logout if not logged in", async () => {
      const { status, body } = await logOutUser(userToken);
      status.should.equal(400);
      body.should.have.property("error");
    });
  });
});
