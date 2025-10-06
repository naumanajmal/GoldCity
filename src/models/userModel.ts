import db from '../config/database';
import { User, UserRegistration } from '../types';

export class UserModel {
  static async create(userData: UserRegistration & { password_hash: string }): Promise<number> {
    const [id] = await db('users').insert({
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
    });
    return id;
  }

  static async findByUsername(username: string): Promise<User | undefined> {
    return db('users').where({ username }).first();
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  }

  static async findById(id: number): Promise<User | undefined> {
    return db('users').where({ id }).first();
  }
}
