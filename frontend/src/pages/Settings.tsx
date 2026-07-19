import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  deleteUser as deleteUserApi,
  getUser as getUserApi,
  updateUser,
  heartbeatUser,
  clearHeartbeatUser,
} from "../api";

type Profile = {
  id: string;
  email?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  activeStatusEnabled?: boolean;
};

const Settings = () => {
  const navigate = useNavigate();
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStatusEnabled, setActiveStatusEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:activeStatusEnabled") !== "0";
    } catch {
      return true;
    }
  });
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const response = await getUserApi(user.id, token);
        setProfile(response.data);

        if (typeof response.data.activeStatusEnabled === "boolean") {
          setActiveStatusEnabled(response.data.activeStatusEnabled);
          try {
            localStorage.setItem(
              "chatApp:activeStatusEnabled",
              response.data.activeStatusEnabled ? "1" : "0",
            );
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      }
    };

    void loadProfile();
  }, [getToken, user?.id]);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    if (!window.confirm("Delete your account? This cannot be undone.")) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await deleteUserApi(user.id, token);
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

  const updateActiveStatusPreference = (enabled: boolean) => {
    try {
      localStorage.setItem("chatApp:activeStatusEnabled", enabled ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("activeStatusPreferenceChanged", {
          detail: { enabled },
        }),
      );
      setActiveStatusEnabled(enabled);
    } catch {
      /* ignore storage errors */
    }
  };

  const handleActiveStatusToggle = async () => {
    if (!user?.id) return;
    setError(null);
    setToggleLoading(true);

    try {
      const token = await getToken();
      if (activeStatusEnabled) {
        await clearHeartbeatUser(token);
        await updateUser(user.id, { activeStatusEnabled: false }, token);
        updateActiveStatusPreference(false);
      } else {
        await heartbeatUser(token);
        await updateUser(user.id, { activeStatusEnabled: true }, token);
        updateActiveStatusPreference(true);
      }
    } catch (err) {
      console.error("Active status toggle error:", err);
      setError("Unable to update your active status preference. Please try again.");
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <div className="page page--settings">
      <h1 style={{marginLeft: "12px"}}>Settings</h1>

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
        <div className="settings-toggle-row">
          <div>
            <div className="settings-toggle-label">Active status</div>
            <div className="settings-toggle-description">
              {activeStatusEnabled
                ? "You will appear online to others."
                : "You will appear offline to others."}
            </div>
          </div>
          <button
            type="button"
            className={`settings-toggle-button ${activeStatusEnabled ? "settings-toggle-button--on" : "settings-toggle-button--off"}`}
            onClick={handleActiveStatusToggle}
            disabled={toggleLoading}
          >
            <span className="settings-toggle-segment settings-toggle-segment--off">
              Off
            </span>
            <span className="settings-toggle-segment settings-toggle-segment--on">
              On
            </span>
          </button>
        </div>
        <div className="settings-danger-zone">
          <div className="settings-danger-zone__header">
            <div>
              <div className="settings-danger-zone__title">Danger zone</div>
              <div className="settings-danger-zone__description">
                Deleting your account will remove your data permanently. If you sign in again with the same Google account, your account will be restored.
              </div>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="settings-actions settings-actions--danger">
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
              className="button button--danger settings-button--secondary"
              onClick={handleLogout}
              disabled={loading}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
