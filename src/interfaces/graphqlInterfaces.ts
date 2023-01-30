import { Prisma, PrismaClient } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";
import { Context } from "graphql-ws";
import { ISODateString } from "next-auth";
import {
  conversationPopulated,
  participantPopulated,
} from "../graphql/resolvers/conversation";
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

//* USER
// searchUsers query
export interface SearchUsersQueryArgs {
  username: string;
}
export type SearchUsersQueryResponse = Array<SearchedUser>;
export type SearchedUser = Pick<CustomUserInterface, "id" | "username">;

// createUsername mutation
export interface CreateUsernameMutationArgs {
  username: string;
}
export interface CreateUsernameMutationResponse {
  success?: boolean;
  error?: string;
}

// custom user
export interface CustomUserInterface {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  image: string;
  name: string;
}

//* CONVERSATION

export type ConversationPopulated = Prisma.ConversationGetPayload<{
  include: typeof conversationPopulated;
}>;

export type ConversationParticipantPopulated =
  Prisma.ConversationParticipantGetPayload<{
    include: typeof participantPopulated;
  }>;

// conversations query
export type ConversationsQueryResponse = Array<ConversationPopulated>;

// createConversation mutation
export interface CreateConversationMutationArgs {
  participantIds: Array<string>;
}
export interface CreateConversationMutationResponse {
  success?: boolean;
  error?: string;
  conversationId?: string;
}

// markConversationAsRead mutation
export interface MarkConversationAsReadMutationArgs {
  userId: string;
  conversationId: string;
}
export interface MarkConversationAsReadMutationResponse {
  success?: boolean;
  error?: string;
}

// deleteConversation mutation
export interface DeleteConversationMutationArgs {
  conversationId: string;
}
export interface DeleteConversationMutationResponse {
  success?: boolean;
  error?: string;
}

// leaveConversation mutation
export interface LeaveConversationMutationArgs {
  conversationId: string;
  conversationParticipantsIds: Array<string>;
}
export interface LeaveConversationMutationResponse {
  success?: boolean;
  error?: string;
}

// conversationCreated subscription
export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}

// conversationUpdated subscription
export interface ConversationUpdatedSubscriptionPayload {
  conversationUpdated: {
    conversation: ConversationPopulated;
    removedUserIds: Array<string>;
  };
}

// conversationDeleted subscription
export interface ConversationDeletedSubscriptionPayload {
  conversationDeleted: ConversationPopulated;
}

//* MESSAGE

// message populated
export type MessagePopulated = Prisma.MessageGetPayload<{
  include: typeof messagePopulated;
}>;

// messages query
export interface MessagesQueryArgs {
  conversationId: string;
}
export type MessagesQueryResponse = Array<MessagePopulated>;

// sendMessage mutation
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

// messageSent subscription
export interface MessageSentSubscriptionPayload {
  messageSent: MessagePopulated;
}
export interface MessageSentSubscriptionVariables {
  conversationId: string;
}
