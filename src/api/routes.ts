import { MongoClient } from "mongodb";
import express, { Request, Response } from "express";
import "dotenv/config";
import { error } from "console";
import bcrypt from "bcryptjs";
import { createSecretToken } from "../utils/SecretToken.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import cors from "cors";
import { ObjectId } from "mongodb";
export const appRouter = express.Router();
appRouter.use(bodyParser.json());

const uri: any = process.env.MONGO_URI;
let client: MongoClient | null = null;

appRouter.use(async (req: Request, res: Response, next) => {
  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    next();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    res.status(500).send("Internal Server Error");
  }
});

appRouter.post("/", cookieParser(), async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ status: false });
  }
  console.log("here");
  let sec: string = process.env.TOKEN_KEY as string;

  try {
    jwt.verify(token, sec, async (err: any, data: any) => {
      if (err) {
        return res.json({ status: false });
      } else {
        const id = new ObjectId(data.id);
        const user = await client!
          .db("AiPromptForumData")
          .collection("Users")
          .findOne({ _id: id });
        console.log(user);
        if (user) {
          return res.json({
            status: true,
            user: user.username,
            _id: user._id,
            likedPosts: user.likedPosts,
          });
        } else return res.json({ status: false });
      }
    });
  } catch {
    console.error("Error retriving posts:", error);
    res.status(500).send("internal server error");
  }
});

appRouter.get("/post/:id", async (req: Request, res: Response) => {
  const id = new ObjectId(req.params.id);
  console.log(req.params.id);
  try {
    const post = await client!
      .db("AiPromptForumData")
      .collection("Posts")
      .findOne({ _id: id });
    res.send(post);
  } catch {
    console.error("Error retriving posts:", error);
    res.status(500).send("internal server error");
  }
});

appRouter.get("/posts", async (req: Request, res: Response) => {
  try {
    // Connect to the MongoDB cluster

    const posts = await client!
      .db("AiPromptForumData")
      .collection("Posts")
      .find({})
      .toArray();
    res.send(posts);
    console.log(posts);
  } catch {
    console.error("Error retrieving posts:", error);
    res.status(500).send("Internal Server Error");
  }
});

appRouter.post("/upvotePost", async (req: Request, res: Response) => {
  console.log("here");
  try {
    const userId = new ObjectId(req.body.userId);
    const postId = new ObjectId(req.body.postId);
    console.log(userId);
    await client!
      .db("AiPromptForumData")
      .collection("Users")
      .updateOne({ _id: userId }, { $push: { likedPosts: postId } });
    await client!
      .db("AiPromptForumData")
      .collection("Posts")
      .updateOne({ _id: postId }, { $inc: { upvoteCount: 1 } });
  } catch {
    console.error("error upvoting post", error);
    res.status(500).send("Internal Server Error");
  }
});

appRouter.post("/downvotePost", async (req: Request, res: Response) => {
  console.log("here");
  try {
    const userId = new ObjectId(req.body.userId);
    const postId = new ObjectId(req.body.postId);
    console.log(userId);
    await client!
      .db("AiPromptForumData")
      .collection("Users")
      .updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
    await client!
      .db("AiPromptForumData")
      .collection("Posts")
      .updateOne({ _id: postId }, { $inc: { upvoteCount: -1 } });
  } catch {
    console.error("error upvoting post", error);
    res.status(500).send("Internal Server Error");
  }
});

appRouter.post("/signup", cors(), async (req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  try {
    // Connect to the MongoDB cluster
    console.log(req.body);
    console.log(res.getHeaders());
    let email = req.body.email;
    let password = req.body.password;
    let username = req.body.username;
    let createdAt = new Date();
    let likedPosts = new Array<ObjectId>();
    password = await bcrypt.hash(password, 12);
    const existingUser = await client!
      .db("AiPromptForumData")
      .collection("Users")
      .findOne({ email });
    if (existingUser) {
      return res.json({ message: "User already exists" });
    }
    let userId = "";
    const user = await client!
      .db("AiPromptForumData")
      .collection("Users")
      .insertOne({
        email: email,
        password: password,
        username: username,
        createdAt: createdAt,
        likedPosts: likedPosts,
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
    res
      .status(201)
      .json({ message: "User signed in successfully", success: true, user });
    next();
  } catch {
    console.error("Error signing up:", error);
    res.status(500).send("Internal Server Error");
  }
});

appRouter.post("/login", async (req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  try {
    const email = req.body.email;
    const password = req.body.password;
    if (!email || !password) {
      return res.json({ message: "All fields are required" });
    }
    const user = await client!
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
});

process.on("SIGINT", async () => {
  try {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    process.exit(1);
  }
});
