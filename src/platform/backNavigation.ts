import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { BackActions } from '../domain/backActions';

interface NavigationPlugin {
  setBackEnabled(value: { enabled: boolean }): Promise<void>;
  addListener(event: 'backPressed', callback: () => void): Promise<PluginListenerHandle>;
}
const navigation = registerPlugin<NavigationPlugin>('StudyNavigation');
export const backActions = new BackActions();
export async function startBackNavigation(onError: () => void) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = await navigation.addListener('backPressed', () => {
    void backActions.run().catch(onError);
  });
  const unobserve = backActions.observe((enabled) => {
    void navigation.setBackEnabled({ enabled }).catch(onError);
  });
  return () => {
    unobserve();
    void handle.remove();
    void navigation.setBackEnabled({ enabled: false });
  };
}
