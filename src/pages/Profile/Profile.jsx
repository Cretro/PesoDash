import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth }    from "../../context/AuthContext";
import { useFriends } from "../../context/FriendContext";

export default function Profile() {
  const { currentUser, userProfile, logout, setUserProfile } = useAuth();
  const { accepted, incoming, pending, sendFriendRequest, acceptRequest, declineRequest } = useFriends();
  const navigate = useNavigate();

  const [budget,     setBudget]     = useState(userProfile?.dailyBudget || 300);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendMsg,  setFriendMsg]  = useState({ text: "", type: "" });
  const [sending,    setSending]    = useState(false);

  async function handleLogout() { await logout(); navigate("/"); }

  async function saveBudget() {
    setSaving(true);
    await updateDoc(doc(db, "users", currentUser.uid), { dailyBudget: Number(budget) });
    setUserProfile({ ...userProfile, dailyBudget: Number(budget) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

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
    } finally { setSending(false); setTimeout(() => setFriendMsg({ text: "", type: "" }), 3000); }
  }

  return (
    <div className="page-content">

      {/* Avatar + info */}
      <div className="text-center mb-4">
        <div className="rounded-circle d-inline-flex align-items-center justify-content-center fw-black text-white mb-3"
          style={{ width: 80, height: 80, fontSize: "2rem", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 0 4px rgba(99,102,241,.25)" }}>
          {currentUser?.displayName?.[0]?.toUpperCase() || "?"}
        </div>
        <h2 className="fw-black text-white mb-0">{currentUser?.displayName}</h2>
        <p className="text-secondary small mb-0">{currentUser?.email}</p>
      </div>

      {/* Stats — Bootstrap row */}
      <div className="row g-2 mb-4">
        {[
          { label: "Total Points", value: userProfile?.totalPoints || 0 },
          { label: "Day Streak",   value: userProfile?.currentStreak || 0 },
          { label: "Daily Budget", value: `₱${userProfile?.dailyBudget || 300}` },
        ].map((s) => (
          <div className="col-4" key={s.label}>
            <div className="card rounded-3 glass-card h-100">
              <div className="card-body text-center p-2">
                <p className="fw-black text-white mb-0 fs-5">{s.value}</p>
                <p className="text-secondary mb-0" style={{ fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Budget setting */}
      <div className="card rounded-3 glass-card mb-3">
        <div className="card-body">
          <label className="form-label text-uppercase small fw-semibold text-secondary" htmlFor="profile-budget">
            Daily Budget (₱)
          </label>
          <div className="d-flex gap-2">
            <input id="profile-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
              className="form-control" min={1} inputMode="numeric" />
            <button className="btn gradient-btn fw-bold px-4 rounded-3" onClick={saveBudget} disabled={saving} id="profile-save-budget-btn" style={{ minHeight: 44, whiteSpace: "nowrap" }}>
              {saved ? "✅ Saved!" : saving ? "…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Friend System ────────────────────────── */}
      <div className="card rounded-3 glass-card mb-3">
        <div className="card-body">
          <h3 className="fw-bold text-white mb-3" style={{ fontSize: "1rem" }}>👥 Friends</h3>

          {/* Add friend */}
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

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <div className="mb-3">
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Pending Requests</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {incoming.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                      style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: ".875rem", flexShrink: 0 }}>
                      {f.friendName?.[0]?.toUpperCase() || "?"}
                    </div>
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

          {/* Accepted friends */}
          {accepted.length > 0 ? (
            <div>
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Friends ({accepted.length})</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {accepted.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                      style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: ".875rem", flexShrink: 0 }}>
                      {f.friendName?.[0]?.toUpperCase() || "?"}
                    </div>
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

          {/* Sent (pending) */}
          {pending.length > 0 && (
            <div className="mt-3">
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".72rem" }}>Requests Sent</p>
              <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                {pending.map((f) => (
                  <li key={f.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                      style={{ width: 36, height: 36, background: "rgba(99,102,241,.3)", fontSize: ".875rem", flexShrink: 0 }}>
                      {f.friendName?.[0]?.toUpperCase() || "?"}
                    </div>
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

      {/* Developers link */}
      <button className="btn btn-outline-secondary w-100 rounded-3 fw-semibold mb-2 py-3" onClick={() => navigate("/developers")} id="profile-dev-page-btn">
        👨‍💻 Meet the Developers
      </button>

      {/* Logout */}
      <button className="btn btn-outline-danger w-100 rounded-3 fw-bold py-3" onClick={handleLogout} id="profile-logout-btn">
        Sign Out
      </button>

    </div>
  );
}
