import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getAllRiderLocations } from '../utils/api';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Declare global google variable
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function LocationTracking() {
  const { accessToken } = useAuth();
  const [riderLocations, setRiderLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Load Google Maps script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = () => {
      setMapLoaded(true);
    };
    
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 23.8103, lng: 90.4125 }, // Default center (Dhaka, Bangladesh)
        zoom: 12,
      });
      mapInstance.current = map;
    }
  }, [mapLoaded]);

  // Load rider locations
  const loadRiderLocations = async () => {
    if (!accessToken) return;
    try {
      const data = await getAllRiderLocations(accessToken);
      setRiderLocations(data.locations || []);
      updateMarkers(data.locations || []);
    } catch (error) {
      console.error('Error loading rider locations:', error);
      toast.error('Failed to load rider locations');
    } finally {
      setLoading(false);
    }
  };

  // Update map markers
  const updateMarkers = (locations: any[]) => {
    if (!mapInstance.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    const bounds = new window.google.maps.LatLngBounds();
    
    locations.forEach(rider => {
      if (rider.location && rider.location.latitude && rider.location.longitude) {
        const position = {
          lat: parseFloat(rider.location.latitude),
          lng: parseFloat(rider.location.longitude)
        };

        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: rider.riderName,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: rider.status === 'busy' ? '#ef4444' : '#22c55e',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${rider.riderName}</h3>
              <p style="font-size: 14px; color: #666;">Status: ${rider.status}</p>
              <p style="font-size: 12px; color: #999;">Last updated: ${new Date(rider.location.timestamp).toLocaleTimeString()}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      }
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      mapInstance.current.fitBounds(bounds);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadRiderLocations();
    const interval = setInterval(loadRiderLocations, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2>Rider Location Tracking</h2>
        <p className="text-gray-600 mt-1">View live locations of all riders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              className="w-full h-[500px] rounded-lg"
              style={{ minHeight: '500px' }}
            />
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Busy</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rider List */}
        <Card>
          <CardHeader>
            <CardTitle>Riders ({riderLocations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {riderLocations.map(rider => (
                <div 
                  key={rider.riderId}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (rider.location && mapInstance.current) {
                      const position = {
                        lat: parseFloat(rider.location.latitude),
                        lng: parseFloat(rider.location.longitude)
                      };
                      mapInstance.current.setCenter(position);
                      mapInstance.current.setZoom(15);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-blue-600" />
                      <span className="font-medium">{rider.riderName}</span>
                    </div>
                    <span 
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        rider.status === 'busy' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {rider.status}
                    </span>
                  </div>
                  
                  {rider.location ? (
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Navigation className="size-3" />
                        <span>
                          {rider.location.latitude.toFixed(6)}, {rider.location.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{formatTimestamp(rider.location.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Location not available</p>
                  )}
                </div>
              ))}
              
              {riderLocations.length === 0 && (
                <p className="text-center text-gray-500 py-8">No riders available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Note:</h4>
        <p className="text-sm text-blue-800">
          • Rider locations are updated automatically every 30 seconds
          <br />
          • Click on a rider in the list to center the map on their location
          <br />
          • Click on map markers to see more details
          <br />
          • Replace YOUR_GOOGLE_MAPS_API_KEY in the code with your actual Google Maps API key
        </p>
      </div>
    </div>
  );
}
