import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

export interface ITask extends Document {
  title: string;
  description: string;
  assignedTo?: IUser["_id"];
}

const TaskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
});

export default mongoose.model<ITask>("Task", TaskSchema);
