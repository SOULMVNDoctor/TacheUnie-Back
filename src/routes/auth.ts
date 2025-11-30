import { Router } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth";

const router = Router();

// INSCRIPTION
router.post("/register", async (req, res) => {
  const { fullname, password } = req.body;

  if (!fullname || !password)
    return res.status(400).json({ message: "Champs requis" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ fullname, password: hashed });


  const safeUser = {
    _id: user._id,
    fullname: user.fullname,
    createdAt: user.createdAt
  };

  res.json({ message: "Utilisateur créé", user: safeUser });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { fullname, password } = req.body;

  const user = await User.findOne({ fullname });
  if (!user) return res.status(404).json({ message: "User non trouvé" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Mot de passe incorrect" });

  const secret = process.env.JWT_SECRET || "dev_secret";
  const token = jwt.sign({ id: user._id }, secret, { expiresIn: "7d" });

  res.json({ token });
});

// Get current user
router.get("/me", auth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

export default router;
