const express = require("express");
const router = express.Router();

const redis = require("redis");
const client = redis.createClient();

var bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const { body, param, validationResult, query } = require("express-validator");

const TokenGenerator = require("uuid-token-generator");
const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

const handeErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors);
  else next();
};

router.post("/register/", body("user_name").exists, body("password").exists, handeErrors, async ({ body: { user_name, mail, password } }, res) => {
  if(await client.getAsync(mail) === null){
    client.set(mail, JSON.stringify({ user_name, password }), redis.print);
    const user = JSON.parse(await client.getAsync(mail));
    return res.status(201).json({ added_user: {user_name: user.user_name, mail: user.mail }});
  } else return res.status(401).json({error: "user already exists"})
});


router.get("/login/", async ({headers: {mail, password} }, res) => {
  if(await client.getAsync(mail) !== null){
    const user = JSON.parse(await client.getAsync(mail));
    if(user.password === password){
      const token = tokgen.generate();
      client.set(token, mail, redis.print);
      const userToken = JSON.parse(await client.getAsync(token))
      return res.status(201).json({userToken, debug: user})
    } else return res.status(401).json({error: "Invalid password"})
  }
})

module.exports = router;
