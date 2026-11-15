import React, {
  Component,
  Suspense,
  lazy,
  memo,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { MapPinned, RotateCcw } from "lucide-react";
import "./CityMapLoading.css";

// Share the downloaded geography and a stable lazy type per load attempt.
// Explicit retries discard rejected lazy state without resetting the session.
let geographicModule;
let geographicLoadFailed = false;
let geographyRevision = 0;
const retrySubscribers = new Set();
const subscribeToRetries = (subscriber) => {
  retrySubscribers.add(subscriber);
  return () => retrySubscribers.delete(subscriber);
};
const getRetryRevision = () => geographyRevision;
const loadGeography = () => {
  if (!geographicModule) {
    const loading = import("./GeographicCityMap").catch((error) => {
      if (geographicModule === loading) {
        geographicModule = undefined;
        geographicLoadFailed = true;
      }
      throw error;
    });
    geographicModule = loading;
  }
  return geographicModule;
};
// Keep one lazy identity for each load attempt. Creating a new lazy type on
// every remount can repeatedly suspend when the shared import is already cached.
let GeographicCityMap = lazy(loadGeography);
const resetGeographyCache = () => {
  geographicModule = undefined;
  geographicLoadFailed = false;
  GeographicCityMap = lazy(loadGeography);
  geographyRevision += 1;
  for (const subscriber of retrySubscribers) subscriber();
};

export async function preloadCityModel() {
  if (geographicLoadFailed) resetGeographyCache();
  const module = await loadGeography();
  return module.warmGeographyViews();
}

export async function retryGeographicModel() {
  resetGeographyCache();
  return preloadCityModel();
}

function MapLoading({ failed = false, onRetry }) {
  return (
    <div
      className={`city-map geo-loading ${failed ? "geo-loading-failed" : ""}`}
      aria-busy={!failed}
    >
      <div className="geo-loading-message" role="status">
        <MapPinned size={28} strokeWidth={1.2} />
        <strong>
          {failed
            ? "The geographic model could not be loaded."
            : "Loading Leuven street geometry"}
        </strong>
        <span>
          {failed
            ? "Retry the map while keeping your decision session."
            : "Real streets, building footprints and waterways."}
        </span>
        {failed && (
          <button className="button secondary" onClick={onRetry}>
            <RotateCcw size={14} />
            Retry geographic model
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
    return this.state.failed ? (
      <MapLoading failed onRetry={this.props.onRetry} />
    ) : (
      this.props.children
    );
  }
}

export default memo(function CityMap(props) {
  const [retryKey, setRetryKey] = useState(0);
  const viewResetToken = props.viewResetToken ?? 0;
  const retryRevision = useSyncExternalStore(
    subscribeToRetries,
    getRetryRevision,
    getRetryRevision,
  );
  const retry = useCallback(() => {
    resetGeographyCache();
    setRetryKey((attempt) => attempt + 1);
  }, []);
  return (
    <MapBoundary
      key={`${viewResetToken}:${retryKey}:${retryRevision}`}
      onRetry={retry}
    >
      <Suspense fallback={<MapLoading />}>
        <GeographicCityMap {...props} />
      </Suspense>
    </MapBoundary>
  );
});
