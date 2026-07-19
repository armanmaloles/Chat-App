import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  upsertUserHandler,
  getUsersHandler,
  setActiveHandler,
  deleteUserHandler,
  clearActiveHandler
} from "../controllers/usersController";

const router = express.Router();

router.use(requireAuth);

router.post("/users", createUserHandler);
router.post("/users/upsert", upsertUserHandler);
router.post("/users/active", setActiveHandler);
router.delete("/users/active", clearActiveHandler);
router.get("/users", getUsersHandler);
router.get("/users/:id", getUserHandler);
router.put("/users/:id", updateUserHandler);
router.delete("/users/:id", deleteUserHandler);

export default router;
