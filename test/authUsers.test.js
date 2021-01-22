import chai from "chai";
chai.should();
import request from "supertest";
import { app } from "../index.js";

import redis from "redis";
const client = redis.createClient();

import bluebird from "bluebird";

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let userToken = "";

const regUser = () =>
  request(app).post("/auth/register").set("Accept", "application/json").send({
    mail: "sara@mail.it",
    user_name: "Rosaria",
    password: "sara",
  });

const logUser = () =>
  request(app).get("/auth/login").set({
    Accept: "application/json",
    mail: "sara@mail.it",
    password: "sara",
  });

const logOutUser = () =>
  request(app)
    .delete("/auth/logout")
    .set({ Accept: "application/json", token: userToken });

describe("Register user", () => {
  before(() => regUser());
  after(() => client.del("saro@mail.it"));
  after(() => client.del("sara@mail.it"));

  it("Register new user", async () => {
    const { status, body } = await request(app)
      .post("/auth/register")
      .set("Accept", "application/json")
      .send({
        mail: "saro@mail.it",
        user_name: "Rosario",
        password: "saro",
      });
    status.should.equal(201);
    body.should.not.have.property("error");
  });

  it("Register an user already exists", async () => {
    const { status, body } = await request(app)
      .post("/auth/register")
      .set("Accept", "application/json")
      .send({
        mail: "sara@mail.it",
        user_name: "Rosaria",
        password: "sara",
      });
    status.should.equal(401);
    body.should.have.property("error");
  });
});

describe("Login user", () => {
  before(() => regUser());
  after(async () => logOutUser());
  after(() => client.del("sara@mail.it"));
  after(()=> client.del(userToken))

  it("login", async () => {
    const { status, body } = await logUser();
    status.should.equal(201);
    body.should.have.property("userToken");
    body.should.not.have.property("error");
    userToken = body.userToken;
  });

  it("login twice", async () => {
    const { status, body } = await logUser();
    status.should.equal(403);
    body.should.have.property("error");
  });
});

//TESTING LOGOUT METHOD -----------

describe("Logout", () => {
  describe("Logout user", () => {
    before(async () => await regUser());
    before(async () => {
      const { body } = await logUser();
      userToken = body.userToken;
    });
    after(async () => await client.del("sara@mail.it"));

    it("Logout successfully", async () => {
      const { status, body } = await logOutUser();
      status.should.equal(201);
      body.should.not.have.property("error");
    });
  });

  describe("Logout error", () => {
    it("Logout if not logged in", async () => {
      const { status, body } = await logOutUser();
      status.should.equal(404);
      body.should.have.property("error");
    });
  });
});
