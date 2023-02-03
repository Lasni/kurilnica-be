import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ConversationEnum, MessageEnum } from "../../enums/graphqlEnums";
import {
  GraphQLContext,
  MessageSentSubscriptionPayload,
  MessageSentSubscriptionVariables,
  MessagesQueryArgs,
  MessagesQueryResponse,
  SendMessageMutationArgs,
  SendMessageMutationResponse,
} from "../../interfaces/graphqlInterfaces";
import { userIsConversationParticipant } from "../../util/helpers.js";
import { conversationPopulated } from "./conversation.js";

const messageResolvers = {
  /**
   * Queries
   */
  Query: {
    messages: async function (
      _: any,
      args: MessagesQueryArgs,
      context: GraphQLContext
    ): Promise<MessagesQueryResponse> {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const {
        user: { id: userId },
      } = session;

      // verify that a conversation exists and that user is a conversation participant
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });
      if (!conversation) {
        throw new GraphQLError("Conversation not found");
      }

      const allowedToView = userIsConversationParticipant(
        conversation.participants,
        userId
      );

      if (!allowedToView) {
        throw new GraphQLError("Not authorized");
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });
        return messages;
      } catch (error) {
        console.error("messages error: ", error);
        throw new GraphQLError("Error retrieving messages");
      }
    },
  },

  /**
   * Mutations
   */
  Mutation: {
    sendMessage: async function (
      _: any,
      args: SendMessageMutationArgs,
      context: GraphQLContext
    ): Promise<SendMessageMutationResponse> {
      const { session, prisma, pubsub } = context;

      if (!session.user) {
        throw new GraphQLError("Not authorized");
      }

      const { id: userId } = session.user;
      const { id: messageId, senderId, conversationId, body } = args;

      if (senderId !== userId) {
        throw new GraphQLError("Not authorized");
      }

      try {
        // create a new message entity
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        // find conversation participant entity
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        // should always exist
        if (!participant) {
          throw new GraphQLError("Participant does not exist");
        }

        const { id: participantId } = participant;

        // update conversation entity
        const updatedConversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id, // latestMessageId is now newMessage's id
            participants: {
              // for the sender, set hasSeenLatestMessage to true
              update: {
                where: {
                  id: participantId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              // for everybody else, set their hasSeenLatestMessage to false
              updateMany: {
                where: {
                  NOT: {
                    userId,
                    // userId: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        // emmit MESSAGE_SENT and CONVERSATION_UPDATED events and subscriptions, so that targets can receive them
        pubsub.publish(MessageEnum.MESSAGE_SENT, { messageSent: newMessage });
        pubsub.publish(ConversationEnum.CONVERSATION_UPDATED, {
          conversationUpdated: {
            conversation: updatedConversation,
            removedUserIds: [],
            // addedUserIds: []
          },
        });
        return {
          success: true,
          error: "",
        };
      } catch (error) {
        console.error("sendMessage error: ", error);
        throw new GraphQLError("Error sending message");
      }
    },
  },

  /**
   * Subscriptions
   */
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator([MessageEnum.MESSAGE_SENT]);
        },
        (
          payload: MessageSentSubscriptionPayload,
          variables: MessageSentSubscriptionVariables,
          context: GraphQLContext
        ) => {
          return (
            payload.messageSent.conversationId === variables.conversationId
          );
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export default messageResolvers;
