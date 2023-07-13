import { MongoClient } from "mongodb";
import express, { Request, Response } from "express";
import "dotenv/config";
import { error } from "console";
import bcrypt from "bcryptjs";
import { createSecretToken } from "../utils/SecretToken.js";
import { nextTick } from "process";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

export const appRouter = express.Router();
const uri: any = process.env.MONGO_URI;

appRouter.post("/", cookieParser(), (req: Request, res: Response) => {
  const client = new MongoClient(uri);
  const token = req.cookies.token;
  if (token) {
    return res.json({ status: false });
  }
  let sec: string = process.env.TOKEN_KEY as string;

  jwt.verify(token, sec, async (err: any, data: any) => {
    if (err) {
      return res.json({ status: false });
    } else {
      const user = await client
        .db("AiPromptForumData")
        .collection("Users")
        .findOne(data.id);
      if (user) return res.json({ status: true, user: user.username });
      else return res.json({ status: false });
    }
  });
});

appRouter.get("/posts", async (req: Request, res: Response) => {
  const client = new MongoClient(uri);
  try {
    // Connect to the MongoDB cluster
    await client.connect();

    const posts = await client
      .db("AiPromptForumData")
      .collection("Posts")
      .find({})
      .toArray();
    res.send(posts);
    console.log(posts);
  } catch {
    console.error("Error retrieving posts:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
});

appRouter.post(
  "/signup",
  bodyParser.json(),
  async (req: Request, res: Response, next) => {
    const client = new MongoClient(uri);
    try {
      // Connect to the MongoDB cluster
      console.log(req.body);
      let email = req.body.email;
      let password = req.body.password;
      let username = req.body.username;
      let createdAt = new Date();
      await client.connect();
      password = await bcrypt.hash(password, 12);
      const existingUser = await client
        .db("AiPromptForumData")
        .collection("Users")
        .findOne({ email });
      if (existingUser) {
        return res.json({ message: "User already exists" });
      }
      let userId = "";
      const user = await client
        .db("AiPromptForumData")
        .collection("Users")
        .insertOne({
          email: email,
          password: password,
          username: username,
          createdAt: createdAt,
        })
        .then((result) => {
          userId = result.insertedId.toString();
        });
      const token = createSecretToken(userId);
      console.log(token);
      res.cookie("token", token, {
        secure: true,
        httpOnly: false,
      });
      res.status(201).json("Successfully created new user");
      next();
    } catch {
      console.error("Error signing up:", error);
      res.status(500).send("Internal Server Error");
    } finally {
      // Close the connection to the MongoDB cluster
      await client.close();
    }
  }
);

appRouter.post(
  "/login",
  bodyParser.json(),
  async (req: Request, res: Response, next) => {
    const client = new MongoClient(uri);
    try {
      const email = req.body.email;
      const password = req.body.password;
      if (!email || !password) {
        return res.json({ message: "All fields are required" });
      }
      const user = await client
        .db("AiPromptForumData")
        .collection("Users")
        .findOne({
          email,
        });
      if (!user) {
        return res.json({ message: "Incorrect password or email" });
      }
      const auth = await bcrypt.compare(password, user.password);
      if (!auth) {
        return res.json({ message: "Incorrect password or email" });
      }
      const token = createSecretToken(user._id);
      res.cookie("token", token, {
        secure: true,
        httpOnly: false,
      });
      res
        .status(201)
        .json({ message: "User logged in successfully", success: true });
      next();
    } catch (error) {
      console.error(error);
    }
  }
);
