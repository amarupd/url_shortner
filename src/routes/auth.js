
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Joi from 'joi'

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string()
        .length(10)
        .pattern(/^[0-9]+$/)
        .required(),
      email: Joi.string().email({ minDomainSegments: 2 }).required(),
      password: Joi.string().required(),
      password_confirmation: Joi.any()
        .equal(Joi.ref("password"))
        .required()
        .messages({ "any.only": "{{#label}} does not match" }),
      name: Joi.string().required(),
    }).validate(req.body);

    if (schema.error) {
      return res.status(400).json({ error: schema.error });
    }

    const { email, password, phone, name } = schema.value;
    // if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });
    if (existing) return res.status(409).json({ error: 'Email or phone already in use' });
    const user = await User.create({ email, password, phone, name });
    return res.status(201).json({ id: user._id, email: user.email });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email({ minDomainSegments: 2 }).required(),
      password: Joi.string().required()
    }).validate(req.body);

    if (schema.error) {
      return res.status(400).json({ error: schema.error });
    }

    const { email, password } = schema.value;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token });
  } catch (e) { next(e); }
});

export default router;
