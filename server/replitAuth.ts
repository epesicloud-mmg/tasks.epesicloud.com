import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// REPLIT_DOMAINS is optional for development
const replitDomains = process.env.REPLIT_DOMAINS || 'localhost';

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    console.log('Upserting user with claims:', claims);
    
    const user = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    
    console.log('User upserted successfully:', user.email);
    
    // Ensure user has personal workspace and default project
    console.log('Setting up user workspace for:', user.id);
    await storage.ensureUserSetup(user.id);
    console.log('User workspace setup completed');
    
    // Check for pending invitations and auto-accept them
    if (user.email) {
      console.log('Checking pending invitations for:', user.email);
      const pendingInvitations = await storage.getPendingInvitations(user.email);
      console.log(`Found ${pendingInvitations.length} pending invitations`);
      
      for (const invitation of pendingInvitations) {
        try {
          await storage.acceptInvitation(invitation.id, user.id);
          console.log(`Auto-accepted invitation ${invitation.id} for user ${user.email}`);
        } catch (error) {
          console.error(`Failed to auto-accept invitation ${invitation.id}:`, error);
        }
      }
    }
    
    console.log('User setup completed successfully');
    return user;
  } catch (error) {
    console.error('Error in upsertUser:', error);
    console.error('Claims data:', claims);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log('Starting OAuth verification for user:', tokens.claims()?.email);
      const user = {};
      updateUserSession(user, tokens);
      
      console.log('Attempting to upsert user with claims:', tokens.claims());
      await upsertUser(tokens.claims());
      
      console.log('User verification completed successfully');
      verified(null, user);
    } catch (error) {
      console.error('OAuth verification failed:', error);
      console.error('Error stack:', error.stack);
      verified(error, null);
    }
  };

  for (const domain of replitDomains.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store invitation token in session if provided
    const invitationToken = req.query.invitation;
    if (invitationToken) {
      req.session.pendingInvitation = invitationToken;
    }
    
    // Use the first configured domain for authentication
    const domain = replitDomains.split(",")[0];
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    try {
      console.log('OAuth callback received, query params:', req.query);
      const domain = replitDomains.split(",")[0];
      console.log('Using domain for auth:', domain);
      
      passport.authenticate(`replitauth:${domain}`, {
        failureRedirect: "/api/login",
        failureFlash: false
      })(req, res, async (err: any) => {
        console.log('Passport authenticate callback triggered');
        console.log('Error:', err);
        console.log('User:', req.user ? 'User object exists' : 'No user');
        
        try {
          if (err) {
            console.error('Passport authentication error:', err);
            console.error('Error type:', typeof err);
            console.error('Error constructor:', err.constructor?.name);
            return res.status(500).json({ 
              error: 'Authentication failed', 
              details: err.message || String(err),
              type: err.constructor?.name,
              stack: err.stack 
            });
          }
          
          if (!req.user) {
            console.error('No user found after authentication - redirecting to login');
            return res.redirect("/api/login?error=no_user");
          }
          
          console.log('User authenticated successfully:', req.user.claims?.email || 'No email in claims');
          
          // Check for pending invitation after successful login
          const pendingInvitation = req.session.pendingInvitation;
          if (pendingInvitation && req.user?.claims?.sub) {
            try {
              console.log('Processing auto-accept for invitation:', pendingInvitation);
              
              // Get invitation by ID directly
              const invitation = await storage.getInvitationById(parseInt(pendingInvitation));
              
              if (invitation && invitation.email === req.user.claims.email && invitation.status === 'pending') {
                console.log('Auto-accepting invitation for workspace:', invitation.workspaceId);
                await storage.acceptInvitation(invitation.id, req.user.claims.sub);
                
                // Clear the pending invitation
                delete req.session.pendingInvitation;
                
                // Get workspace name for better UX
                const workspace = await storage.getWorkspaceById(invitation.workspaceId);
                console.log('Redirecting to workspace:', workspace?.name);
                
                // Redirect to the workspace with invitation success params
                return res.redirect(`/?workspace=${invitation.workspaceId}&invited=true&workspaceName=${encodeURIComponent(workspace?.name || 'workspace')}`);
              } else {
                console.log('Invitation not found or already processed:', invitation);
              }
            } catch (invitationError) {
              console.error('Auto-accept invitation failed:', invitationError);
              // Continue with normal login flow
            }
          }
          
          // Default redirect
          console.log('Redirecting to dashboard');
          res.redirect("/");
        } catch (callbackError) {
          console.error('Error in callback handler:', callbackError);
          console.error('Callback error stack:', callbackError.stack);
          return res.status(500).json({ 
            error: 'Callback processing failed', 
            details: callbackError.message,
            stack: callbackError.stack 
          });
        }
      });
    } catch (outerError) {
      console.error('Outer callback error:', outerError);
      console.error('Outer error stack:', outerError.stack);
      return res.status(500).json({ 
        error: 'Authentication system error', 
        details: outerError.message,
        stack: outerError.stack 
      });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
