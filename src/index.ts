import express, { Express, Request, Response } from "express";
import { appRouter } from "./api/routes.js";
import cors from "cors";
import bodyParser from "body-parser";
import "dotenv/config";

const app: Express = express();

app.use(cors());
app.use("/", appRouter);
app.use(bodyParser);

app.listen(3000, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:3000`);
});
