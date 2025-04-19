
import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import fs from "fs";
import Stripe from "stripe";

import TryCatch from "../middlewares/TryCatch.js";
import { instance } from "../index.js";

import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🧠 Get all available courses
export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({ courses });
});

// 📘 Get a specific course
export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  res.json({ course });
});

// 🎥 Get all lectures in a course
export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });
  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id)) {
    return res.status(400).json({ message: "You have not subscribed to this course" });
  }

  res.json({ lectures });
});

// 📺 Get a single lecture
export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  const user = await User.findById(req.user._id);

  if (user.role === "admin") return res.json({ lecture });

  if (!user.subscription.includes(lecture.course)) {
    return res.status(400).json({ message: "You have not subscribed to this course" });
  }

  res.json({ lecture });
});

// 📚 Get user's subscribed courses
export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });
  res.json({ courses });
});

// 💳 Stripe Checkout
export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  const course = await Courses.findById(req.params.id);

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({ message: "You already own this course" });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: course.title },
        unit_amount: course.price * 100,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${course._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment-failure`,
  });

  res.status(201).json({ url: session.url });
});

// ✅ Stripe Payment Verification
export const verifyStripePayment = TryCatch(async (req, res) => {
  const { session_id, courseId } = req.body;

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    return res.status(400).json({ message: "Payment not completed" });
  }

  const user = await User.findById(req.user._id);
  const course = await Courses.findById(courseId);

  if (!user.subscription.includes(course._id)) {
    user.subscription.push(course._id);
    await Progress.create({ user: req.user._id, course: course._id, completedLectures: [] });
    await user.save();
  }

  res.status(200).json({ message: "Course Purchased Successfully" });
});

// 🔐 Razorpay Fallback Verification
export const paymentVerification = TryCatch(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.Razorpay_Secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: "Payment Failed" });
  }

  await Payment.create({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

  const user = await User.findById(req.user._id);
  const course = await Courses.findById(req.params.id);

  user.subscription.push(course._id);

  await Progress.create({
    user: req.user._id,
    course: course._id,
    completedLectures: [],
  });

  await user.save();

  res.status(200).json({ message: "Course Purchased Successfully" });
});

// ✅ Add user progress when a lecture ends
export const addProgress = TryCatch(async (req, res) => {
  const { course, lectureId } = req.query;

  const progress = await Progress.findOne({ user: req.user._id, course });

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({ message: "Progress recorded" });
  }

  progress.completedLectures.push(lectureId);
  await progress.save();

  res.status(201).json({ message: "New progress added" });
});

// 📈 Get user’s course progress
export const getYourProgress = TryCatch(async (req, res) => {
  const courseId = req.query.course;

  const progress = await Progress.find({ user: req.user._id, course: courseId });

  if (!progress || progress.length === 0) {
    return res.status(404).json({ message: "No progress found" });
  }

  const totalLectures = (await Lecture.find({ course: courseId })).length;
  const completedCount = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedCount * 100) / totalLectures;

  res.json({
    courseProgressPercentage,
    completedLectures: completedCount,
    allLectures: totalLectures,
    progress,
  });
});

