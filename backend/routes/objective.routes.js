import express from 'express';
import supabase from '../config/supabase.js';
const router = express.Router();
router.get('/', async (req, res) => { res.json({ message: 'objective routes' }); });
export default router;
