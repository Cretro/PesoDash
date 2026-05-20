import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../context/FriendContext";
import Avatar from "../components/Avatar";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * RankRow Component
 * 
 * Helper component rendering a single user row in the list.
 * Highlights the row with a transparent indigo border/background if it's the current user.
 */
function RankRow({ user, rank, isMe }) {
  return (
    <li className={`list-group-item d-flex align-items-center gap-3 px-3 py-2 ${isMe ? "border-primary border-opacity-50" : ""}`}
      style={isMe ? { background: "rgba(99,102,241,.1)" } : {}}
      id={`leaderboard-row-${rank}`}
    >
      <span className="fw-bold" style={{ minWidth: 32, color: rank <= 3 ? undefined : "#64748b", fontSize: ".9rem" }}>
        {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
      </span>
      <Avatar name={user.displayName || "User"} size={36} />
      <div className="flex-fill">
        <p className="fw-semibold text-white mb-0 small">{user.displayName}{isMe ? " (You)" : ""}</p>
        <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>🔥 {user.currentStreak || 0}-day streak</p>
      </div>
      <span className="fw-bold" style={{ color: "#818cf8", fontSize: ".9rem" }}>{user.totalPoints || 0} pts</span>
    </li>
  );
}

/**
 * Podium Component
 * 
 * Purpose: Displays the top 3 users visually like an Olympic medal podium.
 * Presentation Detail: 
 *  - A typical array sorted [1st, 2nd, 3rd] would render: Gold, Silver, Bronze left-to-right.
 *  - To look like a real podium, we rearrange the order to: **[Silver (2nd), Gold (1st), Bronze (3rd)]**.
 *  - We use CSS transforms to lift the Gold podium profile slightly higher.
 */
function Podium({ users }) {
  if (users.length < 3) return null;
  const order = [users[1], users[0], users[2]]; // Silver (index 1), Gold (index 0), Bronze (index 2)
  const ranks = [2, 1, 3];
  const sizes = [44, 54, 40]; // Gold gets a larger avatar border
  const colors = ["#64748b", "#f59e0b", "#b45309"]; // Silver, Gold, Bronze border hex colors

  return (
    <div className="card rounded-4 mb-3" style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}>
      <div className="card-body">
        <div className="d-flex justify-content-center align-items-end gap-3 pb-1">
          {order.map((u, i) => (
            <div key={u?.id} className="d-flex flex-column align-items-center gap-1"
              style={{ transform: ranks[i] === 1 ? "translateY(-10px)" : undefined }}>
              <Avatar name={u?.displayName || "User"} size={sizes[i]}
                style={{ border: `2px solid ${colors[i]}`, borderRadius: "50%" }} />
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

/**
 * Leaderboard Page Component
 * 
 * Purpose: Computes and displays rankings for the Global platform and direct friends.
 * Key Features:
 *  1. **Global Rank Listener**: Hooks directly into `/users` ordered by totalPoints, capped at 50.
 *  2. **Friend Rank Loader**: Loads user profiles for all accepted friends in parallel.
 *  3. **Self-Focus Guard**: If the current user is not in the Top 10, a pinned row is rendered 
 *     at the bottom showing their rank so they don't get lost.
 */
export default function Leaderboard() {
  const { currentUser } = useAuth();
  const { accepted }    = useFriends();
  const [tab,      setTab]      = useState("global");
  const [global,   setGlobal]   = useState([]);
  const [friendUsers, setFriendUsers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Effect: Sets up a real-time listener to order users by totalPoints (descending).
  // Limits total entries fetched to 50 for database query cost savings.
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setGlobal(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Effect: Resolves Friend details.
  // Friend documents only store ID strings. To show names and streaks, we must fetch
  // full user documents from `/users`.
  // We use Promise.all to trigger all fetches in parallel for maximum network efficiency.
  // Decoupled from `global` state: friend profiles only refetch when the accepted list changes.
  useEffect(() => {
    if (!currentUser || accepted.length === 0) { setFriendUsers([]); return; }
    const fetchAll = async () => {
      // Map friend UIDs into async getDoc promises, then resolve them simultaneously.
      const docs = await Promise.all(
        accepted.map((f) => getDoc(doc(db, "users", f.friendUid)))
      );
      
      const friends = docs.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() }));
      setFriendUsers(friends);
    };
    fetchAll();
  }, [accepted, currentUser]);

  // Merge the current user into the friend list using the already-loaded global data.
  // This avoids refetching friend profiles every time global rankings change.
  const friendList = useMemo(() => {
    if (!currentUser) return friendUsers;
    const me = global.find((u) => u.id === currentUser.uid);
    const combined = me
      ? [me, ...friendUsers.filter((f) => f.id !== currentUser.uid)]
      : friendUsers;
    return combined.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  }, [friendUsers, global, currentUser]);

  const list      = tab === "global" ? global : friendList;
  // Locate index of current user to evaluate if they are in the top 10
  const myRank    = list.findIndex((u) => u.id === currentUser?.uid) + 1;
  const top10     = list.slice(0, 10);
  const isInTop10 = myRank > 0 && myRank <= 10;
  const myData    = list.find((u) => u.id === currentUser?.uid);

  if (loading) return <div className="page-content text-secondary text-center pt-5">Loading rankings…</div>;

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Tab Nav Selector */}
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

      {/* Empty State for Friends */}
      {tab === "friends" && accepted.length === 0 && (
        <div className="card rounded-3 glass-card">
          <div className="card-body text-center py-5">
            <div style={{ fontSize: "2.5rem" }}>👥</div>
            <p className="text-secondary small mt-2">No friends yet.<br />Add friends from your Profile page!</p>
          </div>
        </div>
      )}

      {/* Top 3 Podium Displays */}
      {list.length >= 3 && <Podium users={list} />}

      {/* Ranks list (Top 10 only) */}
      {list.length > 0 && (
        <ul className="list-group rounded-3 mb-2" style={{ overflow: "hidden" }}>
          {top10.map((user, i) => (
            <RankRow key={user.id} user={user} rank={i + 1} isMe={user.id === currentUser?.uid} />
          ))}
        </ul>
      )}

      {/* Pinned "You" row - Rendered at bottom if the user is outside the top 10 */}
      {!isInTop10 && myData && myRank > 0 && (
        <div className="mt-1" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <ul className="list-group rounded-3 mt-2" style={{ overflow: "hidden" }}>
            <RankRow user={myData} rank={myRank} isMe={true} />
          </ul>
        </div>
      )}

      {/* Empty State for Global */}
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
