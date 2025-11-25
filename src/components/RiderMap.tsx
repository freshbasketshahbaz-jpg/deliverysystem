import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { updateRiderLocation } from '../utils/api';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Declare global google variable
declare global {
  interface Window {
    google: any;
    initRiderMap: () => void;
  }
}

interface RiderMapProps {
  orders: any[];
}

export function RiderMap({ orders }: RiderMapProps) {
  const { accessToken, user } = useAuth();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load Google Maps script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initRiderMap`;
    script.async = true;
    script.defer = true;
    
    window.initRiderMap = () => {
      setMapLoaded(true);
    };
    
    // Check if script already exists
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 23.8103, lng: 90.4125 }, // Default center (Dhaka, Bangladesh)
        zoom: 13,
      });
      mapInstance.current = map;
    }
  }, [mapLoaded]);

  // Track rider location
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentPosition(newPos);

        // Update location in database
        if (accessToken && user?.id) {
          try {
            await updateRiderLocation(accessToken, user.id, newPos.lat, newPos.lng);
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }

        // Update current location marker
        if (mapInstance.current && window.google) {
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setPosition(newPos);
          } else {
            currentLocationMarkerRef.current = new window.google.maps.Marker({
              position: newPos,
              map: mapInstance.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 3,
              },
              title: 'Your Location'
            });

            // Center map on current location initially
            mapInstance.current.setCenter(newPos);
          }
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get your location');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [accessToken, user]);

  // Update order markers
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Filter orders that need delivery
    const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered');

    // Add markers for each order
    activeOrders.forEach((order, index) => {
      // Try to geocode the address
      // For now, we'll just show placeholder text. In a real app, you'd geocode addresses
      // or store coordinates with orders
      
      // Create info window content
      const infoContent = `
        <div style="padding: 8px; max-width: 250px;">
          <h3 style="font-weight: 600; margin-bottom: 4px;">${order.customerName}</h3>
          <p style="font-size: 14px; color: #666; margin-bottom: 4px;">${order.address || 'No address'}</p>
          <p style="font-size: 14px; color: #666; margin-bottom: 4px;">Amount: $${order.amount}</p>
          <p style="font-size: 12px; color: #999;">Status: ${order.deliveryStatus}</p>
        </div>
      `;

      // In a real application, you would geocode the address here
      // For demonstration, we'll place markers in a circular pattern around current position
      if (currentPosition) {
        const angle = (index / activeOrders.length) * 2 * Math.PI;
        const radius = 0.02; // roughly 2km
        const lat = currentPosition.lat + radius * Math.cos(angle);
        const lng = currentPosition.lng + radius * Math.sin(angle);

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: order.deliveryStatus === 'pending' ? '#ef4444' : '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: order.customerName,
          label: {
            text: (index + 1).toString(),
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });

        markersRef.current.push(marker);
      }
    });
  }, [orders, currentPosition, mapLoaded]);

  const centerOnCurrentLocation = () => {
    if (currentPosition && mapInstance.current) {
      mapInstance.current.setCenter(currentPosition);
      mapInstance.current.setZoom(15);
    } else {
      toast.error('Current location not available');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Delivery Map</CardTitle>
          <Button size="sm" variant="outline" onClick={centerOnCurrentLocation}>
            <Navigation className="size-4 mr-2" />
            My Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-lg"
          style={{ minHeight: '400px' }}
        />
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Pending Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>In Progress</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Note:</strong> Your location is being tracked automatically and updated in real-time. 
          In a production app, addresses would be geocoded to show exact delivery locations.
        </div>
      </CardContent>
    </Card>
  );
}
