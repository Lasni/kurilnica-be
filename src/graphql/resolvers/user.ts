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
      const { id: userId } = session.user as User;

      try {
        // check that username is available
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUser) {
          return {
            error: "Username already taken. Try another",
          };
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: { username },
        });
        if (user) {
          return { success: true };
        }

        // update user
      } catch (error: any) {
        return {
          error: error?.message,
        };
      }
    },
  },
};

export default userResolvers;
