import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel';
import { UserRegistration, UserLogin, JWTPayload } from '../types';

const SALT_ROUNDS = 10;

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password }: UserRegistration = req.body;

      // Validation
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Username, email, and password are required',
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Username already exists',
        });
        return;
      }

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        res.status(409).json({
          success: false,
          error: 'Email already registered',
        });
        return;
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userId = await UserModel.create({
        username,
        email,
        password_hash,
        password,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId,
          username,
          email,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during registration',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password }: UserLogin = req.body;

      // Validation
      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
        return;
      }

      // Find user
      const user = await UserModel.findByUsername(username);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      // Generate JWT
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
      };

      const token = jwt.sign(payload, secret, { expiresIn: '24h' });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during login',
      });
    }
  }
}
