import { useEffect } from "react";
import { createPortal } from "react-dom";
import Backdrop from "./Backdrop";
import ModalOverlay from "./ModalOverlay";

const Modal = (props) => {
  useEffect(() => {
    const previous = document.activeElement;
    const escape = event => { if (event.key === 'Escape') props.onClosePasswordChange?.(); };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); previous?.focus?.(); };
  }, [props.onClosePasswordChange]);
  const portalElement = document.getElementById("overlays");

  return (
    <>
      {createPortal(
        <Backdrop onClosePasswordChange={props.onClosePasswordChange} />,
        portalElement
      )}
      {createPortal(
        <ModalOverlay onClose={props.onClosePasswordChange}>{props.children}</ModalOverlay>,
        portalElement
      )}
    </>
  );
};

export default Modal;
