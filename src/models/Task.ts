import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, default: "pending" }, // pending, in progress, done
  deadline: { type: Date },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task as mongoose.Model<any>;
