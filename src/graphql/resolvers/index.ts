import merge from "lodash.merge";
import userResolvers from "./user.js";

const resolvers = merge({}, userResolvers);

export default resolvers;
