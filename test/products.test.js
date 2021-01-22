import chai from "chai";
chai.should();
import request from "supertest";
import { app } from "../index.js";
import listOfProducts from "../listOfproducts.js";
import { regUser, logUser, logOutUser } from "./authUsers.test.js";
import redis from "redis";
const client = redis.createClient();

let token;

describe("Products", () => {
  before(async () => await regUser());
  before(async () => {
    const {
      body: { userToken },
    } = await logUser();
    token = userToken;
  });
  after(async () => logOutUser(token));
  after(async () => await client.del("sara@mail.it"));

  it("Show all products", async () => {
    const { status, body } = await request(app)
      .get("/products")
      .set({ Accept: "application/json", token });
    status.should.be.equal(200);
    body.should.have.lengthOf(listOfProducts.length);
  });
  it("Show product by id", async () => {
    const {
      status,
      body: { id },
    } = await request(app)
      .get(`/products/${listOfProducts[0].id}`)
      .set({ Accept: "application/json", token });
    status.should.be.equal(200);
    id.should.be.equal(listOfProducts[0].id);
  });
});

describe("Products read error", () => {
  it("Products without login", async () => {
    const { status, body } = await request(app)
      .get("/products")
      .set({ Accept: "application/json", token });
    status.should.be.equal(401);
    body.should.have.property("error");
  });
});
