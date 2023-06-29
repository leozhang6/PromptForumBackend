import express, { Express, Request, Response } from "express";
import { appRouter } from "./api/routes.js";
import cors from "cors";

const app: Express = express();

app.use(cors());
app.use("/", appRouter);

app.listen(3000, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:3000`);
});
