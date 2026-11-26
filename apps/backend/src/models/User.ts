import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  githubId: string;
  username: string;
  email: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    accessToken: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
