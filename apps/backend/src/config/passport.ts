import passport from "passport";
import { Strategy as GitHubStrategy, Profile } from "passport-github2";
import User from "../models/User";

export const configurePassport = (): void => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:4000"}/auth/github/callback`,
        scope: ["user:email", "repo"],
      },
      async (accessToken: string, refreshToken: string | undefined, profile: Profile, done: (error: Error | null, user?: Express.User | null) => void) => {
        try {
          const email = profile.emails?.[0]?.value || "";
          let user = await User.findOne({ githubId: profile.id });

          if (!user) {
            user = await User.create({
              githubId: profile.id,
              username: profile.username || "",
              email,
              avatar: profile.photos?.[0]?.value,
            });
          }

          // Store the GitHub access token (and refresh token if provided) for API calls
          user.accessToken = accessToken;
          if (profile.photos?.[0]?.value) {
            user.avatar = profile.photos[0].value;
          }
          if (refreshToken) {
            user.refreshToken = refreshToken;
          }
          await user.save();

          return done(null, {
            id: user.id,
            githubId: user.githubId,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
          });
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );

  passport.serializeUser((user: Express.User, done: (error: Error | null, id?: string) => void) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: (error: Error | null, user?: Express.User | null) => void) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(null, null);
      }
      done(null, {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
      });
    } catch (err) {
      done(err as Error);
    }
  });
};
