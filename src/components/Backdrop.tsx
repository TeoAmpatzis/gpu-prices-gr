/**
 * Decorative page background: the blueprint grid at the top and circuit traces in the side margins.
 * All drawing is CSS (index.css `.bd-*`, intensities --bg-grid / --bg-traces); the title glow is in App.
 */
export default function Backdrop() {
  return (
    <div aria-hidden="true">
      <div className="bd-grid" />
      <div className="bd-traces bd-traces--left">
        <div />
      </div>
      <div className="bd-traces bd-traces--right">
        <div />
      </div>
    </div>
  );
}
