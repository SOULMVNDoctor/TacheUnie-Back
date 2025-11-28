import { Router } from "express";
import mongoose from "mongoose";
import Group from "../models/Group";
import Task from "../models/Task";
import { auth } from "../middleware/auth";

const router = Router();


const isValidId = (id: string) => mongoose.isValidObjectId(id);


router.post("/", auth, async (req: any, res) => {
  try {
    const ownerId = req.user.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const inviteCode = Math.random().toString(36).substring(2, 10);
    const group = await Group.create({
      name,
      owner: ownerId,
      members: [ownerId],
      inviteCode
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.get("/", auth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const groups = await (Group as any).find({ members: userId }).populate("owner", "fullname").lean();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.get("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
    const group = await (Group as any).findById(id).populate("members", "fullname").lean();
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = (group.members as any[]).map(m => String(m._id ?? m)).includes(String(req.user.id));
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.post("/join", auth, async (req: any, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code required" });

    const group = await (Group as any).findOne({ inviteCode: code });
    if (!group) return res.status(404).json({ message: "Invalid code" });

    if (!group.members.map(String).includes(String(req.user.id))) {
      group.members.push(req.user.id);
      await group.save();
    }
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.put("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const group = await (Group as any).findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (String(group.owner) !== String(req.user.id)) return res.status(403).json({ message: "Only owner can update" });

    if (name) group.name = name;
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.delete("/:id/members/:userId", auth, async (req: any, res) => {
  try {
    const { id, userId } = req.params;
    if (!isValidId(id) || !isValidId(userId)) return res.status(400).json({ message: "Invalid id" });

    const group = await (Group as any).findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (String(group.owner) !== String(req.user.id)) return res.status(403).json({ message: "Only owner can remove members" });

    if (String(userId) === String(group.owner)) return res.status(400).json({ message: "Cannot remove owner" });

    group.members = group.members.filter((m: any) => String(m) !== String(userId));
    await group.save();
    res.json({ message: "Member removed", group });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.delete("/:id/leave", auth, async (req: any, res) => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const group = await (Group as any).findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const userId = req.user.id;
    if (String(group.owner) === String(userId)) {
      return res.status(400).json({ message: "Owner cannot leave the group. Transfer ownership or delete the group." });
    }

    group.members = group.members.filter((m: any) => String(m) !== String(userId));
    await group.save();
    res.json({ message: "You left the group" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


router.delete("/:id", auth, async (req: any, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });

    const group = await Group.findById(id);
    if (!group)
      return res.status(404).json({ message: "Group not found" });

    if (String(group.owner) !== String(req.user.id))
      return res.status(403).json({ message: "Only owner can delete group" });

   
    await Task.deleteMany({ groupId: group._id });

   
    await Group.deleteOne({ _id: id });

    res.json({ message: "Group and its tasks deleted" });
  } catch (err: any) {
    console.error("DELETE GROUP ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


export default router;
