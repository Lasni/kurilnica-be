import { GraphQLScalarType, Kind } from "graphql";

// Used for serializing the date so that it can be passed from GraphQL server to client over the network
const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value: any) {
    return value.getTime(); // Convert outgoing Date to integer for JSON
  },
  parseValue(value: any) {
    return new Date(value); // Convert incoming integer to Date
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10)); // Convert hard-coded AST string
    }
    return null; // Invalid hard-coded value (not an integer)
  },
});

const scalarResolvers = {
  Date: dateScalar,
};

export default scalarResolvers;
