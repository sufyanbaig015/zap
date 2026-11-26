import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICopilotMessage {
  role: "user" | "model";
  text: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  createdAt: Date;
}

export interface ICopilotThread extends Document {
  userId: Types.ObjectId;
  zapId?: string;
  title: string;
  messages: ICopilotMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const CopilotMessageSchema = new Schema<ICopilotMessage>(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    text: { type: String, default: "" },
    toolCalls: { type: [Schema.Types.Mixed], default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CopilotThreadSchema = new Schema<ICopilotThread>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    zapId: { type: String, required: false },
    title: { type: String, default: "New Chat", trim: true },
    messages: { type: [CopilotMessageSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<ICopilotThread>("CopilotThread", CopilotThreadSchema);
