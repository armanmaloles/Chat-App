import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { upsertUser } from "../api";
import "../styles/landing.css";

function Landing() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate("/app/conversations");
    }
  }, [isSignedIn, navigate]);

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user?.id) return;

      try {
        const token = await getToken();
        await upsertUser(
          {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            name: user.fullName ?? user.username ?? "User",
            imageUrl: user.imageUrl,
          },
          token,
        );
      } catch (error) {
        console.error("Failed to sync user", error);
      }
    };

    void syncUser();
  }, [getToken, isSignedIn, user?.id, user?.fullName, user?.username, user?.imageUrl, user?.primaryEmailAddress?.emailAddress]);

  return (
    <div className="landing-container">
      <nav className="navbar">
        <h2 className="logo">💬 Chat App</h2>
        <div className="navbar-actions">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-outline">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary">Sign Up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to Chat App</h1>
          <p>Connect with friends, teams, and groups in one place.</p>

          <SignedOut>
            <SignUpButton mode="modal">
              <button className="btn-hero">Get Started</button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <button className="btn-hero" onClick={() => navigate("/app/conversations")}>Go to Conversations</button>
          </SignedIn>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>🗂️ Conversations</h3>
          <p>View your message threads and join conversations instantly.</p>
        </div>
        <div className="feature-card">
          <h3>👥 Group Chat</h3>
          <p>Create rooms for teams, friends, and communities.</p>
        </div>
        <div className="feature-card">
          <h3>🔒 Secure</h3>
          <p>Protected login flow with Clerk authentication.</p>
        </div>
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} Chat App. All rights reserved.
      </footer>
    </div>
  );
}

export default Landing;

