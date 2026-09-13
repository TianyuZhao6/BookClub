import classes from "./Modal.module.css";

const ModalOverlay = (props) => {
  return (
    <div className={classes.modal} role="dialog" aria-modal="true">
      <div className={classes.content}>{props.children}</div>
    </div>
  );
};

export default ModalOverlay;
