import express from "express";
import { ENV } from "./config/env";
import { clerkMiddleware, UnauthorizedError } from "@clerk/express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import usersRoutes from "./routes/usersRoutes";
import conversationsRoutes from "./routes/conversationsRoutes";
import conversationMembersRoutes from "./routes/conversationMembersRoutes";
import messagesRoutes from "./routes/messagesRoutes";
import typingRoutes from "./routes/typingRoutes";

const app = express();
app.use(cors({ origin: ENV.FRONTEND_URL }));
app.use(clerkMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRoutes);
app.use("/api", usersRoutes);
app.use("/api", conversationsRoutes);
app.use("/api", conversationMembersRoutes);
app.use("/api", messagesRoutes);
app.use("/api", typingRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Backend is working",
    port: ENV.PORT,
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next(err);
  },
);

app.listen(ENV.PORT, () =>
  console.log(`Server is up and running on PORT: ${ENV.PORT}`),
);
