// v.4 doesn't depend on gql anymore
const userTypeDefs = `#graphql
  
  type Query {
    searchUsers(username: String): [User]
  }

  type User {
    id: String
    username: String
  }

  type Mutation {
    createUsername(username: String): CreateUsernameResponse
  }

  type CreateUsernameResponse {
    success: Boolean
    error: String
  }
`;

export default userTypeDefs;
