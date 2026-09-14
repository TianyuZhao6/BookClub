import classes from "./Modal.module.css";

const ModalOverlay = (props) => {
  return (
    <div className={classes.modal} role="dialog" aria-modal="true">
      <button type="button" className={classes.close} aria-label="Close dialog" autoFocus onClick={props.onClose}>×</button>
      <div className={classes.content}>{props.children}</div>
    </div>
  );
};

export default ModalOverlay;
