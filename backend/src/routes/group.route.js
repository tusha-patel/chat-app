import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import { createGroup, getGroup } from '../controllers/group.controller.js';

const router = express.Router();

// Group route
router.post('/create', protectRoute, createGroup);
router.get("/fetch", protectRoute, getGroup)

export default router;