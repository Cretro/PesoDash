import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

/**
 * AdminQuestsPanel Component
 *
 * Purpose: Renders the Quest Templates tab within the AdminDashboard.
 * Displays a responsive grid of all quest template cards and provides
 * controls to add, edit, and delete templates.
 *
 * Props:
 *  - loadingTemplates    {boolean}   Whether the Firestore templates snapshot is still loading.
 *  - templates           {Array}     List of all quest template documents from Firestore.
 *  - setEditingTemplate  {Function}  Sets the currently selected template to edit.
 *  - setTemplateForm     {Function}  Populates the quest template form with existing data (edit mode).
 *  - setShowAddTemplate  {Function}  Opens the QuestTemplateModal.
 *  - handleDeleteTemplate {Function} Deletes a quest template document from Firestore.
 */
export default function AdminQuestsPanel({ loadingTemplates, templates, setEditingTemplate, setTemplateForm, setShowAddTemplate, handleDeleteTemplate }) {
  return (
    <div className="panel-container">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="fs-5 fw-bold text-white mb-0">Quest templates ({templates.length})</h2>
        <button
          className="btn btn-primary btn-sm rounded-3 fw-bold d-flex align-items-center gap-1.5 py-2 px-3"
          onClick={() => {
            setEditingTemplate(null);
            setTemplateForm({
              questType: "streak",
              title: "",
              description: "",
              target: "",
              pointsReward: "",
              icon: "🎯",
              category: "",
            });
            setShowAddTemplate(true);
          }}
        >
          <FiPlus /> Add Template
        </button>
      </div>

      {loadingTemplates ? (
        <div className="text-center py-5 text-secondary">Loading quest templates...</div>
      ) : templates.length === 0 ? (
        <div className="card rounded-3 glass-card text-center py-5 text-secondary">No templates. Seed templates by loading the quests page.</div>
      ) : (
        <div className="row g-3">
          {templates.map((temp) => (
            <div className="col-12 col-md-6" key={temp.id}>
              <div className="card rounded-3 glass-card h-100 position-relative">
                <div className="card-body p-3">
                  <div className="d-flex align-items-start gap-3">
                    <span style={{ fontSize: "1.75rem" }}>{temp.icon}</span>
                    <div className="flex-fill">
                      <h3 className="fw-bold text-white mb-1 fs-6">{temp.title}</h3>
                      <p className="text-secondary small mb-2">{temp.description}</p>
                      <div className="d-flex flex-wrap gap-2 mb-1">
                        <span className="badge rounded-pill small" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.12)", fontSize: "0.7rem" }}>
                          {temp.period || "weekly"}
                        </span>
                        <span className="badge rounded-pill small" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.12)", fontSize: "0.7rem" }}>
                          {temp.questType}
                        </span>
                        <span className="badge rounded-pill small" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.3)", fontSize: "0.7rem" }}>
                          Target: {["category", "total_spend_limit", "savings_goal"].includes(temp.questType) ? `₱${temp.target}` : `${temp.target} days`}
                        </span>
                        <span className="badge rounded-pill small" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.7rem" }}>
                          +{temp.pointsReward}pt
                        </span>
                        {temp.category && (
                          <span className="badge rounded-pill small" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.7rem" }}>
                            {temp.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-1.5">
                      <button
                        className="btn btn-sm btn-outline-primary rounded-3 py-1 px-2 border-0"
                        onClick={() => {
                          setEditingTemplate(temp);
                          setTemplateForm({
                            questType: temp.questType,
                            period: temp.questType === "streak" ? "persistent" : (temp.period || "weekly"),
                            title: temp.title,
                            description: temp.description,
                            target: temp.target,
                            pointsReward: temp.pointsReward,
                            icon: temp.icon,
                            category: temp.category || "",
                          });
                          setShowAddTemplate(true);
                        }}
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger rounded-3 py-1 px-2 border-0"
                        onClick={() => handleDeleteTemplate(temp.id)}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
