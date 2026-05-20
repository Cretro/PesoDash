import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../context/FriendContext";
import Avatar from "../components/Avatar";

/**
 * Profile Page Component
 * 
 * Purpose: Allows users to manage settings (like daily budget) and interact with other users.
 * Key Sections:
 *  - **Stats Summary**: Real-time display of total points, streak count, and daily limits.
 *  - **Budget Updates**: Live write-back to `/users/{uid}` in Firestore.
 *  - **Social Panel**: Integrates with `FriendContext` to trigger emails lookups and accept/decline invites.
 */
export default function Profile() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { accepted, incoming, pending, sendFriendRequest, acceptRequest, declineRequest } = useFriends();
  const navigate = useNavigate();

  // Local configurations
  const [budget, setBudget] = useState(userProfile?.dailyBudget || 300);
  const [gender, setGender] = useState(userProfile?.gender || "prefer_not_to_say");
  const [budgetError, setBudgetError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendMsg, setFriendMsg] = useState({ text: "", type: "" });
  const [sending, setSending] = useState(false);



  // Save the custom daily budget and gender settings back to Firestore
  async function saveSettings() {
    setBudgetError("");
    if (!budget || isNaN(budget) || Number(budget) < 1) {
      setBudgetError("Daily budget must be at least ₱1.");
      return;
    }

    setSaving(true);
    try {
      // Write value updates back to user document in Firestore database
      await updateDoc(doc(db, "users", currentUser.uid), {
        dailyBudget: Number(budget),
        gender: gender,
      });
      // Update local React Context state so the change registers immediately throughout the app without page reload
      setUserProfile({ ...userProfile, dailyBudget: Number(budget), gender: gender });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // Visual indicator timeout reset
    } catch (err) {
      setBudgetError(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Sends friendship requests to a specific email target
  async function handleSendRequest(e) {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setSending(true);
    try {
      await sendFriendRequest(friendEmail.trim());
      setFriendMsg({ text: "Friend request sent! ✅", type: "success" });
      setFriendEmail("");
    } catch (err) {
      setFriendMsg({ text: err.message, type: "danger" });
    } finally {
      setSending(false);
      setTimeout(() => setFriendMsg({ text: "", type: "" }), 3000);
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Profile Header Block */}
      <div className="text-center mb-4">
        <div className="d-inline-block mb-3" style={{ borderRadius: "50%", boxShadow: "0 0 0 4px rgba(149,193,89,.3)" }}>
          <Avatar name={currentUser?.displayName || "User"} gender={userProfile?.gender} size={80} />
        </div>
        <h2 className="fw-black text-white mb-0">{currentUser?.displayName}</h2>
        <p className="text-secondary small mb-0">{currentUser?.email}</p>
      </div>

      {/* Aggregate metrics grid */}
      <div className="row g-2 mb-4">
        {[
          { label: "Total Points", value: userProfile?.totalPoints || 0 },
          { label: "Day Streak", value: userProfile?.currentStreak || 0 },
          { label: "Daily Budget", value: `₱${userProfile?.dailyBudget || 300}` },
        ].map((s) => (
          <div className="col-4" key={s.label}>
            <div className="card rounded-3 glass-card h-100">
              <div className="card-body text-center p-2">
                <p className="fw-bold text-white mb-0 fs-4" style={{ fontWeight: 800 }}>{s.value}</p>
                <p className="text-secondary mb-0" style={{ fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Profile Settings Panel */}
      <div className="card rounded-3 glass-card mb-3">
        <div className="card-body">
          <h3 className="fw-bold text-white mb-3" style={{ fontSize: "1rem" }}>⚙️ Settings</h3>
          
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label text-uppercase small fw-semibold text-secondary" htmlFor="profile-budget">
                Daily Budget (₱)
              </label>
              <input id="profile-budget" type="number" value={budget} onChange={(e) => { setBudget(e.target.value); setBudgetError(""); }}
                className="form-control" min={1} inputMode="numeric" />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-uppercase small fw-semibold text-secondary" htmlFor="profile-gender">
                Gender (Optional)
              </label>
              <select
                id="profile-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="form-select"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  height: "38px",
                  borderRadius: "0.375rem",
                }}
              >
                <option value="prefer_not_to_say" style={{ background: "#1e293b", color: "#fff" }}>Prefer not to say</option>
                <option value="female" style={{ background: "#1e293b", color: "#fff" }}>Female</option>
                <option value="male" style={{ background: "#1e293b", color: "#fff" }}>Male</option>
              </select>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button className="btn btn-primary fw-bold px-4 rounded-3" onClick={saveSettings} disabled={saving} id="profile-save-budget-btn" style={{ minHeight: 40 }}>
              {saved ? "✅ Saved!" : saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
          {budgetError && <div className="alert alert-danger py-2 small mt-2 mb-0">{budgetError}</div>}
        </div>
      </div>

      {/* ── Friend Management Panel ────────────────────────── */}
      <div className="card rounded-3 glass-card mb-3">
        <div className="card-body">
          <h3 className="fw-bold text-white mb-3" style={{ fontSize: "1rem" }}>👥 Friends</h3>

          {/* Invitation Email Form */}
          <form onSubmit={handleSendRequest} className="d-flex gap-2 mb-3">
            <input
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="Friend's email address"
              className="form-control"
              id="friend-email-input"
            />
            <button type="submit" className="btn btn-primary rounded-3 fw-semibold" disabled={sending} id="send-friend-request-btn" style={{ whiteSpace: "nowrap" }}>
              {sending ? "…" : "Add"}
            </button>
          </form>
          {friendMsg.text && <div className={`alert alert-${friendMsg.type} py-2 small mb-3`}>{friendMsg.text}</div>}

          {/* Incoming Requests Feed */}
          {incoming.length > 0 && (
            <div className="mb-3">
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Pending Requests</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {incoming.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <Avatar name={f.friendName || "User"} gender={f.friendGender} size={36} />
                    <div className="flex-fill">
                      <p className="fw-semibold text-white mb-0 small">{f.friendName}</p>
                      <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>{f.friendEmail}</p>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-success btn-sm rounded-3 fw-semibold" onClick={() => acceptRequest(f.id)} id={`accept-${f.id}`}>✓ Accept</button>
                      <button className="btn btn-outline-danger btn-sm rounded-3" onClick={() => declineRequest(f.id)} id={`decline-${f.id}`}>✗</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Connected Friend List */}
          {accepted.length > 0 ? (
            <div>
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Friends ({accepted.length})</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {accepted.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <Avatar name={f.friendName || "User"} gender={f.friendGender} size={36} />
                    <div>
                      <p className="fw-semibold text-white mb-0 small">{f.friendName}</p>
                      <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>{f.friendEmail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            pending.length === 0 && incoming.length === 0 && (
              <p className="text-secondary small text-center mb-0">No friends yet. Invite someone above!</p>
            )
          )}

          {/* Sent Outgoing Requests (Awaiting Friend Response) */}
          {pending.length > 0 && (
            <div className="mt-3">
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Requests Sent</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {pending.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <Avatar name={f.friendName || "User"} gender={f.friendGender} size={36} />
                    <div className="flex-fill">
                      <p className="fw-semibold text-white mb-0 small">{f.friendName}</p>
                    </div>
                    <span className="badge bg-secondary rounded-pill small">Pending</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Navigation shortcuts */}
      <button className="btn btn-outline-secondary w-100 rounded-3 fw-semibold mb-2 py-3" onClick={() => navigate("/developers")} id="profile-dev-page-btn">
        👨‍💻 Meet the Developers
      </button>


    </div>
  );
}
