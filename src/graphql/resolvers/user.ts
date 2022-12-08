const userResolvers = {
  Query: {
    searchUsers: () => {},
  },
  Mutation: {
    createUsername: () => {
      console.log("created a new user");
    },
  },
  // Subscription: {},
};

export default userResolvers;
