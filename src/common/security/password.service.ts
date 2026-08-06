import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    this.assertPolicy(password);

    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  assertPolicy(password: string): void {
    if (password.length < 12 || password.length > 128) {
      throw new BadRequestException(
        'Password must be between 12 and 128 characters long.',
      );
    }

    if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw new BadRequestException(
        'Password must include uppercase, lowercase, and numeric characters.',
      );
    }
  }
}
