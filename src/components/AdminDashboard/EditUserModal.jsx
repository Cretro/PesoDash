import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

/**
 * EditUserModal Component
 *
 * Purpose: Slide-up modal form for editing an existing user's profile from the Admin Dashboard.
 * Allows admins to update display name, points, streak, daily budget, role, account status, and gender.
 *
 * Props:
 *  - editingUser     {Object|null}  The user document being edited. Null means modal is closed.
 *  - setEditingUser  {Function}     Updates/clears the editing user state in the parent.
 *  - handleUpdateUser {Function}   Form submit handler — sends the updated fields to Firestore.
 *  - currentUser     {Object}      The currently signed-in admin user (used to show self-demotion warning).
 */
export default function EditUserModal({ editingUser, setEditingUser, handleUpdateUser, currentUser }) {
  return (
    <AnimatePresence>
      {editingUser && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3"
          style={{ background: "rgba(0,0,0,.7)", zIndex: 1100 }}
          onClick={() => setEditingUser(null)}
        >
          <motion.div
            className="w-100 card rounded-4 border-0 responsive-modal-card"
            style={{ maxWidth: 480 }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3.5">
                <h3 className="fs-5 fw-bold text-white mb-0">Edit User Profile</h3>
                <button className="btn btn-outline-secondary border-0 p-1" onClick={() => setEditingUser(null)}>
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.displayName || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Total Points</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editingUser.totalPoints || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, totalPoints: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Day Streak</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editingUser.currentStreak || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, currentStreak: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Daily Budget (₱)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingUser.dailyBudget || 300}
                    onChange={(e) => setEditingUser({ ...editingUser, dailyBudget: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="row g-2">
                  <div className="col-4">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">System Role</label>
                    <select
                      value={editingUser.role || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value || null })}
                      className="form-select"
                    >
                      <option value="">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Account Status</label>
                    <select
                      value={editingUser.disabled ? "disabled" : "active"}
                      onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.value === "disabled" })}
                      className="form-select"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Archived</option>
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Gender</label>
                    <select
                      value={editingUser.gender || "prefer_not_to_say"}
                      onChange={(e) => setEditingUser({ ...editingUser, gender: e.target.value })}
                      className="form-select"
                    >
                      <option value="prefer_not_to_say">Neutral</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>
                </div>

                {editingUser.id === currentUser?.uid && editingUser.role !== "admin" && (
                  <div className="alert alert-warning py-1.5 small mb-0 mt-1">
                    ⚠️ Note: Demoting yourself will lock you out of this dashboard immediately.
                  </div>
                )}

                <button type="submit" className="btn gradient-btn fw-bold w-100 py-3 rounded-3 mt-2">
                  Save Changes
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
