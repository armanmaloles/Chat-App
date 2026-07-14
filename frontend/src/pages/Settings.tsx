import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { deleteUser as deleteUserApi, getUser as getUserApi } from "../api";

type Profile = {
  id: string;
  email?: string | null;
  name?: string | null;
  imageUrl?: string | null;
};

const Settings = () => {
  const navigate = useNavigate();
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const response = await getUserApi(user.id, token);
        setProfile(response.data);
      } catch (err) {
        console.error("Fetch profile error:", err);
      }
    };

    loadProfile();
  }, [getToken, user?.id]);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    if (!window.confirm("Delete your account? This cannot be undone.")) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await deleteUserApi(user.id, token);
      setSuccess("Your account has been deleted. Redirecting to sign in...");
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Delete account error:", err);
      setError("Unable to delete your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to sign out. Please try again.");
    }
  };

  return (
    <div className="page page--settings">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Account</h2>
        <div className="profile-card">
          <div className="profile-avatar">
            {profile?.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.name || "User avatar"} />
            ) : (
              <div className="profile-placeholder">{profile?.name?.[0] || "U"}</div>
            )}
          </div>
          <div className="profile-details">
            <div className="profile-detail-row">
              <span className="profile-detail-label">Name</span>
              <span>{profile?.name || "Unknown"}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Email</span>
              <span>{profile?.email || "Unknown"}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">User ID</span>
              <span>{profile?.id || "Unknown"}</span>
            </div>
          </div>
        </div>
        <p>
          Deleting your account will remove your user data from the chat app. This action is
          permanent.
        </p>
        <p className="settings-note">
          If you sign in again with the same Google account, your account will be restored.
        </p>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <div className="settings-actions">
          <button
            type="button"
            className="button button--danger"
            onClick={handleDeleteAccount}
            disabled={loading || !user?.id}
          >
            {loading ? "Deleting account..." : "Delete my account"}
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={handleLogout}
            disabled={loading}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
