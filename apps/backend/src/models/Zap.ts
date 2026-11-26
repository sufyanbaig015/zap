import mongoose, { Schema, Document } from "mongoose";

export interface IZap extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  enabled: boolean;
  repoFullName: string;
  repoId: number;
  event: string;
  action: string;
  actionConfig: {
    commentBody?: string;
  };
  webhookId?: number;
  webhookStatus?: "active" | "local_only" | "error";
  webhookError?: string;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ZapSchema = new Schema<IZap>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    repoFullName: { type: String, required: true, trim: true },
    repoId: { type: Number, required: true },
    event: { type: String, required: true, default: "pull_request.opened" },
    action: { type: String, required: true, default: "comment_on_pr" },
    actionConfig: {
      commentBody: { type: String, default: "Thanks for opening this pull request!" },
    },
    webhookId: { type: Number },
    webhookStatus: { type: String, enum: ["active", "local_only", "error"], default: "active" },
    webhookError: { type: String },
    lastTriggeredAt: { type: Date },
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IZap>("Zap", ZapSchema);
