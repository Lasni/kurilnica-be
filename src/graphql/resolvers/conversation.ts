import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ConversationEnum } from "../../enums/graphqlEnums";
import {
  ConversationCreatedSubscriptionPayload,
  ConversationDeletedSubscriptionPayload,
  ConversationsQueryResponse,
  ConversationUpdatedSubscriptionPayload,
  CreateConversationMutationArgs,
  CreateConversationMutationResponse,
  DeleteConversationMutationArgs,
  DeleteConversationMutationResponse,
  GraphQLContext,
  LeaveConversationMutationArgs,
  LeaveConversationMutationResponse,
  MarkConversationAsReadMutationArgs,
  MarkConversationAsReadMutationResponse,
} from "../../interfaces/graphqlInterfaces";
import { userIsConversationParticipant } from "../../util/helpers.js";

const conversationResolvers = {
  Query: {
    conversations: async (
      _: any,
      __: any,
      context: GraphQLContext
    ): Promise<ConversationsQueryResponse> => {
      const { session, prisma } = context;
      if (!session?.user) {
        throw new GraphQLError(`Not authorized`);
      }
      const {
        user: { id: userId },
      } = session;

      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: userId,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        return conversations;
      } catch (error: any) {
        throw new GraphQLError(`Error: ${error?.message}`);
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: CreateConversationMutationArgs,
      context: GraphQLContext
    ): Promise<CreateConversationMutationResponse> => {
      const { participantIds } = args;
      const { prisma, session, pubsub } = context;
      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const { id: userId } = session.user;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds?.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId, // makes sense that the creator of conversation has seen the message
                })),
              },
            },
          },
          include: conversationPopulated, // stuff that we want returned on our conversation object
        });

        // emmit CONVERSATION_CREATED event using pubsub
        pubsub.publish(ConversationEnum.CONVERSATION_CREATED, {
          conversationCreated: conversation,
        });

        return {
          success: true,
          error: "",
          conversationId: conversation.id,
        };
      } catch (error) {
        throw new GraphQLError(`Error creating conversation: ${error}`);
      }
    },

    markConversationAsRead: async (
      _: any,
      args: MarkConversationAsReadMutationArgs,
      context: GraphQLContext
    ): Promise<MarkConversationAsReadMutationResponse> => {
      const { session, prisma } = context;
      const { userId, conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized.");
      }

      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });
        if (!participant) {
          throw new GraphQLError("Participant entity not found");
        }

        await prisma.conversationParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });
        return {
          success: true,
          error: "",
        };
      } catch (error: any) {
        console.error("markConversationAsReadError: ", error);
        throw new GraphQLError(error?.message);
      }
    },
    deleteConversation: async function (
      _: any,
      args: DeleteConversationMutationArgs,
      context: GraphQLContext
    ): Promise<DeleteConversationMutationResponse> {
      const { session, prisma, pubsub } = context;
      const { conversationId } = args;

      if (!session.user) {
        throw new GraphQLError("Not authorized");
      }

      try {
        // delete conversation entity and all related entities (participants, messages)
        const [deletedConversation] = await prisma.$transaction([
          // delete conversation
          prisma.conversation.delete({
            where: {
              id: conversationId,
            },
            include: conversationPopulated,
          }),
          // delete conversation participants
          prisma.conversationParticipant.deleteMany({
            where: {
              conversationId: conversationId,
            },
          }),
          // delete conversation messages
          prisma.message.deleteMany({
            where: {
              conversationId: conversationId,
            },
          }),
        ]);

        pubsub.publish("CONVERSATION_DELETED", {
          conversationDeleted: deletedConversation,
        });
        return {
          success: true,
          error: "",
        };
      } catch (error: any) {
        console.error("deleteConversation error: ", error);
        throw new GraphQLError("Failed to delete conversation");
      }
    },

    leaveConversation: async function (
      _: any,
      args: LeaveConversationMutationArgs,
      context: GraphQLContext
    ): Promise<LeaveConversationMutationResponse> {
      // Destructure context and args
      const { prisma, pubsub, session } = context;
      const { conversationId, conversationParticipantsIds } = args;

      // Check that the user exists on session (auhorized)
      if (!session.user) {
        throw new GraphQLError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        // find the conversationParticipantToDelete where it matches both conversationId and userId
        const conversationParticipantToDelete =
          await prisma.conversationParticipant.findFirst({
            where: {
              conversationId: conversationId,
              userId: userId,
            },
          });

        if (!conversationParticipantToDelete) {
          throw new GraphQLError("conversationParticipantToDelete not found");
        }

        const [conversationLeft] = await prisma.$transaction([
          prisma.conversation.update({
            where: {
              id: conversationId,
            },
            data: {
              participants: {
                deleteMany: {
                  userId: {
                    equals: conversationParticipantToDelete.userId,
                  },
                  conversationId,
                },
              },
            },
            include: conversationPopulated,
          }),
        ]);

        // publish the conversation update
        pubsub.publish(ConversationEnum.CONVERSATION_UPDATED, {
          conversationUpdated: {
            conversation: conversationLeft,
            removedUserIds: [conversationParticipantToDelete.userId],
          },
        });
        return {
          success: true,
          error: "",
        };
      } catch (error: any) {
        console.error("leaveConversation resolver error: ", error);
        throw new GraphQLError(error.message);
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator([ConversationEnum.CONVERSATION_CREATED]);
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          const {
            conversationCreated: { participants },
          } = payload;

          return userIsConversationParticipant(participants, session.user.id);
        }
      ),
    },

    conversationUpdated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          // receive (listen to) the conversation update
          return pubsub.asyncIterator([ConversationEnum.CONVERSATION_UPDATED]);
        },
        (
          payload: ConversationUpdatedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }

          const {
            user: { id: userId },
          } = session;

          const {
            conversationUpdated: {
              conversation: { participants },
              removedUserIds,
            },
          } = payload;

          const userIsParticipant = userIsConversationParticipant(
            participants,
            userId
          );

          // const userSentLatestMessage =
          //   payload.conversationUpdated.conversation.latestMessage?.senderId ===
          //   userId;

          const userIsbeingRemoved =
            typeof removedUserIds !== "undefined" &&
            removedUserIds.length > 0 &&
            Boolean(removedUserIds?.find((id) => id === userId));

          return (
            userIsParticipant ||
            // userSentLatestMessage ||
            userIsbeingRemoved
          );
        }
      ),
    },

    conversationDeleted: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_DELETED"]);
        },

        (
          payload: ConversationDeletedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session.user) {
            throw new GraphQLError("Not authorized");
          }

          const { id: userId } = session.user;
          const {
            conversationDeleted: { participants },
          } = payload;

          return userIsConversationParticipant(participants, userId);
        }
      ),
    },
  },
};

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const senderPopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: senderPopulated,
    },
  });

export default conversationResolvers;
