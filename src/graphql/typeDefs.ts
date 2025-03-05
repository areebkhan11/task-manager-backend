import { gql } from 'apollo-server-express';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String!
    status: String!
    assignedTo: User
  }

  type Query {
    users: [User]
    tasks: [Task]
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, role: String!): User
    login(email: String!, password: String!): String
    createTask(title: String!, description: String!, assignedTo: ID): Task
    editTask(taskId: ID!, title: String, description: String): Task
    deleteTask(taskId: ID!): Task
  }

  type Subscription {
    taskUpdated: Task
  }
`;

export default typeDefs;
