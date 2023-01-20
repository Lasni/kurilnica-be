const messageTypeDefs = `#graphql
  scalar Date
  
  type Message {
    id: String
    sender: User
    body: String
    createdAt: Date
  }

  type Query {
    messages(conversationId: String): [Message]
  }

  type Mutation {
    sendMessage(id: String, conversationId: String, senderId: String, body: String): SendMessageMutationResponse
  }

  type SendMessageMutationResponse {
    success: Boolean
    error: String
  }

  type Subscription {
    messageSent(conversationId: String): Message
  }
`;

export default messageTypeDefs;
