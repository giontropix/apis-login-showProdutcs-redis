import chai from "chai";
import request from "supertest";
import { app } from "../index.js"; //DESTRUTTURO EXPRESS E LO IMPORTO
import listOfProducts from "../listOfproducts.js";
import { regUser, logUser, logOutUser } from "./authUsers.test.js"; //IMPORTO LE FUNZIONI MULTIUSO
import {notSetted} from "../routes/authUsers.js";
import redis from "redis";

chai.should();
const client = redis.createClient();

let token;

describe("Products", () => {  //I PRODOTTI POSSONO ESSERE VISTI SOLO DA UTENTI LOGGATI...
  before(async () => await regUser());  //CREO UN UTENTE FITTIZIO
  before(async () => {                  //LOGGO L'UTENTE FITTIZIO, SALVANDO IL TOKEN (MI SERVIRA' PER IL LOGOUT)
    const {body: { userToken },} = await logUser();
    token = userToken;
  });

  after(async () => logOutUser(token)); //FACCIO IL LOGOUT, DATO IL TOKEN IN INPUT
  after(async () => await client.del("sara@mail.it")); //ELIMINO L'UTENTE FITTIZIO

  it("Show all products", async () => {
    const { status, body } = await request(app).get("/products").set({ Accept: "application/json", token });
    status.should.be.equal(200);
    body.should.have.lengthOf(listOfProducts.length); //LUNGHEZZA LISTA DI RISPOSTA === LUNGHEZZA LISTA ORIGINALE (TUTTI I PRODOTTI INSOMMA)
  });
  it("Show product by id", async () => {
    const {status, body: { id }} = await request(app).get(`/products/${listOfProducts[0].id}`).set({ Accept: "application/json", token });
    status.should.be.equal(200);
    id.should.be.equal(listOfProducts[0].id);
  });
});

describe("Products read error", () => { //OVVIAMENTE FACCIO ANCHE UN TEST PER VERIFICARE SE, SENZA LOGIN, SI VEDONO I PRODOTTI
  it("Products without login", async () => {
    const { status, body } = await request(app).get("/products").set({ Accept: "application/json", token: notSetted });
    status.should.be.equal(401);
    body.should.have.property("error");
  });
});

describe("Update expired token ", () => { //OVVIAMENTE FACCIO ANCHE UN TEST PER VERIFICARE SE, SENZA LOGIN, SI VEDONO I PRODOTTI
    before(async () => await regUser());  //CREO UN UTENTE FITTIZIO
    before(async () => {                  //LOGGO L'UTENTE FITTIZIO, SALVANDO IL TOKEN (MI SERVIRA' PER IL LOGOUT)
        const {body: { userToken },} = await logUser();
        token = userToken;
    });
    before(async()=> await client.del(token)) //ELIMINIAMO IL TOKEN PRIMA DEL TEST, COSI' DA SIMULARE LA SUA SCADENZA

    after(async () => logOutUser(token)); //FACCIO IL LOGOUT
    after(async () => await client.del("sara@mail.it")); //ELIMINO L'UTENTE FITTIZIO

    it("Visiting products without a token", async () => {
      const { status, body } = await request(app).get("/products").set({ Accept: "application/json", token, mail: "sara@mail.it" });
      status.should.be.equal(200);
     body.should.have.lengthOf(listOfProducts.length); //LUNGHEZZA LISTA DI RISPOSTA === LUNGHEZZA LISTA ORIGINALE (TUTTI I PRODOTTI INSOMMA)
    });
  });
