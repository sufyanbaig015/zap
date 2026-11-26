declare global {
  namespace Express {
    interface User {
      id: string;
      githubId: string;
      username: string;
      email: string;
      avatar?: string;
      accessToken?: string;
      refreshToken?: string;
    }
  }
}

export {};
