import { ISODateString, Session } from "next-auth";
import { PrismaClient } from "@prisma/client";

export interface GraphQLContextInterface {
  session: Session | null; // next-auth session
  prisma: PrismaClient; // prisma client
  // pubsub: // pubsub module
}

/**
 * Users
 */
// export interface SessionInterface {
//   user: UserInterface;
//   expires: ISODateString;
// }

// export interface UserInterface {
//   id: string;
//   username: string;
//   email: string;
//   emailVerified: boolean;
//   image: string;
//   name: string;
// }

export interface CreateUsernameResponseInterface {
  success?: boolean;
  error?: string;
}
