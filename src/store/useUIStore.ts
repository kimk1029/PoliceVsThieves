import { create } from 'zustand';

interface UIStore {
  isQRModalVisible: boolean;
  isQRScannerVisible: boolean;
  isPermissionModalVisible: boolean;
  proximityAlert: { visible: boolean; message: string } | null;
  isLoading: boolean;
  loadingMessage: string | null;

  showQRModal: () => void;
  hideQRModal: () => void;
  showQRScanner: () => void;
  hideQRScanner: () => void;
  showPermissionModal: () => void;
  hidePermissionModal: () => void;
  showProximityAlert: (message: string) => void;
  hideProximityAlert: () => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isQRModalVisible: false,
  isQRScannerVisible: false,
  isPermissionModalVisible: false,
  proximityAlert: null,
  isLoading: false,
  loadingMessage: null,

  showQRModal: () => set({ isQRModalVisible: true }),
  hideQRModal: () => set({ isQRModalVisible: false }),
  showQRScanner: () => set({ isQRScannerVisible: true }),
  hideQRScanner: () => set({ isQRScannerVisible: false }),
  showPermissionModal: () => set({ isPermissionModalVisible: true }),
  hidePermissionModal: () => set({ isPermissionModalVisible: false }),
  showProximityAlert: (message) =>
    set({ proximityAlert: { visible: true, message } }),
  hideProximityAlert: () => set({ proximityAlert: null }),
  setLoading: (loading, message) =>
    set({ isLoading: loading, loadingMessage: message || null })
}));
