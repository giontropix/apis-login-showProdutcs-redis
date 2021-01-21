const express = require("express");
const router = express.Router();

const redis = require("redis");
const client = redis.createClient();

var bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const listOfProducts = require("../listOfproducts.json");

router.get("/products/", async ({ headers: { token } }, res) => {
  if ((await client.getAsync(token)) !== null) {
    res.status(200).json({ listOfProducts });
  }
  return res
    .status(403)
    .json({ error: "user must be logget to see products list" });
});

router.get("/products/:id", async ({ params: { id }, headers: { token } }, res) => {
  if ((await client.getAsync(token)) !== null) {
    const product = listOfProducts.find((product) => product.id === id);
    return res.status(200).json({ product });
  }
  return res
    .status(403)
    .json({ error: "user must be logget to see products list" });
});
