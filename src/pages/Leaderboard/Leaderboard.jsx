import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { useFriends } from "../../context/FriendContext";

const MEDALS = ["🥇", "🥈", "🥉"];

function RankRow({ user, rank, isMe }) {
  return (
    <li className={`list-group-item d-flex align-items-center gap-3 px-3 py-2 ${isMe ? "border-primary border-opacity-50" : ""}`}
      style={isMe ? { background: "rgba(99,102,241,.1)" } : {}}
      id={`leaderboard-row-${rank}`}
    >
      <span className="fw-bold" style={{ minWidth: 32, color: rank <= 3 ? undefined : "#64748b", fontSize: ".9rem" }}>
        {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
      </span>
      <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white"
        style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: ".875rem", flexShrink: 0 }}>
        {user.displayName?.[0]?.toUpperCase() || "?"}
      </div>
      <div className="flex-fill">
        <p className="fw-semibold text-white mb-0 small">{user.displayName}{isMe ? " (You)" : ""}</p>
        <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>🔥 {user.currentStreak || 0}-day streak</p>
      </div>
      <span className="fw-bold" style={{ color: "#818cf8", fontSize: ".9rem" }}>{user.totalPoints || 0} pts</span>
    </li>
  );
}

function Podium({ users }) {
  if (users.length < 3) return null;
  const order = [users[1], users[0], users[2]]; // silver, gold, bronze
  const ranks = [2, 1, 3];
  const sizes = [44, 54, 40];
  const colors = ["#64748b", "#f59e0b", "#b45309"];

  return (
    <div className="card rounded-4 mb-3" style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}>
      <div className="card-body">
        <div className="d-flex justify-content-center align-items-end gap-3 pb-1">
          {order.map((u, i) => (
            <div key={u?.id} className="d-flex flex-column align-items-center gap-1"
              style={{ transform: ranks[i] === 1 ? "translateY(-10px)" : undefined }}>
              <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white"
                style={{ width: sizes[i], height: sizes[i], background: `linear-gradient(135deg,${colors[i]},${colors[i]}aa)`, fontSize: ranks[i] === 1 ? "1.3rem" : "1rem" }}>
                {u?.displayName?.[0]?.toUpperCase() || "?"}
              </div>
              <span style={{ fontSize: "1.1rem" }}>{MEDALS[ranks[i] - 1]}</span>
              <span className="fw-bold text-white" style={{ fontSize: ".75rem" }}>{u?.displayName?.split(" ")[0]}</span>
              <span className="text-secondary" style={{ fontSize: ".7rem" }}>{u?.totalPoints || 0} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { currentUser } = useAuth();
  const { accepted }    = useFriends();
  const [tab,      setTab]      = useState("global");
  const [global,   setGlobal]   = useState([]);
  const [friendUsers, setFriendUsers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Global leaderboard — real-time
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setGlobal(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Friends leaderboard — fetch each accepted friend's user doc
  useEffect(() => {
    if (!currentUser || accepted.length === 0) { setFriendUsers([]); return; }
    const fetchAll = async () => {
      const docs = await Promise.all(
        accepted.map((f) => getDoc(doc(db, "users", f.friendUid)))
      );
      const me = global.find((u) => u.id === currentUser.uid);
      const friends = docs.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() }));
      const combined = me ? [me, ...friends.filter((f) => f.id !== currentUser.uid)] : friends;
      setFriendUsers(combined.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)));
    };
    fetchAll();
  }, [accepted, global, currentUser]);

  const list      = tab === "global" ? global : friendUsers;
  const myRank    = list.findIndex((u) => u.id === currentUser?.uid) + 1;
  const top10     = list.slice(0, 10);
  const isInTop10 = myRank > 0 && myRank <= 10;
  const myData    = list.find((u) => u.id === currentUser?.uid);

  if (loading) return <div className="page-content text-secondary text-center pt-5">Loading rankings…</div>;

  return (
    <div className="page-content">

      {/* Tab switcher */}
      <ul className="nav nav-pills nav-fill mb-3 p-1 rounded-3" style={{ background: "rgba(255,255,255,.04)" }}>
        {[["global", "🌐 Global"], ["friends", "👥 Friends"]].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button className={`nav-link w-100 fw-semibold ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)} id={`leaderboard-tab-${key}`} style={{ fontSize: ".875rem" }}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      {/* Friends tab empty state */}
      {tab === "friends" && accepted.length === 0 && (
        <div className="card rounded-3 glass-card">
          <div className="card-body text-center py-5">
            <div style={{ fontSize: "2.5rem" }}>👥</div>
            <p className="text-secondary small mt-2">No friends yet.<br />Add friends from your Profile page!</p>
          </div>
        </div>
      )}

      {/* Podium */}
      {list.length >= 3 && <Podium users={list} />}

      {/* Rankings list */}
      {list.length > 0 && (
        <ul className="list-group rounded-3 mb-2" style={{ overflow: "hidden" }}>
          {top10.map((user, i) => (
            <RankRow key={user.id} user={user} rank={i + 1} isMe={user.id === currentUser?.uid} />
          ))}
        </ul>
      )}

      {/* Pinned "You" row if outside top 10 */}
      {!isInTop10 && myData && myRank > 0 && (
        <div className="mt-1" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <ul className="list-group rounded-3 mt-2" style={{ overflow: "hidden" }}>
            <RankRow user={myData} rank={myRank} isMe={true} />
          </ul>
        </div>
      )}

      {list.length === 0 && tab === "global" && (
        <div className="card rounded-3 glass-card">
          <div className="card-body text-center py-5">
            <div style={{ fontSize: "2.5rem" }}>🏆</div>
            <p className="text-secondary small mt-2">No users yet. Be the first!</p>
          </div>
        </div>
      )}

    </div>
  );
}
