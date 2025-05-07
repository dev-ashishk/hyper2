import { Context } from "../../src/core/context/context";
import { Router } from "../../src/core/router/router";
import { createServer } from "../../src/core/server/server";
import { jsonParser } from "../../src/middleware/parsers/json.parser";

// Simple in-memory database for users
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

class UserDatabase {
  private users: User[] = [];
  private idCounter: number = 1;

  constructor() {
    // Add some sample data
    this.create({ name: "John Doe", email: "john@example.com" });
    this.create({ name: "Jane Smith", email: "jane@example.com" });
  }

  findAll(): User[] {
    return [...this.users];
  }

  findById(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  create(userData: Omit<User, "id" | "createdAt">): User {
    const newUser: User = {
      id: this.idCounter++,
      name: userData.name,
      email: userData.email,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  update(
    id: number,
    userData: Partial<Omit<User, "id" | "createdAt">>
  ): User | undefined {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return undefined;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
    };

    return this.users[userIndex];
  }

  delete(id: number): boolean {
    const initialLength = this.users.length;
    this.users = this.users.filter((user) => user.id !== id);
    return this.users.length !== initialLength;
  }
}

// Initialize the user database
const userDb = new UserDatabase();

// Create a router
const router = new Router();

// Register JSON parser middleware
router.use(jsonParser);

// Define RESTful routes for users resource
router.get("/api/users", async (ctx: Context) => {
  const users = userDb.findAll();
  ctx.send({ users }, 200);
});

router.get("/api/users/:id", async (ctx: Context) => {
  const id = parseInt(ctx.params.id, 10);
  const user = userDb.findById(id);

  if (!user) {
    return ctx.send({ error: "User not found" }, 404);
  }

  ctx.send({ user }, 200);
});

router.post("/api/users", async (ctx: Context) => {
  // Validate input
  const { name, email } = ctx.req.body || {};

  if (!name || !email) {
    return ctx.send({ error: "Name and email are required" }, 400);
  }

  const newUser = userDb.create({ name, email });
  ctx.send({ user: newUser }, 201);
});

router.put("/api/users/:id", async (ctx: Context) => {
  const id = parseInt(ctx.params.id, 10);
  const { name, email } = ctx.req.body || {};

  // Check if user exists
  const existingUser = userDb.findById(id);
  if (!existingUser) {
    return ctx.send({ error: "User not found" }, 404);
  }

  // Update user
  const updatedUser = userDb.update(id, { name, email });
  ctx.send({ user: updatedUser }, 200);
});

router.delete("/api/users/:id", async (ctx: Context) => {
  const id = parseInt(ctx.params.id, 10);
  const deleted = userDb.delete(id);

  if (!deleted) {
    return ctx.send({ error: "User not found" }, 404);
  }

  ctx.send({ message: "User deleted successfully" }, 200);
});

// Create server with the router handler
const server = createServer(router.handler());

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`RESTful API server running at https://localhost:${PORT}`);
});
