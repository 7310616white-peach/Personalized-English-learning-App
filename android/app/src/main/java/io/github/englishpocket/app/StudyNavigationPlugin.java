package io.github.englishpocket.app;

import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Uses AndroidX Back on both screen edges, including modern predictive-back dispatch. */
@CapacitorPlugin(name = "StudyNavigation")
public class StudyNavigationPlugin extends Plugin {
    private OnBackPressedCallback callback;

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            callback = new OnBackPressedCallback(false) {
                @Override public void handleOnBackPressed() {
                    notifyListeners("backPressed", new JSObject());
                }
            };
            getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), callback);
        });
    }

    @PluginMethod
    public void setBackEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            if (callback != null) callback.setEnabled(enabled);
            call.resolve();
        });
    }
}
