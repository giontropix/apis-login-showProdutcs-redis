import express from "express";
const router = express.Router();

import redis from "redis";
const client = redis.createClient();

import bluebird from "bluebird";
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

import listOfProducts from "../listOfproducts.js";
import {userToken} from "./authUsers.js";

router.get("/products/", async ({ headers: { token = userToken } }, res) => {
    if ((await client.getAsync(token)) !== null) {
      return res.status(200).json(listOfProducts);
    }
    return res.status(403).json({ error: "user must be logget to see products list" });
  });

router.get("/products/:id", async ({ params: { id }, headers: { token = userToken } }, res) => {
    if ((await client.getAsync(token)) !== null) {
      const product = listOfProducts.find((product) => product.id === id);
      return res.status(200).json(product);
    }
    return res.status(403).json({ error: "user must be logget to see products list" });
  });

export {router as products}
