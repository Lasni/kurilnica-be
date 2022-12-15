import { User } from "next-auth";
import { CustomUserInterface } from "../../interfaces/graphqlInterfaces";
import { SearchedUser } from "../../../../frontend/src/interfaces/graphqlInterfaces";
import {
  CreateUsernameResponseInterface,
  GraphQLContextInterface,
  SearchUsersResponseInterface,
} from "../../interfaces/graphqlInterfaces";

const userResolvers = {
  Query: {
    searchUsers: async (
      parent: any,
      args: { username: string },
      contextValue: GraphQLContextInterface,
      info: any
    ): Promise<Array<User>> => {
      console.log("inside search users");
      const { username: searchedUsername } = args;
      const { prisma, session } = contextValue;

      if (!session?.user) {
        throw new Error("Not authorized");
        //apolloerror?
      }

      const { username: signedInUsername } = session.user;

      try {
        const users = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              not: signedInUsername,
              mode: "insensitive",
            },
          },
        });
        console.log("users: ", users);
        return users;
      } catch (error: any) {
        throw new Error(error?.message);
      }
    },
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
