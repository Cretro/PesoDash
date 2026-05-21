import Avatar from "../Avatar";
import { FiSearch, FiEdit2 } from "react-icons/fi";

/**
 * AdminUsersPanel Component
 *
 * Purpose: Renders the Users tab within the AdminDashboard.
 * Displays a searchable list of all platform users.
 * - Desktop: Renders a full data table with sortable columns.
 * - Mobile: Renders a compact card grid for each user.
 *
 * Props:
 *  - loadingUsers    {boolean}   Whether the Firestore users snapshot is still loading.
 *  - filteredUsers   {Array}     Memoized list of users matching the current search query.
 *  - searchQuery     {string}    Current value of the search input.
 *  - setSearchQuery  {Function}  Updates the search query state in the parent.
 *  - setEditingUser  {Function}  Opens the EditUserModal by setting the user to edit.
 */
export default function AdminUsersPanel({ loadingUsers, filteredUsers, searchQuery, setSearchQuery, setEditingUser }) {
  return (
    <div className="panel-container">
      {/* Search Input */}
      <div className="d-flex align-items-center gap-2 mb-3 rounded-3 px-3 py-2" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--pd-border)" }}>
        <FiSearch style={{ color: "var(--pd-muted)" }} />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-100 border-0 p-0 text-white bg-transparent"
          style={{ outline: "none", boxShadow: "none" }}
        />
      </div>

      {loadingUsers ? (
        <div className="text-center py-5 text-secondary">Loading users collection...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card rounded-3 glass-card text-center py-5 text-secondary">No users found matching query.</div>
      ) : (
        <>
          {/* Desktop View Table */}
          <div className="table-responsive d-none d-lg-block rounded-3" style={{ border: "1px solid var(--pd-border)" }}>
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead>
                <tr style={{ background: "rgba(255,255,255,.02)" }}>
                  <th className="px-3 py-2.5 small text-secondary fw-semibold">User</th>
                  <th className="py-2.5 small text-secondary fw-semibold">Email</th>
                  <th className="py-2.5 small text-secondary fw-semibold text-center">Points</th>
                  <th className="py-2.5 small text-secondary fw-semibold text-center">Streak</th>
                  <th className="py-2.5 small text-secondary fw-semibold text-center">Budget</th>
                  <th className="py-2.5 small text-secondary fw-semibold text-center">Role</th>
                  <th className="py-2.5 small text-secondary fw-semibold text-center">Status</th>
                  <th className="px-3 py-2.5 small text-secondary fw-semibold text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2.5">
                      <div className="d-flex align-items-center gap-2">
                        <Avatar name={user.displayName || "User"} gender={user.gender} size={32} />
                        <span className="fw-semibold text-white small">{user.displayName || "Unregistered"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-secondary small">{user.email}</td>
                    <td className="py-2.5 text-white small text-center fw-bold" style={{ fontWeight: 800 }}>{user.totalPoints || 0}</td>
                    <td className="py-2.5 small text-center fw-bold" style={{ color: "var(--pd-reward)", fontWeight: 800 }}>🔥 {user.currentStreak || 0}</td>
                    <td className="py-2.5 text-white small text-center fw-bold" style={{ fontWeight: 800 }}>₱{user.dailyBudget || 300}</td>
                    <td className="py-2.5 text-center">
                      {user.role === "admin" ? (
                        <span className="badge bg-indigo rounded-pill small" style={{ fontSize: ".7rem" }}>Admin</span>
                      ) : (
                        <span className="text-secondary small">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {user.disabled ? (
                        <span className="badge bg-danger rounded-pill small" style={{ fontSize: ".7rem" }}>Archived</span>
                      ) : (
                        <span className="badge bg-success rounded-pill small" style={{ fontSize: ".7rem" }}>Active</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <button
                        className="btn btn-sm btn-outline-primary rounded-3 border-0 py-1"
                        onClick={() => setEditingUser({ ...user })}
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards */}
          <div className="d-flex flex-column gap-2.5 d-lg-none">
            {filteredUsers.map((user) => (
              <div key={user.id} className="card rounded-3 glass-card">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <Avatar name={user.displayName || "User"} gender={user.gender} size={36} />
                      <div>
                        <p className="fw-bold text-white mb-0 small">{user.displayName}</p>
                        <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>{user.email}</p>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary rounded-3 px-2.5 py-1"
                      onClick={() => setEditingUser({ ...user })}
                    >
                      <FiEdit2 size={13} className="me-1" /> Edit
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2 text-center pt-2 border-top border-white border-opacity-5">
                    <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                      <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Points</p>
                      <p className="fw-bold text-white mb-0 small" style={{ fontWeight: 800 }}>{user.totalPoints || 0}</p>
                    </div>
                    <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                      <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Streak</p>
                      <p className="fw-bold mb-0 small" style={{ color: "var(--pd-reward)", fontWeight: 800 }}>🔥 {user.currentStreak || 0}</p>
                    </div>
                    <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                      <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Budget</p>
                      <p className="fw-bold text-white mb-0 small" style={{ fontWeight: 800 }}>₱{user.dailyBudget || 300}</p>
                    </div>
                    <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2 d-flex align-items-center justify-content-center gap-1 flex-column">
                      {user.role === "admin" && <span className="badge bg-indigo rounded-pill" style={{ fontSize: ".6rem" }}>Admin</span>}
                      {user.disabled ? (
                        <span className="badge bg-danger rounded-pill" style={{ fontSize: ".6rem" }}>Archived</span>
                      ) : (
                        <span className="badge bg-success rounded-pill" style={{ fontSize: ".6rem" }}>Active</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
