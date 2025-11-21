export class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public age: number
  ) {
    if (!email.includes("@")) {
      throw new Error("Invalid email");
    }
    if (age < 0 || age > 150) {
      throw new Error("Invalid age");
    }
  }
}