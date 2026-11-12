import { useEffect, useRef, useState } from "react";

// Hover exposes labels without resizing the city view. Keyboard and touch
// navigation keep the controls open until focus or interaction moves outside.
export default function useAutoHideSidebar({ mobileOpen, presenting }) {
  const sidebarRef = useRef(null);
  const inputModality = useRef("keyboard");
  const [pointerWithin, setPointerWithin] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  useEffect(() => {
    const trackPointer = (event) => {
      inputModality.current = event.pointerType === "touch" ? "touch" : "pointer";
      setFocusWithin(
        event.pointerType === "touch" &&
          !!sidebarRef.current?.contains(event.target),
      );
    };
    const trackKeyboard = (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ["Shift", "Control", "Alt", "Meta"].includes(event.key)
      )
        return;
      inputModality.current = "keyboard";
      if (sidebarRef.current?.contains(document.activeElement))
        setFocusWithin(true);
    };
    document.addEventListener("pointerdown", trackPointer, true);
    document.addEventListener("keydown", trackKeyboard, true);
    return () => {
      document.removeEventListener("pointerdown", trackPointer, true);
      document.removeEventListener("keydown", trackKeyboard, true);
    };
  }, []);

  useEffect(() => {
    // A closed mobile drawer or a completed presentation must not leave a
    // stale hover/focus state waiting behind the next desktop icon rail.
    if (presenting || !mobileOpen) {
      setPointerWithin(false);
      setFocusWithin(false);
    }
  }, [mobileOpen, presenting]);

  return {
    sidebarRef,
    sidebarExpanded: !presenting && (mobileOpen || pointerWithin || focusWithin),
    sidebarEvents: {
      onPointerEnter: (event) => {
        if (event.pointerType !== "touch") setPointerWithin(true);
      },
      onPointerLeave: (event) => {
        if (event.pointerType !== "touch") setPointerWithin(false);
      },
      onFocusCapture: () => setFocusWithin(inputModality.current !== "pointer"),
      onBlurCapture: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocusWithin(false);
      },
    },
  };
}
