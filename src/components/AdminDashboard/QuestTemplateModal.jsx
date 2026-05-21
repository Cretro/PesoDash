import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

const CATEGORIES = ["Food", "Commute", "School Expenses", "Others"];

/**
 * QuestTemplateModal Component
 *
 * Purpose: Slide-up modal form for creating or editing quest templates from the Admin Dashboard.
 * Supports all quest types (streak, total_spend_limit, zero_splurge_days, savings_goal),
 * period selection (daily/weekly/persistent), category constraints, and auto-fill descriptions.
 *
 * Props:
 *  - showAddTemplate    {boolean}   Controls whether this modal is visible.
 *  - setShowAddTemplate {Function}  Closes the modal.
 *  - editingTemplate    {Object|null} The template being edited (null = create mode).
 *  - setEditingTemplate {Function}  Clears the editing template state on close.
 *  - templateForm       {Object}    Controlled form state for all template fields.
 *  - setTemplateForm    {Function}  Updates individual template form fields.
 *  - handleSaveTemplate {Function}  Form submit handler — creates or updates the Firestore document.
 *  - suggestedDescription {string} Auto-generated description based on current form values.
 */
export default function QuestTemplateModal({
  showAddTemplate,
  setShowAddTemplate,
  editingTemplate,
  setEditingTemplate,
  templateForm,
  setTemplateForm,
  handleSaveTemplate,
  suggestedDescription,
}) {
  return (
    <AnimatePresence>
      {showAddTemplate && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3"
          style={{ background: "rgba(0,0,0,.7)", zIndex: 1100 }}
          onClick={() => setShowAddTemplate(false)}
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
                <h3 className="fs-5 fw-bold text-white mb-0">
                  {editingTemplate ? "Edit Quest Template" : "Add Quest Template"}
                </h3>
                <button className="btn btn-outline-secondary border-0 p-1" onClick={() => setShowAddTemplate(false)}>
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="d-flex flex-column gap-3">
                <div className="row g-2">
                  <div className="col-4">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Emoji Icon</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={templateForm.icon}
                      onChange={(e) => setTemplateForm({ ...templateForm, icon: e.target.value })}
                      className="form-control text-center"
                      style={{ fontSize: "1.2rem" }}
                    />
                  </div>
                  <div className="col-8">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Quest Type</label>
                    <select
                      value={templateForm.questType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const newPeriod = newType === "streak" ? "persistent" : (templateForm.period === "persistent" ? "weekly" : templateForm.period);
                        const isLockedTarget = ["zero_splurge_days"].includes(newType) && newPeriod === "daily";
                        setTemplateForm({
                          ...templateForm,
                          questType: newType,
                          period: newPeriod,
                          target: isLockedTarget ? 1 : templateForm.target,
                        });
                      }}
                      className="form-select text-white bg-dark border-secondary"
                    >
                      <option value="streak">Budget Streak (Days)</option>
                      <option value="total_spend_limit">Category Spend Limit (₱)</option>
                      <option value="zero_splurge_days">No Splurge Days (Days)</option>
                      <option value="savings_goal">Savings Goal (₱)</option>
                    </select>
                  </div>
                </div>

                {/* Quest type hint */}
                <div className="alert bg-white bg-opacity-5 border border-white border-opacity-10 py-2.5 px-3 small text-secondary mb-0 rounded-3">
                  {templateForm.questType === "streak" ? (
                    <span>🎯 <strong>Budget Streak</strong>: Counts consecutive days where daily spending is within daily budget. Target is consecutive days (e.g. 7). This quest is persistent and does not reset weekly/daily.</span>
                  ) : templateForm.period === "daily" ? (
                    <>
                      {templateForm.questType === "total_spend_limit" && (
                        <span>🎯 <strong>Daily spend limit</strong>: Keeps today's spending in category under target limit. Resets daily. Target is cash limit in pesos (e.g. 150).</span>
                      )}
                      {templateForm.questType === "zero_splurge_days" && (
                        <span>🎯 <strong>Daily Zero Splurge</strong>: Checks if you logged expenses today but spent ₱0 on a category. Resets daily. Target should be 1.</span>
                      )}
                      {templateForm.questType === "savings_goal" && (
                        <span>🎯 <strong>Daily Savings</strong>: Checks today's savings (Daily Budget - today's spend). Resets daily. Target is in pesos (e.g. 50).</span>
                      )}
                    </>
                  ) : (
                    <>
                      {templateForm.questType === "total_spend_limit" && (
                        <span>🎯 <strong>Weekly Spend Limit</strong>: Keeps total spending in a category under target limit for the entire week. Resets Sunday. Target is in pesos (e.g. 1000).</span>
                      )}
                      {templateForm.questType === "zero_splurge_days" && (
                        <span>🎯 <strong>Weekly Zero Splurge Days</strong>: Counts how many days this week have ₱0 expenses logged in a chosen category. Target is number of days (e.g. 3).</span>
                      )}
                      {templateForm.questType === "savings_goal" && (
                        <span>🎯 <strong>Weekly Savings Goal</strong>: Tracks total money saved this week. Resets Sunday. Target is in pesos (e.g. 500).</span>
                      )}
                    </>
                  )}
                </div>

                {/* Period selector (hidden for streak — always persistent) */}
                {templateForm.questType !== "streak" && (
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Quest Period</label>
                      <select
                        value={templateForm.period || "weekly"}
                        onChange={(e) => {
                          const newPeriod = e.target.value;
                          const isLockedTarget = templateForm.questType === "zero_splurge_days" && newPeriod === "daily";
                          setTemplateForm({ ...templateForm, period: newPeriod, target: isLockedTarget ? 1 : templateForm.target });
                        }}
                        className="form-select text-white bg-dark border-secondary"
                      >
                        <option value="weekly">Weekly Reset</option>
                        <option value="daily">Daily Reset</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget Warrior"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    className="form-control text-white bg-dark border-secondary"
                  />
                </div>

                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-0">Description</label>
                    {suggestedDescription && (
                      <button
                        type="button"
                        onClick={() => setTemplateForm((prev) => ({ ...prev, description: suggestedDescription }))}
                        className="btn btn-link p-0 small text-decoration-none"
                        style={{ fontSize: ".72rem", color: "#818cf8" }}
                      >
                        ✨ Auto-fill Suggested
                      </button>
                    )}
                  </div>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Spend less than your budget limit..."
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    className="form-control text-white bg-dark border-secondary"
                  />
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1 font-monospace">
                      {["category", "total_spend_limit", "savings_goal"].includes(templateForm.questType)
                        ? "Target (₱)"
                        : "Target (Days)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder={["category", "total_spend_limit", "savings_goal"].includes(templateForm.questType) ? "e.g. 500" : "e.g. 5"}
                      value={templateForm.target}
                      onChange={(e) => setTemplateForm({ ...templateForm, target: e.target.value })}
                      className="form-control text-white bg-dark border-secondary"
                      // Lock to 1 for daily zero_splurge — the engine hardcodes progress as 0 or 1 for these, making any other value impossible to reach
                      readOnly={templateForm.questType === "zero_splurge_days" && templateForm.period === "daily"}
                      style={templateForm.questType === "zero_splurge_days" && templateForm.period === "daily" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Points Reward</label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="e.g. 100"
                      value={templateForm.pointsReward}
                      onChange={(e) => setTemplateForm({ ...templateForm, pointsReward: e.target.value })}
                      className="form-control text-white bg-dark border-secondary"
                    />
                  </div>
                </div>

                {/* Category selector — only shown for relevant quest types */}
                {["days_under_category_limit", "total_spend_limit", "zero_splurge_days", "category"].includes(templateForm.questType) && (
                  <div>
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Specific Category</label>
                    <select
                      value={templateForm.category}
                      required
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="form-select text-white bg-dark border-secondary"
                    >
                      <option value="" disabled>Select category...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="submit" className="btn gradient-btn fw-bold w-100 py-3 rounded-3 mt-2">
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
