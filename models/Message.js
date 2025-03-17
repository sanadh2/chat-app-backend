const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.pre("validate", function (next) {
  const hasReceiver = !!this.receiver;
  const hasGroup = !!this.group;

  if (hasReceiver === hasGroup) {
    const error = new Error(
      "Either 'receiver' or 'group' must be provided, but not both."
    );
    next(error);
  } else {
    next();
  }
});

module.exports = model("Message", messageSchema);
