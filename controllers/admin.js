
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";

import { rm } from "fs";
import { promisify } from "util";
import fs from "fs";

const unlinkAsync = promisify(fs.unlink);

// 📘 Create a new course
export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, createdBy, duration, price } = req.body;
  const image = req.file;

  await Courses.create({
    title,
    description,
    category,
    createdBy,
    image: image?.path,
    duration,
    price,
  });

  res.status(201).json({ message: "Course Created Successfully" });
});

// 🎥 Add a lecture to a course
export const addLectures = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "No Course with this id" });
  }

  const { title, description } = req.body;
  const file = req.file;

  const lecture = await Lecture.create({
    title,
    description,
    video: file?.path,
    course: course._id,
  });

  res.status(201).json({
    message: "Lecture Added",
    lecture,
  });
});

// ❌ Delete a lecture
export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  rm(lecture.video, () => {
    console.log("Video deleted");
  });

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});

// ❌ Delete entire course with associated lectures
export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      await unlinkAsync(lecture.video);
      console.log("Video deleted");
    })
  );

  rm(course.image, () => {
    console.log("Course image deleted");
  });

  await Lecture.deleteMany({ course: req.params.id });
  await course.deleteOne();

  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({ message: "Course Deleted" });
});

// 📊 Admin stats (total users, lectures, and courses)
export const getAllStats = TryCatch(async (req, res) => {
  const totalCoures = await Courses.countDocuments();
  const totalLectures = await Lecture.countDocuments();
  const totalUsers = await User.countDocuments();

  res.json({
    stats: {
      totalCoures,
      totalLectures,
      totalUsers,
    },
  });
});

// 👥 Get all users except self (admin)
export const getAllUser = TryCatch(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
  res.json({ users });
});

// 🔄 Toggle user role (user <-> admin) — only for superadmin
export const updateRole = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin") {
    return res.status(403).json({
      message: "This endpoint is assign to superadmin",
    });
  }

  const user = await User.findById(req.params.id);

  if (user.role === "user") {
    user.role = "admin";
    await user.save();
    return res.status(200).json({ message: "Role updated to admin" });
  }

  if (user.role === "admin") {
    user.role = "user";
    await user.save();
    return res.status(200).json({ message: "Role updated" });
  }
});
