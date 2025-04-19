

import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// ✅ Middleware to verify user authentication
export const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(403).json({ message: "Authentication required" });
    }

    const decodedData = jwt.verify(token, process.env.Jwt_Sec);

    req.user = await User.findById(decodedData._id);

    next();
  } catch (err) {
    res.status(500).json({ message: "Please log in first" });
  }
};

// ✅ Middleware to check admin privilege
export const isAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
