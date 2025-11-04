export class PasswordGenerator {
  private static readonly CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  private static readonly LENGTH = 8;
  private static readonly usedPasswords = new Set<string>();

  static generateUniquePassword(): string {
    let password: string;
    let attempts = 0;
    const maxAttempts = 1000;

    do {
      password = this.generateRandomPassword();
      attempts++;

      if (attempts > maxAttempts) {
        this.usedPasswords.clear();
        password = this.generateRandomPassword();
        break;
      }
    } while (this.usedPasswords.has(password));

    this.usedPasswords.add(password);
    return password;
  }

  private static generateRandomPassword(): string {
    let password = '';
    for (let i = 0; i < this.LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARS.length);
      password += this.CHARS[randomIndex];
    }
    return password;
  }

  static clearUsedPasswords(): void {
    this.usedPasswords.clear();
  }
}
