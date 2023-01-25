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

export interface GraphQLContext {
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

export type ConversationsQueryResponse = Array<ConversationPopulated>;

// export interface ConversationsQueryResponse {
//   conversations: Array<ConversationPopulated>;
// }

export interface CreateConversationMutationArgs {
  participantIds: Array<string>;
}

export interface CreateConversationMutationResponse {
  success?: boolean;
  error?: string;
  conversationId?: string;
}

export interface MarkConversationAsReadMutationArgs {
  userId: string;
  conversationId: string;
}

export interface MarkConversationAsReadMutationResponse {
  success?: boolean;
  error?: string;
}

export interface DeleteConversationMutationArgs {
  conversationId: string;
}

export interface DeleteConversationMutationResponse {
  success?: boolean;
  error?: string;
}

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
  // {
  //   conversation: ConversationPopulated;
  // };
}

export interface ConversationUpdatedSubscriptionPayload {
  conversationUpdated: {
    conversation: ConversationPopulated;
  };
}

export interface ConversationDeletedSubscriptionPayload {
  conversationDeleted: ConversationPopulated;
}

/**
 * Messages
 */

export interface MessagesQueryArgs {
  conversationId: string;
}

export type MessagePopulated = Prisma.MessageGetPayload<{
  include: typeof messagePopulated;
}>;

export type MessagesQueryResponse = Array<MessagePopulated>;

export interface SendMessageMutationArgs {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}

export interface SendMessageMutationResponse {
  success?: boolean;
  error?: string;
}

export interface MessageSentSubscriptionPayload {
  messageSent: MessagePopulated;
}
export interface MessageSentSubscriptionVariables {
  conversationId: string;
}
