import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type ReqWithUser = Request & { user?: { id: string } };



export const auth = (req: ReqWithUser, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
    const decoded = jwt.verify(token, secret) as any;
    req.user = { id: decoded?.id || decoded?._id || decoded?.userId };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
};
