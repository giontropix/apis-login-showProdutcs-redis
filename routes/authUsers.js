import express from "express";
const router = express.Router();

import { body, validationResult } from "express-validator";

import redis from "redis";
const client = redis.createClient();

import bluebird from "bluebird";
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

import TokenGenerator from "uuid-token-generator";
const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);

const handeErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors);
  else next();
};

let loggedUserToken = {userToken: "undefined"};
export let {userToken} = loggedUserToken;

router.post("/register/", body("mail").exists(), body("user_name").exists(), body("password").exists(), handeErrors, async ({ body: { mail, user_name, password } }, res) => {
  if(await client.getAsync(mail) === null){
    client.set(mail, JSON.stringify({ user_name, password }), redis.print);
    const user = JSON.parse(await client.getAsync(mail));
    return res.status(201).json({ added_user: {user_name: user.user_name, mail: user.mail }});
  } else return res.status(403).json({error: "user already exists"})
});

router.get("/login/", async ({headers: {token = userToken, mail, password} }, res) => {
  if(await client.getAsync(mail) !== null) {
    if(await client.getAsync(token) === null) {
      const user = JSON.parse(await client.getAsync(mail));
      if(user.password === password){
        userToken = tokgen.generate();
        client.set(userToken, JSON.stringify(mail), redis.print);
        return res.status(201).json({ userToken, debug: user })
      } else return res.status(401).json({error: "Invalid password"})
    } else return res.status(400).json({error: "user already logged", userToken})
  } return res.status(404).json({error: "user not found"})
})

router.delete("/logout/", async ({ headers: { token = userToken } }, res) =>{
  if(await client.getAsync(token) !== null) {
    client.del(token)
    userToken="undefined";
    return res.status(201).json({message: "logout done"})
  } else return res.status(400).json({error: "user not logged"})
})

export {router as authUsers}
