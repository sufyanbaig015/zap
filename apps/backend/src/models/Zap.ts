import mongoose, { Schema, Document, Types } from "mongoose";

export interface IZapTrigger {
  app: string;
  event: string;
  repository: string;
}

export interface IZapActionConfig {
  commentBody?: string;
  label?: string;
  issueTitle?: string;
  issueBody?: string;
}

export interface IZapAction {
  app: string;
  event: string;
  repository: string;
  config: IZapActionConfig;
}

export interface IZap extends Document {
  userId: Types.ObjectId;
  name: string;
  enabled: boolean;
  trigger: IZapTrigger;
  actions: IZapAction[];
  action?: IZapAction;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActionSchema = new Schema<IZapAction>(
  {
    app: { type: String, default: "" },
    event: { type: String, default: "" },
    repository: { type: String, default: "" },
    config: {
      commentBody: { type: String, default: "" },
      label: { type: String, default: "" },
      issueTitle: { type: String, default: "" },
      issueBody: { type: String, default: "" },
    },
  },
  { _id: false },
);

const ZapSchema = new Schema<IZap>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, default: "Untitled Zap" },
    enabled: { type: Boolean, default: false },
    trigger: {
      app: { type: String, default: "" },
      event: { type: String, default: "" },
      repository: { type: String, default: "" },
    },
    actions: {
      type: [ActionSchema],
      default: () => [{ app: "", event: "", repository: "", config: {} }],
    },
    action: { type: ActionSchema, required: false },
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IZap>("Zap", ZapSchema);
