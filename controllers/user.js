
import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendMail, { sendForgotMail } from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";

// 📝 Register a new user and send OTP
export const register = TryCatch(async (req, res) => {
  const { email, name, password } = req.body;

  let user = await User.findOne({ email });

  if (user) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user = {
    name,
    email,
    password: hashedPassword,
  };

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

  const activationToken = jwt.sign(
    { user, otp },
    process.env.Activation_Secret,
    { expiresIn: "5m" }
  );

  await sendMail(email, "E-learning Platform Verification", { name, otp });

  res.status(200).json({
    message: "OTP sent to your email",
    activationToken,
  });
});

// ✅ Verify OTP and create user
export const verifyUser = TryCatch(async (req, res) => {
  const { otp, activationToken } = req.body;

  const decoded = jwt.verify(activationToken, process.env.Activation_Secret);

  if (!decoded) {
    return res.status(400).json({ message: "OTP expired or invalid" });
  }

  if (decoded.otp !== otp) {
    return res.status(400).json({ message: "Incorrect OTP" });
  }

  await User.create({
    name: decoded.user.name,
    email: decoded.user.email,
    password: decoded.user.password,
  });

  res.json({ message: "Account successfully registered" });
});

// 🔐 Login
export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "No user found with this email" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Incorrect password" });
  }

  const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15d",
  });

  res.json({
    message: `Welcome back, ${user.name}`,
    token,
    user,
  });
});

// 👤 Get authenticated user profile
export const myProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
});

// 🔑 Forgot Password - send reset link
export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "No user associated with this email" });
  }

  const token = jwt.sign({ email }, process.env.Forgot_Secret);
  const data = { email, token };

  await sendForgotMail("E-learning Platform", data);

  user.resetPasswordExpire = Date.now() + 5 * 60 * 1000; // 5 minutes

  await user.save();

  res.json({ message: "Password reset link has been sent to your email" });
});

// 🔄 Reset Password using token
export const resetPassword = TryCatch(async (req, res) => {
  const { token } = req.query;

  const decoded = jwt.verify(token, process.env.Forgot_Secret);

  const user = await User.findOne({ email: decoded.email });

  if (!user) {
    return res.status(404).json({ message: "User does not exist" });
  }

  if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
    return res.status(400).json({ message: "Reset token has expired" });
  }

  const newPassword = await bcrypt.hash(req.body.password, 10);

  user.password = newPassword;
  user.resetPasswordExpire = null;

  await user.save();

  res.json({ message: "Password has been reset successfully" });
});
