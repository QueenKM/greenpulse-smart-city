import React, { Component, Suspense, lazy, memo } from "react";
import { MapPinned, RotateCcw } from "lucide-react";
import "./CityMapLoading.css";

// Keep the large, locally bundled OSM geometry out of the initial application
// download so the command room and decision controls appear immediately.
const GeographicCityMap = lazy(() => import("./GeographicCityMap"));

function MapLoading({ failed = false }) {
  return (
    <div className="city-map geo-loading" aria-busy={!failed}>
      <div className="geo-loading-message" role="status">
        <MapPinned size={28} strokeWidth={1.2} />
        <strong>
          {failed
            ? "The geographic model could not be loaded."
            : "Loading Leuven street geometry"}
        </strong>
        <span>
          {failed
            ? "Refresh to reload the bundled OpenStreetMap snapshot."
            : "Real streets, building footprints and waterways."}
        </span>
        {failed && (
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={14} />
            Reload model
          </button>
        )}
      </div>
      <div className="geo-loading-provenance">
        <strong>LEUVEN URBAN MODEL</strong>
        <span>Illustrative operational scenario</span>
        <span>Synthetic demonstration data</span>
      </div>
      <a
        className="geo-loading-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors · ODbL
      </a>
    </div>
  );
}

class MapBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <MapLoading failed /> : this.props.children;
  }
}

export default memo(function CityMap(props) {
  return (
    <MapBoundary>
      <Suspense fallback={<MapLoading />}>
        <GeographicCityMap {...props} />
      </Suspense>
    </MapBoundary>
  );
});
