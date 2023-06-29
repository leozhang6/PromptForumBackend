import { MongoClient } from "mongodb";
import express, { Request, Response } from "express";

import "dotenv/config";
import { error } from "console";

export const appRouter = express.Router();
const uri: any = process.env.MONGO_URI;

appRouter.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

appRouter.get("/posts", async (req: Request, res: Response) => {
  console.log(uri);
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
