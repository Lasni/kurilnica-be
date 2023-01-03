import merge from "lodash.merge";
import userResolvers from "./user.js";
import conversationResolvers from "./conversation.js";
import messageResolvers from "./message.js";

const resolvers = merge(
  {},
  userResolvers,
  conversationResolvers,
  messageResolvers
);

export default resolvers;
