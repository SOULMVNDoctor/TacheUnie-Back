import { Router } from "express";
import mongoose from "mongoose";
import Task from "../models/Task";
import Group from "../models/Group";
import { auth } from "../middleware/auth";

const router = Router();

// helper : test valid objectId
const isValidId = (id: string) => mongoose.isValidObjectId(id);

/**
 * Return true if the provided date is NOT in the past (compares calendar day).
 * Example: if today is 2025-11-27, a deadline of 2025-11-26 => invalid.
 */
function isDateNotPast(value: Date | string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  // normalize to start of day
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

// create task (must be member of group)
router.post("/", auth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { title, description, deadline, groupId } = req.body;
    if (!title || !groupId) return res.status(400).json({ message: "title & groupId required" });
    if (!isValidId(groupId)) return res.status(400).json({ message: "Invalid groupId" });

    const group = await (Group as any).findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // membership check
    if (!group.members.map(String).includes(String(userId))) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // validate deadline if provided
    let parsedDeadline: Date | undefined = undefined;
    if (deadline) {
      if (!isDateNotPast(deadline)) return res.status(400).json({ message: "La deadline ne peut pas être dans le passé" });
      parsedDeadline = new Date(deadline);
    }

    const task = await (Task as any).create({
      title,
      description: description ?? "",
      deadline: parsedDeadline,
      groupId,
      createdBy: userId
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// list tasks (optionally filter by group)
router.get("/", auth, async (req: any, res) => {
  try {
    const { groupId } = req.query;
    const q: any = {};
    if (groupId && String(groupId) !== "undefined") q.groupId = groupId;
    const tasks = await (Task as any).find(q).sort({ createdAt: -1 }).lean();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// tasks by group
router.get("/group/:id", auth, async (req: any, res) => {
  try {
    const groupId = req.params.id;
    if (!isValidId(groupId)) return res.status(400).json({ message: "Invalid id" });

    // ensure requester is member
    const group = await (Group as any).findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.map(String).includes(String(req.user.id))) return res.status(403).json({ message: "Access denied" });

    const tasks = await (Task as any).find({ groupId }).sort({ createdAt: -1 }).lean();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// update task (creator or group owner)
router.put("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const task = await (Task as any).findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const group = await (Group as any).findById(task.groupId);
    const isOwner = group && String(group.owner) === String(req.user.id);
    const isCreator = String(task.createdBy) === String(req.user.id);

    if (!isOwner && !isCreator) return res.status(403).json({ message: "Access denied" });

    const { title, description, status, deadline } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;

    if (deadline !== undefined) {
      if (deadline === null || deadline === "") {
        task.deadline = undefined;
      } else {
        if (!isDateNotPast(deadline)) return res.status(400).json({ message: "La deadline ne peut pas être dans le passé" });
        task.deadline = new Date(deadline);
      }
    }

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// delete task (creator or group owner)
// delete task (robust)
router.delete("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const group = await Group.findById(task.groupId);
    if (!group) return res.status(404).json({ message: "Group for this task not found" });

    const isOwner = group && String(group.owner) === String(req.user.id);
    const isCreator = String(task.createdBy) === String(req.user.id);

    if (!isOwner && !isCreator) return res.status(403).json({ message: "Access denied" });

    // use findByIdAndDelete for clarity
    await Task.findByIdAndDelete(id);
    return res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("DELETE /tasks/:id error:", err);
    return res.status(500).json({ message: "Server error", error: (err as any).message || err });
  }
});


export default router;
