import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  upsertUserHandler,
} from "../controllers/usersController";

const router = express.Router();

router.use(requireAuth);

router.post("/users", createUserHandler);
router.post("/users/upsert", upsertUserHandler);
router.get("/users/:id", getUserHandler);
router.put("/users/:id", updateUserHandler);

export default router;
