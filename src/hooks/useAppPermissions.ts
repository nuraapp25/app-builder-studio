import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  photos: 'granted' | 'denied' | 'prompt';
}

export function useAppPermissions() {
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    location: 'prompt',
    camera: 'prompt',
    photos: 'prompt',
  });

  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not a native platform, skipping permission requests');
        setPermissionsRequested(true);
        return;
      }

      console.log('Requesting app permissions on native platform...');

      try {
        // Request Location Permission
        console.log('Requesting location permission...');
        const locationStatus = await Geolocation.requestPermissions();
        console.log('Location permission status:', locationStatus);

        // Request Camera Permission
        console.log('Requesting camera permission...');
        const cameraStatus = await Camera.requestPermissions({
          permissions: ['camera', 'photos'],
        });
        console.log('Camera permission status:', cameraStatus);

        setPermissionStatus({
          location: locationStatus.location as 'granted' | 'denied' | 'prompt',
          camera: cameraStatus.camera as 'granted' | 'denied' | 'prompt',
          photos: cameraStatus.photos as 'granted' | 'denied' | 'prompt',
        });

        console.log('All permissions requested successfully');
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }

      setPermissionsRequested(true);
    };

    requestAllPermissions();
  }, []);

  return { permissionsRequested, permissionStatus };
}
