import { ISODateString, Session, User } from "next-auth";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  conversationPopulated,
  participantPopulated,
} from "../graphql/resolvers/conversation";
import { Context } from "graphql-ws";
import { PubSub } from "graphql-subscriptions";
import { messagePopulated } from "../graphql/resolvers/message";

/**
 * Server config
 */

export interface SubscriptionContextInterface extends Context {
  connectionParams: {
    session?: CustomSessionInterface;
  };
}

export interface GraphQLContextInterface {
  session: CustomSessionInterface | null; // next-auth session
  prisma: PrismaClient; // prisma client
  pubsub: PubSub; // pubsub module
}

export interface CustomSessionInterface {
  user: CustomUserInterface;
  expires: ISODateString;
}

/**
 * Users
 */

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
  include: typeof conversationPopulated;
}>;

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantPopulated;
}>;

/**
 * Messages
 */

export type MessagePopulated = Prisma.MessageGetPayload<{
  include: typeof messagePopulated;
}>;

export interface SendMessageArguments {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}

export interface SendMessageResponseInterface {
  success?: boolean;
  error?: string;
}
