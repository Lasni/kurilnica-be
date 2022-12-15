import merge from "lodash.merge";
import userResolvers from "./user.js";
import conversationResolvers from "./conversation.js";

const resolvers = merge({}, userResolvers, conversationResolvers);

export default resolvers;
