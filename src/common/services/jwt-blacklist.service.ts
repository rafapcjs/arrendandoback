import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtBlacklistService {
  private blacklistedTokens = new Set<string>();

  addToBlacklist(tokenId: string): void {
    this.blacklistedTokens.add(tokenId);
  }

  isBlacklisted(tokenId: string): boolean {
    return this.blacklistedTokens.has(tokenId);
  }

  removeFromBlacklist(tokenId: string): void {
    this.blacklistedTokens.delete(tokenId);
  }

  clearExpiredTokens(): void {
    // En un sistema real, esto debería implementarse con una base de datos
    // y un job que limpie tokens expirados periódicamente
  }

  getBlacklistSize(): number {
    return this.blacklistedTokens.size;
  }
}
