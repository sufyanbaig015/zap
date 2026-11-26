import mongoose, { Schema, Document, Types } from "mongoose";

export interface IZapRunStep {
  stepIndex: number;
  type: "trigger" | "action";
  app: string;
  event: string;
  status: "success" | "failed" | "skipped";
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface IZapRun extends Document {
  zapId: Types.ObjectId;
  userId: Types.ObjectId;
  status: "success" | "failed" | "running";
  triggerSummary: {
    event: string;
    repository: string;
  };
  steps: IZapRunStep[];
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ZapRunStepSchema = new Schema<IZapRunStep>(
  {
    stepIndex: { type: Number, required: true },
    type: { type: String, enum: ["trigger", "action"], required: true },
    app: { type: String, default: "" },
    event: { type: String, default: "" },
    status: { type: String, enum: ["success", "failed", "skipped"], required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { _id: false },
);

const ZapRunSchema = new Schema<IZapRun>(
  {
    zapId: { type: Schema.Types.ObjectId, ref: "Zap", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["success", "failed", "running"], default: "running" },
    triggerSummary: {
      event: { type: String, default: "" },
      repository: { type: String, default: "" },
    },
    steps: { type: [ZapRunStepSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

export default mongoose.model<IZapRun>("ZapRun", ZapRunSchema);
