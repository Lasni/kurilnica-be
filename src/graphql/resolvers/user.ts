import { User } from "next-auth";
import {
  CreateUsernameResponseInterface,
  GraphQLContextInterface,
} from "../../interfaces/graphqlInterfaces";

const userResolvers = {
  Query: {
    searchUsers: () => {},
  },
  Mutation: {
    createUsername: async (
      parent: any,
      args: { username: string },
      contextValue: GraphQLContextInterface,
      info: any
    ): Promise<CreateUsernameResponseInterface> => {
      const { username } = args;
      const { prisma, session } = contextValue;

      if (!session?.user) {
        return {
          error: "Not authorized",
        };
      }
      const { id: userId } = session.user;

      try {
        // check that username is available
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUser) {
          console.log("username already exists");
          return {
            error: "Username already taken. Try another",
          };
        }
        // await prisma.user.update({ data: { username }, where: { id: userId } });
        const user = await prisma.user.update({
          where: { id: userId },
          data: { username },
        });
        if (user) {
          console.log("user", JSON.stringify(user));
          return { success: true };
        }

        // update user
      } catch (error: any) {
        console.log("createUsername error: ", error);
        return {
          error: error?.message,
        };
      }
    },
  },
  // Subscription: {},
};

export default userResolvers;
