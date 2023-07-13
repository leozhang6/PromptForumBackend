import "dotenv/config";
import jwt from "jsonwebtoken";

export function createSecretToken(id: any) {
  let sec: string = process.env.TOKEN_KEY as string;
  console.log(sec);
  return jwt.sign({ id }, sec, {
    expiresIn: 3 * 24 * 60 * 60,
  });
}
