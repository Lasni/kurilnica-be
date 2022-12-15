const conversationTypeDefs = `#graphql
  type Mutation {
    createConversation(participantIds: [String]): CreateConversationResponse
  }

  type CreateConversationResponse {
    conversationId: String
  }
`;

export default conversationTypeDefs;
