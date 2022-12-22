import { ISODateString, Session, User } from "next-auth";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  conversationValidated,
  participantValidated,
} from "../graphql/resolvers/conversation";

export interface GraphQLContextInterface {
  session: CustomSessionInterface | null; // next-auth session
  prisma: PrismaClient; // prisma client
  // pubsub: // pubsub module
}

/**
 * Users
 */
export interface CustomSessionInterface {
  user: CustomUserInterface;
  expires: ISODateString;
}

export interface CustomUserInterface {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  image: string;
  name: string;
}

export interface CreateUsernameResponseInterface {
  success?: boolean;
  error?: string;
}

export interface SearchUsersResponseInterface {
  searchUsers: Array<Pick<CustomUserInterface, "id" | "username">>;
}

/**
 * Conversations
 */

export type ConversationPopulated = Prisma.ConversationGetPayload<{
  include: typeof conversationValidated;
}>;

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantValidated;
}>;
