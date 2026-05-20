import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ExpenseForm from "./ExpenseForm";

/**
 * FAB (Floating Action Button) Component
 * 
 * Purpose: Provides a quick-access add button locked to the bottom right of the screen.
 * Key Features:
 *  - **Persistent Floating Layout**: Fixed layout keeps the add trigger within easy reach on mobile devices.
 *  - **Tactile Modal sheet**: Leverages Framer Motion spring physics to open a modal overlay.
 *  - **Context callback**: Passes `onSuccess={() => setOpen(false)}` to close the panel once the transaction saves.
 */
export default function FAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button trigger anchored at bottom-right */}
      <div className="fab">
        <button
          className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center shadow-lg"
          style={{ width: 56, height: 56, fontSize: "1.5rem",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
            boxShadow: "0 4px 20px rgba(99,102,241,.5)" }}
          onClick={() => setOpen(true)}
          aria-label="Add expense"
          id="fab-add-expense"
        >
          <FiPlus />
        </button>
      </div>

      {/* Slide-up modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3 px-lg-0"
            style={{ background: "rgba(0,0,0,.6)", zIndex: 1100 }}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)} // Close when clicking backdrops
          >
            <motion.div
              className="w-100"
              style={{ maxWidth: 480 }}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside form
            >
              <div className="card rounded-top-4 rounded-bottom-0 border-0 responsive-modal-card">
                <div className="card-body pb-5">
                  <div className="offcanvas-handle d-lg-none" />
                  
                  {/* Modal Header */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h2 className="fs-5 fw-bold mb-0 text-white">Add Expense</h2>
                    <button className="btn btn-sm btn-outline-secondary rounded-circle"
                      style={{ width: 32, height: 32, padding: 0 }}
                      onClick={() => setOpen(false)} aria-label="Close">
                      <FiX size={14} />
                    </button>
                  </div>
                  
                  {/* Main Form (closes modal on successful save) */}
                  <ExpenseForm onSuccess={() => setOpen(false)} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
