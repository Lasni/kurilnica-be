import merge from "lodash.merge";
import userResolvers from "./user.js";
import conversationResolvers from "./conversation.js";
import messageResolvers from "./message.js";
import scalarResolvers from "./scalars.js";

const resolvers = merge(
  {},
  userResolvers,
  conversationResolvers,
  messageResolvers,
  scalarResolvers
);

export default resolvers;
