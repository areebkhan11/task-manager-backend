const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
import User, { IUser } from "../models/User";
import Task, { ITask } from "../models/Task";
import redisClient from "../config/redis";
import { PubSub } from "graphql-subscriptions";
import { GraphQLResolveInfo } from "graphql";
import mongoose from "mongoose";
import { AuthenticationError } from "apollo-server-express";

const pubsub = new PubSub();
// Define types for GraphQL arguments
interface RegisterArgs {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface LoginArgs {
  email: string;
  password: string;
}

interface CreateTaskArgs {
  title: string;
  description: string;
  assignedTo?: string;
}

const authenticate = (token: string | undefined) => {
  if (!token) throw new AuthenticationError("Authentication token is required");
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (err) {
    throw new AuthenticationError("Invalid or expired token");
  }
};

const resolvers = {
  Query: {
    users: async (): Promise<IUser[]> => await User.find(),
    tasks: async (_: unknown, __: unknown, context: any): Promise<ITask[]> => {
      const user = authenticate(context.token); // Verify token
      return await Task.find({ assignedTo: user.userId }).populate(
        "assignedTo"
      );
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { name, email, password, role }: RegisterArgs
    ): Promise<IUser> => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword, role });
      return await user.save();
    },

    login: async (
      _: unknown,
      { email, password }: LoginArgs
    ): Promise<string> => {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password)))
        throw new Error("Invalid credentials");

      return jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET as string
      );
    },

    createTask: async (
      _: unknown,
      { title, description, assignedTo }: CreateTaskArgs,
      context: any
    ): Promise<ITask> => {
      const user = authenticate(context.token);
      if (!user) throw new AuthenticationError("Authentication required");
      const task = new Task({ title, description, assignedTo: user.userId});
      await task.save();
    
      pubsub.publish("TASK_UPDATED", { taskUpdated: task });
      return task;
    },



    editTask: async (
      _: unknown,
      { taskId, title, description }: { taskId: string; title?: string; description?: string },
      context: any
    ): Promise<ITask> => {
      const user = authenticate(context.token);
      if (!user) throw new AuthenticationError("Authentication required");

      const task = await Task.findById(taskId);
      if (!task) throw new Error("Task not found");
      if (task.assignedTo.toString() !== user.userId) throw new AuthenticationError("Unauthorized");

      // Update only provided fields
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;

      await task.save();

      pubsub.publish("TASK_UPDATED", { taskUpdated: task });

      return task;
    },
    deleteTask: async (
      _: unknown,
      { taskId }: { taskId: string },
      context: any
    ): Promise<ITask> => {
      const user = authenticate(context.token);
      if (!user) throw new AuthenticationError("Authentication required");
    
      const task = await Task.findById(taskId);
      if (!task) throw new Error("Task not found");
    
      await Task.findByIdAndDelete(taskId);
    
      pubsub.publish("TASK_UPDATED", { taskUpdated: task });
    
      return task; // Ensure a valid Task object is returned
    },
  },
  
  
  

  Subscription: {
    taskUpdated: {
      subscribe: (): AsyncIterator<any> =>
        pubsub.asyncIterableIterator("TASK_UPDATED"),
    },
  },
};

export default resolvers;
