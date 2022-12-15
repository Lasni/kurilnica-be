import { GraphQLContextInterface } from "../../interfaces/graphqlInterfaces";

const conversationResolvers = {
  // Query: {},
  Mutation: {
    createConversation: async (
      parent: any,
      args: { participantIds: Array<string> },
      contextValue: GraphQLContextInterface,
      info: any
    ) => {
      console.log("createConversation resolver firing");
      const { participantIds } = args;
      const { prisma, session } = contextValue;
      console.log("participantIds:", participantIds);
    },
  },
  // Subscription: {}
};

export default conversationResolvers;
