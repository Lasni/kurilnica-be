import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import {
  GraphQLContextInterface,
  SendMessageArguments,
  SendMessageResponseInterface,
} from "../../interfaces/graphqlInterfaces";
const messageResolvers = {
  Query: {
    // messages
  },
  Mutation: {
    sendMessage: async function (
      parent: any,
      args: SendMessageArguments,
      context: GraphQLContextInterface,
      info: any
    ): Promise<SendMessageResponseInterface> {
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
                  id: senderId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              // for everybody else, set their hasSeenLatestMessage to false
              updateMany: {
                where: {
                  NOT: {
                    id: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
        });

        // emmit MESSAGE_SENT and CONVERSATION_UPDATED events and subscriptions, so that targets can receive them
        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage });
        pubsub.publish("CONVERSATION_UPDATED", {
          conversationUpdated: updatedConversation,
        });
        return {
          success: true,
          // error: null,
        };
      } catch (error) {
        console.log("sendMessage error: ", error);
        throw new GraphQLError("Error sending message");
      }
    },
  },
  Subscription: {},
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
