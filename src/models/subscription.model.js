import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    channel: {
      // One to ehom sunscribers is subscribing
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subscriber: {
      // User who is subscribing
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true, versionKey: false }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
