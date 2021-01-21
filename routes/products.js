const express = require("express");
const router = express.Router();

const redis = require("redis");
const client = redis.createClient();

var bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);