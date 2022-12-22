const messageTypeDefs = `#graphql
  scalar Date
  
  type Message {
    id: String
    sender: User
    body: String
    createdAt: Date
  }
`;

export default messageTypeDefs;
