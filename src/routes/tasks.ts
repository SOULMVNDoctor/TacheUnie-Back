import { Router } from "express";
import mongoose from "mongoose";
import Task from "../models/Task";
import Group from "../models/Group";
import { auth } from "../middleware/auth";

const router = Router();
const isValidId = (id: string) => mongoose.isValidObjectId(id);


function isDateNotPast(value: Date | string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}


function computeStatus(task: any) {
  const now = new Date();
  const today = new Date();
  today.setHours(0,0,0,0);

  const start = task.startDate ? new Date(task.startDate) : null;
  const end = task.endDate ? new Date(task.endDate) : null;

  if (start) start.setHours(0,0,0,0);
  if (end) end.setHours(0,0,0,0);


  if (!start && !end) return task.status || "pending";


  if (start && start > today) return "pending";


  if (start && end) {
    if (today < start) return "pending";
    if (today >= start && today < end) return "in_progress";
    return "done";
  }


  if (start && !end) {
    if (today < start) return "pending";
    return "in_progress";
  }


  if (!start && end) {
    if (today < end) return "in_progress";
    return "done";
  }

  return task.status || "pending";
}


router.post("/", auth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { title, description, startDate, endDate, groupId } = req.body;

    if (!title)
      return res.status(400).json({ message: "title required" });

    if (groupId) {
      if (!isValidId(groupId))
        return res.status(400).json({ message: "Invalid groupId" });

      const group = await Group.findById(groupId);
      if (!group)
        return res.status(404).json({ message: "Group not found" });

      if (!group.members.map(String).includes(String(userId)))
        return res.status(403).json({ message: "You are not a member of this group" });
    }


    let sDate: Date | undefined = undefined;
    let eDate: Date | undefined = undefined;

    if (startDate) {
      if (!isDateNotPast(startDate))
        return res.status(400).json({ message: "startDate cannot be in the past" });
      sDate = new Date(startDate);
    }

    if (endDate) {
      eDate = new Date(endDate);
      if (sDate && eDate < sDate)
        return res.status(400).json({ message: "endDate cannot be before startDate" });
    }

    const task = await Task.create({
      title,
      description,
      startDate: sDate,
      endDate: eDate,
      groupId: groupId || null,
      createdBy: userId,
    });

    const computed = computeStatus(task);
    res.status(201).json({ ...task.toObject(), computedStatus: computed });

  } catch (err) {
    console.error("CREATE TASK ERROR:", err);
    res.status(500).json({ message: "Server error", err });
  }
});


router.get("/", auth, async (req: any, res) => {
  try {
    const userId = req.user.id;


    const groups = await Group.find({ members: userId }, "_id");

    const groupIds = groups.map((g) => g._id);

    const tasks = await Task.find({
      $or: [
        { createdBy: userId },          
        { groupId: { $in: groupIds } },
      ]
    })
      .populate("createdBy", "fullname")
      .lean();

    const final = tasks.map((t) => ({
      ...t,
      computedStatus: computeStatus(t),
    }));

    res.json(final);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.put("/:id", auth, async (req: any, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    if (!isValidId(taskId))
      return res.status(400).json({ message: "Invalid id" });

    const task: any = await Task.findById(taskId);
    if (!task)
      return res.status(404).json({ message: "Task not found" });


    if (!task.groupId && String(task.createdBy) !== String(userId))
      return res.status(403).json({ message: "Forbidden" });


    if (task.groupId) {
      const group = await Group.findById(task.groupId);
      if (!group)
        return res.status(404).json({ message: "Group not found" });

      if (!group.members.map(String).includes(String(userId)))
        return res.status(403).json({ message: "Not allowed" });
    }

    const { title, description, startDate, endDate, status } = req.body;

    if (title) task.title = title;
    if (description) task.description = description;

    if (startDate) {
      if (!isDateNotPast(startDate))
        return res.status(400).json({ message: "startDate cannot be in the past" });
      task.startDate = new Date(startDate);
    }

    if (endDate) {
      const eDate = new Date(endDate);
      if (task.startDate && eDate < task.startDate)
        return res.status(400).json({ message: "endDate cannot be before startDate" });
      task.endDate = eDate;
    }

    if (status) task.status = status;

    await task.save();
    const computed = computeStatus(task);
    res.json({ ...task.toObject(), computedStatus: computed });

  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.delete("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    if (!isValidId(id))
      return res.status(400).json({ message: "Invalid id" });

    const task: any = await Task.findById(id);
    if (!task)
      return res.status(404).json({ message: "Task not found" });


    if (!task.groupId && String(task.createdBy) !== String(userId))
      return res.status(403).json({ message: "Forbidden" });


    if (task.groupId) {
      const group = await Group.findById(task.groupId);
      if (!group)
        return res.status(404).json({ message: "Group not found" });

      if (!group.members.map(String).includes(String(userId)))
        return res.status(403).json({ message: "Not allowed" });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

export default router;
