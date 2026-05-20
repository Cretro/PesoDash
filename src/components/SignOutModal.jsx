import { motion, AnimatePresence } from "framer-motion";
import { FiLogOut } from "react-icons/fi";

/**
 * SignOutModal Component
 * 
 * Purpose: Renders a premium confirmation dialog before signing the user out.
 * Key Details:
 *  - Uses `framer-motion` AnimatePresence for smooth fade + scale entry/exit transitions.
 *  - Backdrop click and "Cancel" button both dismiss the modal without signing out.
 *  - "Sign Out" button triggers the `onConfirm` callback passed from the parent.
 *  - Styled with the app's glassmorphic dark theme for visual consistency.
 */
export default function SignOutModal({ show, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Semi-transparent backdrop overlay — clicking dismisses the modal */}
          <motion.div
            className="signout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
          />

          {/* Modal dialog container wrapped in a centering overlay */}
          <div className="signout-overlay">
            <motion.div
              className="signout-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              {/* Icon and heading */}
              <div className="signout-modal__icon">
                <FiLogOut />
              </div>
              <h2 className="signout-modal__title tactical-title">Sign Out</h2>
              <p className="signout-modal__desc">
                Are you sure you want to sign out of your account?
              </p>

              {/* Action buttons */}
              <div className="signout-modal__actions">
                <button
                  className="signout-modal__btn signout-modal__btn--cancel"
                  onClick={onCancel}
                  id="signout-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  className="signout-modal__btn signout-modal__btn--confirm"
                  onClick={onConfirm}
                  id="signout-confirm-btn"
                >
                  <FiLogOut style={{ marginRight: 6 }} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
