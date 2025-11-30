import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);


export default User as mongoose.Model<any>;
