import React, { useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  GitBranch,
  Globe2,
  Layers3,
  Map,
  Play,
} from "lucide-react";
import "./WorkspaceMenu.css";

const destinations = [
  { label: "City overview", page: "Overview", icon: Activity },
  { label: "City map", page: "City Map", icon: Map },
  { label: "Scenario intelligence", page: "Digital Twin", icon: Layers3 },
  {
    label: "Implementation roadmap",
    page: "Implementation Roadmap",
    icon: GitBranch,
  },
  { label: "Presentation Demo", demo: true, icon: Play },
];

export default function WorkspaceMenu({ page, onNavigate, onStartDemo }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const tabTimerRef = useRef(null);
  const routeFocusRef = useRef(null);
  const id = useId();
  const triggerId = `${id}-trigger`;
  const menuId = `${id}-menu`;

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() =>
      itemRefs.current[activeIndex]?.focus(),
    );
    const onOutsidePointer = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutsidePointer);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onOutsidePointer);
    };
  }, [open, activeIndex]);

  useEffect(
    () => () => {
      if (tabTimerRef.current !== null) clearTimeout(tabTimerRef.current);
      if (routeFocusRef.current !== null)
        cancelAnimationFrame(routeFocusRef.current);
    },
    [],
  );

  const openAt = (index) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const focusItem = (index) => {
    const next = (index + destinations.length) % destinations.length;
    setActiveIndex(next);
    itemRefs.current[next]?.focus();
    itemRefs.current[next]?.scrollIntoView?.({ block: "nearest" });
  };

  const menuKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(destinations.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      // Let native Tab move to the next control, then dismiss without a trap.
      tabTimerRef.current = setTimeout(() => setOpen(false), 0);
    }
  };

  const select = (destination) => {
    setOpen(false);
    if (destination.demo) onStartDemo?.();
    else onNavigate?.(destination.page);
    // The sidebar closes on mobile navigation; focus the newly shown page,
    // rather than leaving keyboard focus inside an off-screen sidebar.
    routeFocusRef.current = requestAnimationFrame(() => {
      const heading = document.querySelector(".page-heading h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      } else triggerRef.current?.focus();
    });
  };

  return (
    <div
      ref={pickerRef}
      className={`workspace-picker ${open ? "is-open" : ""}`}
      data-presentation-shortcuts="off"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key))
          event.stopPropagation();
      }}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="workspace-trigger"
        aria-label="City Control Room workspace menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close(true) : openAt(0))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            openAt(event.key === "ArrowDown" ? 0 : destinations.length - 1);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }
        }}
      >
        <span className="workspace-trigger-icon">
          <Globe2 size={16} strokeWidth={1.6} />
        </span>
        <span className="workspace-trigger-copy">
          <strong>City Control Room</strong>
          <small>Leuven demonstration</small>
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.7}
          className="workspace-trigger-chevron"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="workspace-dropdown"
          onKeyDown={menuKeyDown}
        >
          <div className="workspace-dropdown-context" role="presentation">
            <span>LEUVEN WORKSPACE</span>
            <p>Illustrative operational scenario</p>
          </div>
          {destinations.map((destination, index) => {
            const Icon = destination.icon;
            const current = !destination.demo && page === destination.page;
            return (
              <React.Fragment key={destination.label}>
                {destination.demo && (
                  <div role="separator" className="workspace-menu-separator" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className={`workspace-menu-item ${current ? "is-current" : ""} ${destination.demo ? "is-demo" : ""}`}
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-current={current ? "page" : undefined}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => select(destination)}
                >
                  <Icon size={15} strokeWidth={1.6} />
                  <span>{destination.label}</span>
                  {current && (
                    <Check
                      size={13}
                      className="workspace-current-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
