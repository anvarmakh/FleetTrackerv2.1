import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';

interface Trailer {
  id: string;
  unit_number?: string;
  unitNumber?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  status: string;
  companyId?: string;
  companyName?: string;
  companyColor?: string;
  gps_status?: string;
  gpsStatus?: string;
  last_sync?: string;
  lastSync?: string;
  lastAddress?: string;
  address?: string;
}

interface MapProps {
  trailers: Trailer[];
}

// Available map styles
const MAP_STYLES = {
  'light': 'mapbox://styles/mapbox/light-v11',
  'dark': 'mapbox://styles/mapbox/dark-v11',
  'streets': 'mapbox://styles/mapbox/streets-v12',
  'satellite': 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'navigation-day': 'mapbox://styles/mapbox/navigation-day-v1',
  'navigation-night': 'mapbox://styles/mapbox/navigation-night-v1',
  'outdoors': 'mapbox://styles/mapbox/outdoors-v12'
};

const Map: React.FC<MapProps> = ({ trailers }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const currentPopup = useRef<mapboxgl.Popup | null>(null);
  const { resolvedTheme } = useTheme();
  
  const [mapboxToken, setMapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  const [isTokenSet, setIsTokenSet] = useState(!!(import.meta.env.VITE_MAPBOX_TOKEN && import.meta.env.VITE_MAPBOX_TOKEN.trim()));
  const [selectedStyle, setSelectedStyle] = useState(resolvedTheme === 'dark' ? 'dark' : 'light');
  const [userManuallySelected, setUserManuallySelected] = useState(false);

  // Store event handler references for cleanup
  const eventHandlers = useRef<{
    load?: () => void;
    mouseenter?: () => void;
    mouseleave?: () => void;
    click?: (e: any) => void;
    mapClick?: (e: any) => void;
  }>({});

  // Memoize valid trailers to prevent unnecessary re-renders
  const validTrailers = useMemo(() => {
    return trailers.filter(trailer => {
      const lat = trailer.lastLatitude;
      const lng = trailer.lastLongitude;
      return lat && lng && !isNaN(lat) && !isNaN(lng);
    });
  }, [trailers]);

  // Memoize the map style to prevent unnecessary style changes
  const mapStyle = useMemo(() => {
    return MAP_STYLES[selectedStyle as keyof typeof MAP_STYLES] || MAP_STYLES.light;
  }, [selectedStyle]);

  // Memoize GeoJSON data to prevent unnecessary updates
  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: validTrailers.map(trailer => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [trailer.lastLongitude, trailer.lastLatitude] as [number, number]
        },
        properties: {
          id: trailer.id,
          unitNumber: trailer.unit_number || trailer.unitNumber,
          status: trailer.status,
          companyName: trailer.companyName,
          companyColor: trailer.companyColor || '#6b7280', // Default color if none provided
          address: trailer.lastAddress || trailer.address,
          lastSync: trailer.last_sync || trailer.lastSync
        }
      }))
    };
  }, [validTrailers]);

  // Create a stable reference for the data source update
  const dataSourceRef = useRef(geojsonData);
  dataSourceRef.current = geojsonData;

  // Update selectedStyle when theme changes (only if user hasn't manually selected)
  useEffect(() => {
    if (!userManuallySelected) {
      const newStyle = resolvedTheme === 'dark' ? 'dark' : 'light';
      setSelectedStyle(newStyle);
    }
  }, [resolvedTheme, userManuallySelected]);

  const addTrailerData = useCallback(() => {
    if (!map.current) {
      return;
    }

    // Always clear existing markers first
    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }

    // Always remove existing source and layers if they exist
    try {
      if (map.current && map.current.getSource('trailers')) {
        if (map.current.getLayer('trailers')) {
          map.current.removeLayer('trailers');
        }
        map.current.removeSource('trailers');
      }
    } catch (error) {
      console.error('Error removing existing trailer data:', error);
    }

    if (validTrailers.length === 0) {
      return;
    }

    try {
      // Add the trailer data source
      if (!map.current) return;
      
      map.current.addSource('trailers', {
        type: 'geojson',
        data: geojsonData
      });

      // Add individual trailer markers with better design
      map.current.addLayer({
        id: 'trailers',
        type: 'circle',
        source: 'trailers',
        paint: {
          'circle-color': ['get', 'companyColor'],
          'circle-radius': 5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9
        }
      });

      // Add hover effects
      map.current.on('mouseenter', 'trailers', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'trailers', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    } catch (error) {
      console.error('Error adding trailer data to map:', error);
    }

    // Add popup for individual trailers
    try {
      if (!map.current) return;
      
      // Store the click handler reference
      const clickHandler = (e: any) => {
        // Close any existing popup
        if (currentPopup.current) {
          currentPopup.current.remove();
          currentPopup.current = null;
        }

        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          if (properties) {
            const geometry = feature.geometry as unknown as { coordinates: [number, number] };
            const coordinates: [number, number] = [geometry.coordinates[0], geometry.coordinates[1]];
            
            // Create simple popup content
            const getStatusColor = (status: string) => {
              switch (status.toLowerCase()) {
                case 'available': return '#22c55e';
                case 'dispatched': return '#3b82f6';
                case 'maintenance': return '#eab308';
                case 'out_of_service': return '#ef4444';
                default: return '#6b7280';
              }
            };

            // Simple city/state extraction
            const extractCityState = (address: string) => {
              if (!address) return '';
              
              const cleanAddress = address.trim();
              
              // Look for patterns like "City, State" or "Street, City, State"
              if (cleanAddress.includes(',')) {
                const parts = cleanAddress.split(',').map(part => part.trim());
                
                // If we have at least 2 parts, try to extract city and state
                if (parts.length >= 2) {
                  // For "Street, City, State" format, city is second to last, state is last
                  const city = parts[parts.length - 2];
                  const state = parts[parts.length - 1];
                  
                  // Clean state (remove ZIP if present)
                  const cleanState = state.split(' ')[0];
                  
                  // Validate state looks like a state code
                  if (cleanState && cleanState.length === 2 && /^[A-Z]{2}$/.test(cleanState)) {
                    return `${city}, ${cleanState}`;
                  }
                }
              }
              
              // If no comma pattern, try space-separated "City State"
              const words = cleanAddress.split(' ');
              if (words.length >= 2) {
                const lastWord = words[words.length - 1];
                if (lastWord.length === 2 && /^[A-Z]{2}$/.test(lastWord)) {
                  const city = words.slice(0, -1).join(' ');
                  return `${city}, ${lastWord}`;
                }
              }
              
              return cleanAddress;
            };

            const cityState = extractCityState(properties.address || '');

            const popupContent = `
              <div style="padding: 8px; min-width: 200px; max-width: 250px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #111827;">
                  ${properties.unit_number || properties.unitNumber || 'Unknown'}
                </div>
                <div style="font-size: 12px; color: ${getStatusColor(properties.status)}; margin-bottom: 4px; text-transform: uppercase;">
                  ${properties.status.replace(/_/g, ' ')}
                </div>
                ${properties.companyName ? `
                  <div style="font-size: 12px; color: ${properties.companyColor || '#6b7280'}; margin-bottom: 4px;">
                    ${properties.companyName}
                  </div>
                ` : ''}
                ${cityState ? `
                  <div style="font-size: 11px; color: #6b7280; line-height: 1.3; font-weight: 500;">
                    ${cityState}
                  </div>
                ` : ''}
              </div>
            `;
            
            // Create and show popup
            currentPopup.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              maxWidth: '250px',
              offset: 10
            })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current!);
          }
        }
      };

      // Store the map click handler reference
      const mapClickHandler = (e: any) => {
        // Check if click was on a trailer marker
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['trailers'] });
        
        // If no trailer was clicked, close the popup
        if (features.length === 0 && currentPopup.current) {
          currentPopup.current.remove();
          currentPopup.current = null;
        }
      };

      // Store handlers for cleanup
      eventHandlers.current.click = clickHandler;
      eventHandlers.current.mapClick = mapClickHandler;

      // Add the event listeners
      map.current.on('click', 'trailers', clickHandler);
      map.current.on('click', mapClickHandler);
    } catch (error) {
      console.error('Error adding popup functionality:', error);
    }
  }, [geojsonData, validTrailers.length]);

  const handleTokenSubmit = () => {
    if (mapboxToken?.trim()) {
      setIsTokenSet(true);
      initializeMap();
    }
  };

  const initializeMap = useCallback(() => {
    if (!mapContainer.current) {
      return;
    }

    if (!mapboxToken) {
      return;
    }
    
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      accessToken: mapboxToken
    });



    // Wait for map to load before adding sources and layers
    const loadHandler = () => {
      // Map loaded successfully
      addTrailerData();
    };
    
    eventHandlers.current.load = loadHandler;
    map.current.on('load', loadHandler);
  }, [addTrailerData, mapboxToken, mapStyle]);

  const changeMapStyle = useCallback((styleKey: string, isManualSelection = false) => {
    if (map.current && MAP_STYLES[styleKey as keyof typeof MAP_STYLES]) {
      map.current.setStyle(MAP_STYLES[styleKey as keyof typeof MAP_STYLES]);
      setSelectedStyle(styleKey);
      
      // Mark as manually selected if user chose it
      if (isManualSelection) {
        setUserManuallySelected(true);
      }
      
      // Re-add trailer data after style change
      map.current.once('style.load', () => {
              addTrailerData();
    });
    }
  }, [addTrailerData]);

  // Effect to change map style when theme changes (only if user hasn't manually selected)
  useEffect(() => {
    if (map.current && isTokenSet && !userManuallySelected) {
      const newStyle = resolvedTheme === 'dark' ? 'dark' : 'light';
      if (newStyle !== selectedStyle) {
        changeMapStyle(newStyle);
      }
    }
  }, [resolvedTheme, isTokenSet, selectedStyle, userManuallySelected, changeMapStyle]);

  // Update data when trailers change - only when the number of valid trailers changes significantly
  useEffect(() => {
    // Close any existing popup when data changes
    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }
    
    if (map.current && map.current.isStyleLoaded()) {
      // Only update the data source if it exists, don't recreate the entire map
      const source = map.current.getSource('trailers');
      if (source && 'setData' in source) {
        // Use the current data from the ref - this updates only the markers, not the map
        (source as any).setData(dataSourceRef.current);
      } else {
        // If source doesn't exist, add the data (first time)
        addTrailerData();
      }
    }
  }, [validTrailers.length]); // Only depend on the count, not the entire data

  useEffect(() => {
    if (isTokenSet && !map.current) {
  
      initializeMap();
    }
    
    return () => {
      if (map.current) {
        try {
          // Remove all event listeners first
          if (eventHandlers.current.load) {
            map.current.off('load', eventHandlers.current.load);
          }
          
          // Remove layer-specific event listeners using stored handlers
          if (map.current.getLayer('trailers')) {
            if (eventHandlers.current.click) {
              map.current.off('click', 'trailers', eventHandlers.current.click);
            }
          }
          
          // Remove general click listener using stored handler
          if (eventHandlers.current.mapClick) {
            map.current.off('click', eventHandlers.current.mapClick);
          }
          
          // Clear any existing popup
          if (currentPopup.current) {
            currentPopup.current.remove();
            currentPopup.current = null;
          }
          
          // Clear event handler references
          eventHandlers.current = {};
          
          // Remove the map
          map.current.remove();
        } catch (error) {
          console.error('Error cleaning up map:', error);
        } finally {
          // Ensure map reference is cleared
          map.current = null;
        }
      }
    };
  }, [isTokenSet, mapboxToken, initializeMap]);

  if (!isTokenSet) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border">
        <div className="text-center space-y-4 p-8">
          <h3 className="text-lg font-semibold">Mapbox Token Required</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            To display the map, please enter your Mapbox public token.
          </p>
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwi..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get one from{' '}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <Button onClick={handleTokenSubmit} className="w-full">
              Initialize Map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map Style Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">Map Style</Label>
            {userManuallySelected && (
              <button
                onClick={() => {
                  setUserManuallySelected(false);
                  const autoStyle = resolvedTheme === 'dark' ? 'dark' : 'light';
                  changeMapStyle(autoStyle, false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Reset to auto theme"
              >
                Auto
              </button>
            )}
          </div>
          <Select value={selectedStyle} onValueChange={(value) => changeMapStyle(value, true)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="streets">Streets</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="satellite-streets">Satellite Streets</SelectItem>
              <SelectItem value="navigation-day">Navigation Day</SelectItem>
              <SelectItem value="navigation-night">Navigation Night</SelectItem>
              <SelectItem value="outdoors">Outdoors</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <style>{`
        .custom-trailer-popup {
          animation: popupFadeIn 0.2s ease-out;
          z-index: 1000;
        }
        
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-3px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
      `}</style>
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-lg" 
      />
    </div>
  );
};

export default Map;